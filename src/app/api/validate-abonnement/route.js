// app/api/subscriptions/use/route.js
import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
// Firestore: northamerica-northeast1 (Montréal) → Vercel's closest region is Cleveland
export const preferredRegion = ["cle1"];
export const dynamic = "force-dynamic";

// ---------- Firebase Admin init (once) ----------
const rawCreds = process.env.FIREBASE_CREDENTIALS;
if (!rawCreds) throw new Error("FIREBASE_CREDENTIALS env var missing");
const sa = JSON.parse(rawCreds);
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}

// ---------- Tiny caches ----------
const TOKEN_CACHE = new Map(); // token -> { decoded, expMs }
const TOKEN_EXP_MARGIN_MS = 60_000; // refresh a bit before expiry

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
  if (expMs > Date.now()) TOKEN_CACHE.set(token, { decoded, expMs });
}

const EMP_CACHE = new Map(); // uid -> expiresAt
const EMP_TTL_MS = 60_000;
const hasEmployeeCache = (uid) => (EMP_CACHE.get(uid) || 0) > Date.now();
const markEmployee = (uid) => EMP_CACHE.set(uid, Date.now() + EMP_TTL_MS);

// ---------- Helpers ----------
const json = (body, status = 200) => NextResponse.json(body, { status });
const badReq = (m) => json({ error: m }, 422);

export async function POST(request) {
  try {
    // --- Auth header ---
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Erreur d'authentification" }, 401);
    }
    const token = authHeader.split(" ")[1];

    // --- Decode token (with cache) ---
    let decoded = getCachedDecoded(token);
    if (!decoded) {
      try {
        decoded = await getAuth().verifyIdToken(token); // fast path (no revocation check)
      } catch {
        return json({ error: "Token invalide" }, 401);
      }
      putTokenCache(token, decoded);
    }

    // --- Parse body ---
    let body;
    try {
      body = await request.json();
    } catch {
      return badReq("Corps JSON invalide");
    }
    const { matchId, subscriptionId } = body || {};
    if (
      typeof matchId !== "string" ||
      !matchId ||
      typeof subscriptionId !== "string" ||
      !subscriptionId
    ) {
      return badReq("Qr code invalide");
    }

    const db = getFirestore();

    // --- Role check (cached) ---
    if (!hasEmployeeCache(decoded.uid)) {
      const uSnap = await db.collection("users").doc(decoded.uid).get();
      if (!uSnap.exists || uSnap.data()?.type !== "employee") {
        return json({ error: "Erreur d'authentification" }, 403);
      }
      markEmployee(decoded.uid);
    }

    const subRef = db.collection("subscriptions").doc(subscriptionId);
    const matchRef = db.collection("matchs").doc(matchId);

    // --- Atomic transaction on BOTH docs (keeps your exact logic) ---
    await db.runTransaction(async (tx) => {
      const [subSnap, matchSnap] = await tx.getAll(subRef, matchRef);

      if (!subSnap.exists) {
        const err = new Error("SUB_NOT_FOUND");
        err.status = 404;
        throw err;
      }
      if (!matchSnap.exists) {
        const err = new Error("MATCH_NOT_FOUND");
        err.status = 404;
        throw err;
      }

      const subscription = subSnap.data() || {};
      //const match = matchSnap.data() || {};

      const usedList = Array.isArray(subscription.matchs)
        ? subscription.matchs
        : [];

      // Already used for this match?
      const already = usedList.some((m) => m && m.matchId === matchId);
      if (already) {
        const err = new Error("ALREADY_USED");
        err.status = 409;
        throw err;
      }

      // Append to array with server timestamp
      const updatedList = [
        ...usedList,
        {
          matchId,
          usedBy: decoded.uid,
          usedAt: FieldValue.serverTimestamp(),
        },
      ];

      tx.update(subRef, { matchs: updatedList });

      // Your logic: increment subsUsed on the match in-API
      // tx.update(matchRef, {
      //   subsUsed: FieldValue.increment(1),
      // });

      // (Optional) If you want to assert match date==today, do it here using match.date
      // const d = match?.date?.toDate ? match.date.toDate() : new Date(match?.date);
      // ... compare to today's date and throw if not today
    });

    return json({ success: true }, 200);
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg === "SUB_NOT_FOUND")
      return json({ error: "Abonnement non trouvé" }, 404);
    if (msg === "MATCH_NOT_FOUND")
      return json({ error: "Match non trouvé" }, 404);
    if (msg === "ALREADY_USED")
      return json({ error: "Abonnement déjà utilisé pour ce match" }, 409);

    if (typeof e?.status === "number") {
      return json({ error: "Erreur" }, e.status);
    }
    console.error("API /subscriptions/use error:", e);
    return json({ error: "Erreur serveur" }, 500);
  }
}
