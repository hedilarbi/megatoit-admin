import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import {
  buildReplyDraft,
  defaultAccountId,
  getIndex,
  getThread,
} from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { threadId } = await params;
    const account =
      new URL(request.url).searchParams.get("account") || defaultAccountId();

    const thread = await getThread(account, threadId);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Discussion introuvable." },
        { status: 404 }
      );
    }

    // L'index a pu être reconstruit entre-temps : le brouillon est optionnel.
    let draft = null;
    try {
      const index = await getIndex(account);
      const indexed = index.byId.get(threadId);
      if (indexed) draft = buildReplyDraft(account, indexed);
    } catch (error) {
      console.error("Brouillon de réponse indisponible:", error?.message || error);
    }

    return NextResponse.json({ success: true, thread, draft });
  } catch (error) {
    console.error("Lecture de la discussion impossible:", error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) || "Erreur interne." },
      { status: 500 }
    );
  }
}
