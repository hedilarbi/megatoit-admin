import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/apiAuth";

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

// ✅ initialize only if no apps exist
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function DELETE(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { uid } = await req.json();

  try {
    await getAuth().deleteUser(uid);

    const db = getFirestore();
    await db.collection("users").doc(uid).delete();

    return NextResponse.json({ success: true, uid });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
