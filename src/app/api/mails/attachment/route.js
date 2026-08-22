import { requireAdmin } from "@/lib/apiAuth";
import { defaultAccountId, getAttachment } from "@/lib/mail";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder");
    const uid = Number(searchParams.get("uid"));
    const index = Number(searchParams.get("index"));
  const part = searchParams.get("part") || null;
  const account = searchParams.get("account") || defaultAccountId();

    if (!folder || !uid || Number.isNaN(index)) {
      return NextResponse.json(
        { success: false, error: "Paramètres invalides." },
        { status: 400 }
      );
    }

    const attachment = await getAttachment(account, { folder, uid, index, part });
    if (!attachment) {
      return NextResponse.json(
        { success: false, error: "Pièce jointe introuvable." },
        { status: 404 }
      );
    }

    // RFC 5987 : nom ASCII de repli + nom réel encodé, sinon les accents et
    // les espaces ressortent en %20 dans le nom du fichier téléchargé.
    const fallback = attachment.filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
    return new NextResponse(attachment.content, {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition":
          `attachment; filename="${fallback}"; ` +
          `filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
        "Content-Length": String(attachment.content.length),
      },
    });
  } catch (error) {
    console.error("Téléchargement de la pièce jointe impossible:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) || "Erreur interne." }, { status: 500 });
  }
}
