import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/apiAuth";

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { email, password, name } = await req.json();

  try {
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    const db = getFirestore();

    await db.collection("users").doc(userRecord.uid).set({
      email,
      userName: name,
      type: "employee",
      status: "actif",
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
