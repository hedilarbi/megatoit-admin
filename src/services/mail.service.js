import { auth } from "@/lib/firebase";

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Session expirée, reconnectez-vous.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request(url, options = {}) {
  const headers = { ...(await authHeaders()), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers, cache: "no-store" });

  const raw = await response.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    // Réponse non JSON (404 HTML, erreur de compilation, proxy…) : on remonte
    // le statut et un extrait du corps, sinon l'erreur est impossible à diagnostiquer.
    throw new Error(
      `Réponse inattendue du serveur (HTTP ${response.status}) sur ${url}. ` +
        `Vérifiez que le serveur de développement est bien relancé. ` +
        `Détail : ${raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "(vide)"}`
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Échec de la requête (HTTP ${response.status}).`);
  }
  return data;
}

export function getThreads({
  account,
  filter = "all",
  search = "",
  page = 1,
  pageSize = 20,
  refresh = false,
} = {}) {
  const params = new URLSearchParams({
    filter,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (account) params.set("account", account);
  if (search) params.set("search", search);
  if (refresh) params.set("refresh", "1");
  return request(`/api/mails/threads?${params.toString()}`);
}

export function getThread(threadId, account) {
  const suffix = account ? `?account=${encodeURIComponent(account)}` : "";
  return request(`/api/mails/threads/${threadId}${suffix}`);
}

export function markThreadRead(threadId, seen = true, account) {
  return request(`/api/mails/threads/${threadId}/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seen, account }),
  });
}

export function replyToThread(payload, files = []) {
  if (!files.length) {
    return request("/api/mails/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  // Avec des pièces jointes : multipart. On ne fixe pas Content-Type,
  // le navigateur doit y placer la frontière ("boundary") lui-même.
  const form = new FormData();
  form.append("payload", JSON.stringify(payload));
  for (const file of files) form.append("files", file, file.name);

  return request("/api/mails/reply", { method: "POST", body: form });
}

export async function downloadAttachment({
  folder,
  uid,
  index,
  part,
  filename,
  account,
}) {
  const params = new URLSearchParams({
    folder,
    uid: String(uid),
    index: String(index),
  });
  if (account) params.set("account", account);
  // Permet au serveur de ne rapatrier que cette partie du message.
  if (part) params.set("part", part);
  const response = await fetch(`/api/mails/attachment?${params.toString()}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error("Téléchargement impossible.");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "piece-jointe";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
