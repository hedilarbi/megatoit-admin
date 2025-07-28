import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id, // Add this line
  });
}

export async function POST(request) {
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Erreur d'authentification" },
        { status: 400 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Verify the token using Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(token);
    const db = getFirestore();
    const usersRef = db.collection("users");
    const userDoc = await usersRef.doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Erreur d'authentification" },
        { status: 404 }
      );
    }

    const user = userDoc.data();

    if (user.type !== "employee") {
      return NextResponse.json(
        { error: "Erreur d'authentification" },
        { status: 403 }
      );
    }
    const body = await request.json();

    const qrCode = body;

    if (!qrCode) {
      return NextResponse.json({ error: "QR code manquant" }, { status: 400 });
    }
    const ticketSnapshot = await db.collection("tickets").doc(qrCode).get();
    const ticket = ticketSnapshot.data();
    if (!ticket) {
      return NextResponse.json({ error: "Billet non trouvé" }, { status: 404 });
    }

    if (ticket.used) {
      return NextResponse.json(
        { error: "Ticket déjà utilisé" },
        { status: 400 }
      );
    }

    const matchsRef = db.collection("matchs");
    const matchDoc = await matchsRef.doc(ticket.matchId).get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match non trouvé" }, { status: 404 });
    }

    const match = matchDoc.data();

    const matchDate = match.date.toDate
      ? match.date.toDate()
      : new Date(match.date);

    const today = new Date();
    if (
      matchDate.getFullYear() !== today.getFullYear() ||
      matchDate.getMonth() !== today.getMonth() ||
      matchDate.getDate() !== today.getDate()
    ) {
      return NextResponse.json(
        { error: "Le match n'a pas lieu aujourd'hui" },
        { status: 400 }
      );
    }

    await db.collection("tickets").doc(qrCode).update({
      used: true,
      usedBy: decodedToken.uid,
      usedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Token verification failed:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 401 }
    );
  }
}
