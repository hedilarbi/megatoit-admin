import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { defaultAccountId, setThreadSeen } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { threadId } = await params;
    const { seen = true, account } = await request.json().catch(() => ({}));

    const done = await setThreadSeen(account || defaultAccountId(), threadId, Boolean(seen));
    if (!done) {
      return NextResponse.json(
        { success: false, error: "Discussion introuvable." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mise à jour du statut de lecture impossible:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) || "Erreur interne." }, { status: 500 });
  }
}
