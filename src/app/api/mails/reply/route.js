import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { MAX_ATTACHMENT_BYTES, defaultAccountId, sendReply } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deux formats acceptés :
 *  - application/json          : réponse sans pièce jointe
 *  - multipart/form-data       : champ "payload" (JSON) + champs "files"
 */
async function readBody(request) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return { body: await request.json(), attachments: [] };
  }

  const form = await request.formData();
  const raw = form.get("payload");
  const body = raw ? JSON.parse(String(raw)) : {};

  const files = form
    .getAll("files")
    .filter((entry) => entry && typeof entry === "object" && "arrayBuffer" in entry);

  const total = files.reduce((sum, file) => sum + (file.size || 0), 0);
  if (total > MAX_ATTACHMENT_BYTES) {
    const error = new Error(
      `Pièces jointes trop volumineuses (${(total / 1024 / 1024).toFixed(1)} Mo, ` +
        `maximum ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} Mo).`
    );
    error.status = 413;
    throw error;
  }

  const attachments = await Promise.all(
    files.map(async (file) => ({
      filename: file.name || "piece-jointe",
      contentType: file.type || "application/octet-stream",
      content: Buffer.from(await file.arrayBuffer()),
    }))
  );

  return { body, attachments };
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { body, attachments } = await readBody(request);
    const result = await sendReply(body.account || defaultAccountId(), {
      threadId: body.threadId,
      to: body.to,
      cc: body.cc,
      subject: body.subject,
      text: body.text,
      inReplyTo: body.inReplyTo,
      references: body.references,
      attachments,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Envoi de la réponse impossible:", error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) || "Erreur interne." },
      { status: error?.status || 500 }
    );
  }
}
