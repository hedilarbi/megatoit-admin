// app/api/tickets/use/route.ts
import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1"]; // change if your Firestore is elsewhere

// --- Admin init (once) ---
const rawCreds = process.env.FIREBASE_CREDENTIALS;
if (!rawCreds) throw new Error("FIREBASE_CREDENTIALS env var missing");
const sa = JSON.parse(rawCreds);
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}

// --- Tiny caches for role + token checks (helps during bursts on warm instance) ---
const TOKEN_CACHE = new Map(); // token -> { decoded, expMs }
const TOKEN_EXP_MARGIN_MS = 60_000;
const TOKEN_CACHE_MAX = 50; // max entries — prevents memory leak on long sessions

function evictExpiredTokens() {
  const now = Date.now();
  for (const [key, val] of TOKEN_CACHE.entries()) {
    if (val.expMs - TOKEN_EXP_MARGIN_MS <= now) TOKEN_CACHE.delete(key);
  }
}
function getCachedDecoded(token) {
  const hit = TOKEN_CACHE.get(token);
  if (!hit) return null;
  if (hit.expMs - TOKEN_EXP_MARGIN_MS <= Date.now()) {
    TOKEN_CACHE.delete(token);
    return null;
  }
  return hit.decoded;
}
function putTokenCache(token, decoded) {
  const expSec = decoded?.exp || 0;
  const expMs = expSec * 1000;
  if (expMs > Date.now()) {
    if (TOKEN_CACHE.size >= TOKEN_CACHE_MAX) evictExpiredTokens();
    if (TOKEN_CACHE.size >= TOKEN_CACHE_MAX) {
      TOKEN_CACHE.delete(TOKEN_CACHE.keys().next().value);
    }
    TOKEN_CACHE.set(token, { decoded, expMs });
  }
}

const EMP_CACHE = new Map(); // uid -> expiresAt
const EMP_TTL_MS = 60_000;
const hasEmployeeCache = (uid) => (EMP_CACHE.get(uid) ?? 0) > Date.now();
const markEmployee = (uid) => EMP_CACHE.set(uid, Date.now() + EMP_TTL_MS);

export async function POST(request) {
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Erreur d'authentification" },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];

    // Decode token with cache (avoids a verifyIdToken round-trip on every scan)
    let decoded = getCachedDecoded(token);
    if (!decoded) {
      try {
        decoded = await getAuth().verifyIdToken(token);
      } catch {
        return NextResponse.json(
          { error: "Erreur d'authentification" },
          { status: 401 }
        );
      }
      putTokenCache(token, decoded);
    }
    const db = getFirestore();

    // Short-lived cached role check to avoid a read every time
    if (!hasEmployeeCache(decoded.uid)) {
      const userSnap = await db.collection("users").doc(decoded.uid).get();
      if (!userSnap.exists || userSnap.data()?.type !== "employee") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
      markEmployee(decoded.uid);
    }

    const { matchId, ticketId } = await request.json();
    if (!matchId || !ticketId) {
      return NextResponse.json({ error: "QR code invalide" }, { status: 422 });
    }

    const ticketRef = db.collection("tickets").doc(ticketId);

    // Fast path: only validate & mark the ticket used (single doc)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ticketRef);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const ticket = snap.data();

      if (ticket.matchId !== matchId) throw new Error("WRONG_MATCH");
      if (ticket.isUsed) throw new Error("ALREADY_USED");

      tx.update(ticketRef, {
        isUsed: true,
        usedBy: decoded.uid,
        usedAt: FieldValue.serverTimestamp(),
      });
    });

    // Counter increment happens in a Firestore trigger (async)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg === "NOT_FOUND")
      return NextResponse.json({ error: "Billet non trouvé" }, { status: 404 });
    if (msg === "WRONG_MATCH")
      return NextResponse.json(
        { error: "Le billet ne correspond pas à ce match" },
        { status: 400 }
      );
    if (msg === "ALREADY_USED")
      return NextResponse.json(
        { error: "Billet déjà utilisé" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
