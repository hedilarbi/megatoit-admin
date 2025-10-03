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

// --- tiny cache for role checks (helps during bursts on warm instance) ---
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

    // Keep revocation check off for speed (default).
    const decoded = await getAuth().verifyIdToken(token);
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
