import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import {
  MAX_ATTACHMENT_BYTES,
  getIndex,
  getPreviews,
  invalidateIndex,
  listAccounts,
  defaultAccountId,
} from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const matches = (thread, term) => {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = [
    thread.subject,
    ...thread.participants.map((p) => `${p.name} ${p.address}`),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
};

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const account = searchParams.get("account") || defaultAccountId();
    const filter = searchParams.get("filter") || "all";
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || 20)));

    if (searchParams.get("refresh") === "1") invalidateIndex(account);
    const index = await getIndex(account);

    // "Toutes" = les discussions reçues. Une discussion composée uniquement de
    // messages envoyés (mail parti sans réponse) n'apparaît que sous "Envoyées".
    let threads = index.threads;
    if (filter === "unread") threads = threads.filter((t) => t.unread);
    else if (filter === "sent") threads = threads.filter((t) => t.hasSent);
    else threads = threads.filter((t) => t.hasInbox);
    if (search) threads = threads.filter((t) => matches(t, search));

    const total = threads.length;
    const slice = threads.slice((page - 1) * pageSize, page * pageSize);
    const previews = await getPreviews(account, slice.map((t) => t.lastMessage));

    return NextResponse.json({
      success: true,
      account,
      // Le sélecteur de boîte se construit à partir de cette liste.
      accounts: listAccounts().map(({ id, address, label, configured }) => ({
        id,
        address,
        label,
        configured,
      })),
      mailbox: listAccounts().find((item) => item.id === account)?.address || "",
      // L'interface s'aligne sur la limite du serveur plutôt que de la dupliquer.
      maxAttachmentBytes: MAX_ATTACHMENT_BYTES,
      total,
      page,
      pageSize,
      unreadCount: index.threads.filter((t) => t.hasInbox && t.unread).length,
      threads: slice.map((thread) => ({
        id: thread.id,
        subject: thread.subject,
        participants: thread.participants,
        count: thread.count,
        unread: thread.unread,
        flagged: thread.flagged,
        lastDate: thread.lastDate,
        lastFrom: thread.lastMessage.from[0] || null,
        lastIsOutgoing: thread.lastMessage.role === "sent",
        preview: previews[thread.lastMessage.key] || "",
      })),
    });
  } catch (error) {
    console.error("Lecture de la boîte mail impossible:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) || "Erreur interne." }, { status: 500 });
  }
}
