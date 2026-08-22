import { ImapFlow } from "imapflow";
import iconv from "iconv-lite";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

/**
 * Accès IMAP / SMTP aux boîtes mail de la billetterie (multi-comptes).
 *
 * Les comptes sont déclarés par leurs identifiants :
 *   MAIL_ACCOUNTS=info,billets        (def. "info,billets" ; le 1er est celui par défaut)
 *
 * Pour chaque identifiant ID, en majuscules dans le nom de la variable :
 *   MAIL_<ID>_LABEL       nom affiché dans le sélecteur (def. l'adresse)
 *   MAIL_<ID>_ADDRESS     adresse de la boîte (def. <id>@bsr3r.com)
 *   MAIL_<ID>_FROM_NAME   nom d'expéditeur
 *   MAIL_<ID>_IMAP_HOST / _IMAP_PORT / _IMAP_SECURE / _IMAP_USER / _IMAP_PASS
 *   MAIL_<ID>_SMTP_HOST / _SMTP_PORT / _SMTP_SECURE / _SMTP_USER / _SMTP_PASS
 *
 * Le premier compte hérite des anciennes variables sans préfixe (MAIL_IMAP_HOST,
 * MAIL_ADDRESS…) pour rester compatible avec la configuration existante.
 *
 * Réglages communs :
 *   MAIL_FETCH_LIMIT        messages récents lus par dossier (def. 400)
 *   MAIL_MAX_ATTACHMENT_MB  poids total des pièces jointes d'une réponse (def. 20)
 *   MAIL_FULL_FETCH_KB      au-delà, lecture sélective des parties MIME (def. 64)
 *   MAIL_IDLE_CLOSE_MIN     fermeture de la connexion IMAP inactive (def. 15)
 *   MAIL_BODY_CACHE_MB      mémoire max du cache des corps de messages (def. 64)
 */

const FETCH_LIMIT = Number(process.env.MAIL_FETCH_LIMIT || 400);
const INDEX_TTL_MS = 45_000;
const MAX_INLINE_BYTES = 2 * 1024 * 1024;

// Au-delà de cette taille, on ne télécharge plus le message entier : on lit sa
// structure MIME et on ne récupère que les parties affichées. Le débit IMAP
// observé est d'environ 150 Ko/s — une photo de 5 Mo bloquerait l'ouverture
// d'une discussion pendant une trentaine de secondes.
const MAX_FULL_SOURCE_BYTES =
  Math.max(32, Number(process.env.MAIL_FULL_FETCH_KB || 64)) * 1024;

// Poids total des pièces jointes d'une réponse. 20 Mo correspond à ce
// qu'acceptent la plupart des serveurs SMTP (l'encodage base64 gonfle le
// message d'environ un tiers). Attention : si un nginx est placé devant
// l'application, sa directive client_max_body_size (1 Mo par défaut) doit être
// relevée au moins d'autant, sinon il rejette la requête avant Next.
export const MAX_ATTACHMENT_BYTES =
  Math.max(1, Number(process.env.MAIL_MAX_ATTACHMENT_MB || 20)) * 1024 * 1024;

// Le processus vit longtemps (service systemd/pm2) : garder la connexion
// ouverte évite les 1,5 s de poignée de main à chaque action.
const IDLE_CLOSE_MS =
  Math.max(1, Number(process.env.MAIL_IDLE_CLOSE_MIN || 15)) * 60 * 1000;

const bool = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

/* ------------------------------------------------------------------ */
/* Comptes                                                             */
/* ------------------------------------------------------------------ */

// Nom affiché par défaut pour chaque boîte. Les variables MAIL_<ID>_FROM_NAME restent
// prioritaires ; ces valeurs évitent qu'un déploiement sans ces variables retombe sur un
// nom générique identique pour toutes les boîtes.
const DEFAULT_FROM_NAMES = {
  info: "INFO BSR",
  billets: "Billetterie BSR",
};

function accountIds() {
  return String(process.env.MAIL_ACCOUNTS || "info,billets")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildAccount(id, isPrimary) {
  // Le compte principal accepte aussi les variables historiques sans préfixe.
  const get = (name) =>
    process.env[`MAIL_${id.toUpperCase()}_${name}`] ||
    (isPrimary ? process.env[`MAIL_${name}`] : undefined);

  const address = get("ADDRESS") || `${id}@bsr3r.com`;
  const imapHost = get("IMAP_HOST") || process.env.SMTP_HOST;
  const imapUser = get("IMAP_USER") || address;
  const imapPass = get("IMAP_PASS");
  const smtpPort = Number(get("SMTP_PORT") || 465);

  return {
    id,
    address,
    label: get("LABEL") || address,
    fromName: get("FROM_NAME") || DEFAULT_FROM_NAMES[id] || "BSR DE TROIS-RIVIÈRES",
    configured: Boolean(imapHost && imapPass),
    imap: {
      host: imapHost,
      port: Number(get("IMAP_PORT") || 993),
      secure: bool(get("IMAP_SECURE"), true),
      user: imapUser,
      pass: imapPass,
    },
    smtp: {
      host: get("SMTP_HOST") || imapHost,
      port: smtpPort,
      secure: bool(get("SMTP_SECURE"), smtpPort === 465),
      user: get("SMTP_USER") || imapUser,
      pass: get("SMTP_PASS") || imapPass,
    },
  };
}

/** Comptes déclarés, dans l'ordre ; le premier est celui par défaut. */
export function listAccounts() {
  return accountIds().map((id, position) => buildAccount(id, position === 0));
}

/** Compte utilisable par défaut : le premier correctement configuré. */
export function defaultAccountId() {
  const accounts = listAccounts();
  return (accounts.find((account) => account.configured) || accounts[0])?.id;
}

function resolveAccount(accountId) {
  const accounts = listAccounts();
  const account = accountId
    ? accounts.find((item) => item.id === accountId)
    : accounts.find((item) => item.configured) || accounts[0];

  if (!account) {
    throw new Error(
      accountId
        ? `Boîte mail inconnue : "${accountId}".`
        : "Aucune boîte mail configurée."
    );
  }
  if (!account.configured) {
    throw new Error(
      `Boîte "${account.label}" non configurée ` +
        `(MAIL_${account.id.toUpperCase()}_IMAP_HOST / _IMAP_PASS manquants).`
    );
  }
  return account;
}

/* ------------------------------------------------------------------ */
/* État par compte (connexion, dossiers, caches)                       */
/* ------------------------------------------------------------------ */

// Chaque boîte a sa propre connexion, sa propre file d'attente et ses propres
// caches : basculer de boîte ne doit rien mélanger.
const states = new Map();

function stateFor(accountId) {
  let state = states.get(accountId);
  if (!state) {
    state = {
      queue: Promise.resolve(),
      client: null,
      idleTimer: null,
      folders: null,
      index: { at: 0, threads: null, byId: null, pending: null },
      previews: new Map(),
      bodies: new Map(),
      bodyBytes: 0,
    };
    states.set(accountId, state);
  }
  return state;
}

/* ------------------------------------------------------------------ */
/* Connexion                                                           */
/* ------------------------------------------------------------------ */

async function connect(account) {
  const client = new ImapFlow({
    host: account.imap.host,
    port: account.imap.port,
    secure: account.imap.secure,
    auth: { user: account.imap.user, pass: account.imap.pass },
    logger: false,
    emitLogs: false,
  });

  // Sans écouteur "error", une coupure de socket devient une exception non
  // capturée : la requête Next tombe alors en 500 opaque ("Internal Server Error").
  client.on("error", (error) => {
    console.error(
      `Erreur de connexion IMAP (${account.address}):`,
      error?.message || error
    );
  });

  await client.connect();
  return client;
}

async function disconnect(client) {
  try {
    await client.logout();
  } catch {
    try {
      client.close();
    } catch {
      /* ignore */
    }
  }
}

function scheduleIdleClose(account) {
  const state = stateFor(account.id);
  clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    const client = state.client;
    state.client = null;
    if (client) disconnect(client);
  }, IDLE_CLOSE_MS);
  // Ne doit pas maintenir le processus en vie à lui seul.
  state.idleTimer.unref?.();
}

async function acquireClient(account) {
  const state = stateFor(account.id);
  if (state.client?.usable) return state.client;

  state.client = null;
  const client = await connect(account);
  client.on("close", () => {
    if (state.client === client) state.client = null;
  });
  state.client = client;
  return client;
}

// Ouvrir une connexion coûte ~1,5 s (TCP + TLS + LOGIN) : c'est l'essentiel du
// temps de chargement. On garde donc une connexion ouverte par boîte et on la
// réutilise. Les accès d'une même boîte restent sérialisés, le serveur limitant
// les connexions simultanées.
function withClient(account, task) {
  const state = stateFor(account.id);

  const run = state.queue.then(async () => {
    let client = await acquireClient(account);
    try {
      return await task(client);
    } catch (error) {
      // Le serveur ferme les connexions inactives : si celle-ci n'est plus
      // utilisable, on en rouvre une et on réessaie une seule fois.
      if (client.usable) throw error;
      state.client = null;
      client = await acquireClient(account);
      return task(client);
    } finally {
      scheduleIdleClose(account);
    }
  });

  state.queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

// Arrêt du service (systemd et pm2 envoient SIGTERM) : on referme proprement les
// sessions IMAP au lieu de laisser des connexions orphelines expirer côté serveur.
if (!globalThis.__mailShutdownHooked) {
  globalThis.__mailShutdownHooked = true;
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      closeConnection().finally(() => process.exit(0));
    });
  }
}

/** Ferme la ou les connexions partagées (tests, arrêt du processus). */
export async function closeConnection(accountId) {
  const ids = accountId ? [accountId] : [...states.keys()];
  await Promise.all(
    ids.map(async (id) => {
      const state = states.get(id);
      if (!state) return;
      clearTimeout(state.idleTimer);
      const client = state.client;
      state.client = null;
      if (client) await disconnect(client);
    })
  );
}

/* ------------------------------------------------------------------ */
/* Dossiers                                                            */
/* ------------------------------------------------------------------ */

async function resolveFolders(account, client) {
  const state = stateFor(account.id);
  if (state.folders) return state.folders;

  const list = await client.list();
  const bySpecialUse = (use) => list.find((box) => box.specialUse === use)?.path;
  const byName = (...names) =>
    list.find((box) =>
      names.includes(String(box.name || "").toLowerCase())
    )?.path;
  const byPath = (...paths) =>
    list.find((box) => paths.includes(String(box.path || "").toLowerCase()))?.path;

  state.folders = {
    inbox: "INBOX",
    sent:
      bySpecialUse("\\Sent") ||
      byPath("inbox.sent", "sent") ||
      byName("sent", "sent items", "sent messages", "envoyés", "éléments envoyés") ||
      null,
    trash: bySpecialUse("\\Trash") || byName("trash", "corbeille") || null,
  };
  return state.folders;
}

/**
 * Certains serveurs (n0c/cPanel ici) n'exposent que INBOX tant qu'aucun client
 * mail n'a créé les autres dossiers : on crée "Envoyés" à la première réponse,
 * sinon les messages envoyés ne seraient archivés nulle part.
 */
async function ensureSentFolder(account, client) {
  const folders = await resolveFolders(account, client);
  if (folders.sent) return folders.sent;

  const namespace = client.namespace?.personal?.[0] || client.namespace || {};
  const delimiter = namespace.delimiter || ".";
  const prefix = namespace.prefix || "";
  const path = delimiter === "." ? `${prefix}INBOX.Sent` : `${prefix}Sent`;

  try {
    await client.mailboxCreate(path);
  } catch (error) {
    // ALREADYEXISTS : le dossier existe mais n'était pas listé.
    if (!/alreadyexists|already exists/i.test(error.message || "")) {
      console.error("Création du dossier Envoyés impossible:", error.message);
      return null;
    }
  }

  try {
    await client.mailboxSubscribe(path);
  } catch {
    /* non bloquant */
  }

  folders.sent = path;
  return path;
}

/* ------------------------------------------------------------------ */
/* Lecture / indexation                                                */
/* ------------------------------------------------------------------ */

// Un Message-ID est sensible à la casse : la modifier casse le rattachement
// des réponses chez le destinataire (Gmail ouvrirait une nouvelle discussion).
const cleanId = (value) => {
  if (!value) return "";
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : String(value)).trim();
};

const extractIds = (value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(" ") : String(value);
  const matches = raw.match(/<[^>]+>/g);
  if (matches) return matches.map(cleanId).filter(Boolean);
  const single = cleanId(raw);
  return single ? [single] : [];
};

function parseRawHeaders(buffer) {
  if (!buffer) return {};
  const unfolded = buffer.toString("utf8").replace(/\r?\n[ \t]+/g, " ");
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    headers[name] = headers[name] ? `${headers[name]} ${value}` : value;
  }
  return headers;
}

const toISO = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const addresses = (value) =>
  (value || [])
    .filter((entry) => entry && (entry.address || entry.name))
    .map((entry) => ({
      name: entry.name || "",
      address: (entry.address || "").trim(),
    }));

const normalizeSubject = (subject) =>
  String(subject || "")
    .replace(/^((re|ré|rép|rep|fw|fwd|tr)\s*(\[\d+\])?\s*:\s*)+/i, "")
    .trim();

function normalizeMessage(message, folder, role) {
  const envelope = message.envelope || {};
  const headers = parseRawHeaders(message.headers);
  const messageId =
    cleanId(envelope.messageId || headers["message-id"]) ||
    `no-id:${folder}:${message.uid}`;

  const inReplyTo = [
    ...extractIds(envelope.inReplyTo),
    ...extractIds(headers["in-reply-to"]),
  ];
  const references = extractIds(headers.references);

  return {
    key: `${folder}:${message.uid}`,
    folder,
    role,
    uid: message.uid,
    messageId,
    inReplyTo,
    references,
    // Clés uniquement destinées au regroupement : insensibles à la casse.
    matchId: messageId.toLowerCase(),
    matchRefs: [...inReplyTo, ...references].map((id) => id.toLowerCase()),
    subject: envelope.subject || "(sans objet)",
    from: addresses(envelope.from),
    to: addresses(envelope.to),
    cc: addresses(envelope.cc),
    replyTo: addresses(envelope.replyTo),
    date: toISO(envelope.date || message.internalDate),
    size: message.size || 0,
    seen: message.flags ? message.flags.has("\\Seen") : true,
    answered: message.flags ? message.flags.has("\\Answered") : false,
    flagged: message.flags ? message.flags.has("\\Flagged") : false,
  };
}

async function fetchEnvelopes(client, folder, role) {
  const results = [];
  const lock = await client.getMailboxLock(folder);
  try {
    const total = client.mailbox.exists;
    if (!total) return results;
    const start = Math.max(1, total - FETCH_LIMIT + 1);
    for await (const message of client.fetch(`${start}:*`, {
      uid: true,
      flags: true,
      envelope: true,
      internalDate: true,
      size: true,
      headers: ["references", "in-reply-to", "message-id"],
    })) {
      results.push(normalizeMessage(message, folder, role));
    }
  } finally {
    lock.release();
  }
  return results;
}

/** Regroupe les messages en discussions via In-Reply-To / References (union-find). */
function buildThreads(account, messages) {
  const parent = new Map();
  const find = (id) => {
    if (!parent.has(id)) parent.set(id, id);
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    let cursor = id;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor);
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  for (const message of messages) {
    find(message.matchId);
    for (const reference of message.matchRefs) {
      union(message.matchId, reference);
    }
  }

  const groups = new Map();
  for (const message of messages) {
    const root = find(message.matchId);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(message);
  }

  const threads = [];
  for (const group of groups.values()) {
    group.sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = group[0];
    const last = group[group.length - 1];
    const participants = new Map();
    for (const message of group) {
      for (const person of [...message.from, ...message.to, ...message.cc]) {
        const key = person.address.toLowerCase();
        if (key && key !== account.address.toLowerCase()) {
          participants.set(key, person);
        }
      }
    }

    threads.push({
      id: Buffer.from(first.messageId, "utf8").toString("base64url"),
      subject: normalizeSubject(first.subject) || first.subject,
      messages: group,
      participants: [...participants.values()],
      firstDate: first.date,
      lastDate: last.date,
      lastMessage: last,
      count: group.length,
      unread: group.some((m) => m.role === "inbox" && !m.seen),
      flagged: group.some((m) => m.flagged),
      hasInbox: group.some((m) => m.role === "inbox"),
      hasSent: group.some((m) => m.role === "sent"),
    });
  }

  threads.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  return threads;
}

async function buildIndex(account) {
  return withClient(account, async (client) => {
    const folders = await resolveFolders(account, client);
    const messages = await fetchEnvelopes(client, folders.inbox, "inbox");
    if (folders.sent) {
      messages.push(...(await fetchEnvelopes(client, folders.sent, "sent")));
    }
    const threads = buildThreads(account, messages);
    return { threads, byId: new Map(threads.map((t) => [t.id, t])) };
  });
}

export function invalidateIndex(accountId) {
  const ids = accountId ? [accountId] : [...states.keys()];
  for (const id of ids) {
    const state = states.get(id);
    if (!state) continue;
    state.index = { at: 0, threads: null, byId: null, pending: null };
    state.folders = null;
  }
}

export async function getIndex(accountId, { force = false } = {}) {
  const account = resolveAccount(accountId);
  const state = stateFor(account.id);

  if (force) invalidateIndex(account.id);
  if (state.index.threads && Date.now() - state.index.at < INDEX_TTL_MS) {
    return state.index;
  }
  if (state.index.pending) return state.index.pending;

  const pending = buildIndex(account)
    .then((data) => {
      state.index = { at: Date.now(), ...data, pending: null };
      return state.index;
    })
    .catch((error) => {
      state.index.pending = null;
      throw error;
    });

  state.index.pending = pending;
  return pending;
}

/* ------------------------------------------------------------------ */
/* Aperçus (liste des discussions)                                     */
/* ------------------------------------------------------------------ */

const stripHtml = (html) =>
  String(html || "")
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');

const snippet = (text) =>
  String(text || "")
    .replace(/\r/g, "")
    .replace(/^>.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

function groupByFolder(messages) {
  const map = new Map();
  for (const message of messages) {
    if (!map.has(message.folder)) map.set(message.folder, []);
    map.get(message.folder).push(message);
  }
  return map;
}

/** Charge un extrait du corps pour les messages demandés (avec cache mémoire). */
export async function getPreviews(accountId, messages) {
  const account = resolveAccount(accountId);
  const previewCache = stateFor(account.id).previews;

  const missing = messages.filter((m) => !previewCache.has(m.key));
  if (missing.length) {
    try {
      await withClient(account, async (client) => {
        for (const [folder, list] of groupByFolder(missing)) {
          const lock = await client.getMailboxLock(folder);
          try {
            const uids = list.map((m) => m.uid).join(",");
            for await (const message of client.fetch(
              uids,
              { uid: true, source: { maxLength: 8192 } },
              { uid: true }
            )) {
              let text = "";
              try {
                const parsed = await simpleParser(message.source);
                text = parsed.text || stripHtml(parsed.html);
              } catch {
                text = "";
              }
              previewCache.set(`${folder}:${message.uid}`, snippet(text));
            }
          } finally {
            lock.release();
          }
        }
      });
    } catch (error) {
      console.error("Aperçus indisponibles:", error.message);
    }
    for (const message of missing) {
      if (!previewCache.has(message.key)) previewCache.set(message.key, "");
    }
  }

  const result = {};
  for (const message of messages) result[message.key] = previewCache.get(message.key) || "";
  return result;
}

/* ------------------------------------------------------------------ */
/* Détail d'une discussion                                             */
/* ------------------------------------------------------------------ */

function sanitizeHtml(html) {
  return String(html || "")
    .replace(
      /<\s*(script|iframe|object|embed|form|noscript)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ""
    )
    .replace(/<\s*(script|iframe|object|embed|form|link|meta|base)\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

function renderBody(parsed, folder, uid) {
  const attachments = (parsed.attachments || []).map((attachment, index) => ({
    index,
    folder,
    uid,
    part: attachment.partId || null,
    filename: attachment.filename || `piece-jointe-${index + 1}`,
    contentType: attachment.contentType || "application/octet-stream",
    size: attachment.size || 0,
    cid: attachment.cid || null,
    embedded: false,
  }));

  let html = parsed.html ? sanitizeHtml(parsed.html) : "";

  // Les images inline (cid:) sont intégrées en data URI : l'iframe d'affichage
  // ne peut pas transmettre le jeton d'authentification de l'admin.
  if (html) {
    for (const [index, attachment] of (parsed.attachments || []).entries()) {
      if (!attachment.cid || !attachment.content) continue;
      if (attachment.content.length > MAX_INLINE_BYTES) continue;
      const dataUri = `data:${attachment.contentType};base64,${attachment.content.toString(
        "base64"
      )}`;
      html = html.split(`cid:${attachment.cid}`).join(dataUri);
      attachments[index].embedded = true;
    }
  }

  return {
    html,
    text: parsed.text || (parsed.html ? stripHtml(parsed.html) : ""),
    attachments: attachments.filter((attachment) => !attachment.embedded),
  };
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Décode une partie texte selon le charset annoncé (accents !). */
function decodeText(buffer, charset) {
  const encoding = String(charset || "utf-8").toLowerCase();
  try {
    if (iconv.encodingExists(encoding)) return iconv.decode(buffer, encoding);
  } catch {
    /* repli ci-dessous */
  }
  return buffer.toString("utf8");
}

/** Aplatit l'arborescence MIME renvoyée par IMAP en une liste de parties. */
function flattenParts(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node.childNodes) && node.childNodes.length) {
    for (const child of node.childNodes) flattenParts(child, out);
  } else {
    // Message mono-partie : IMAP ne numérote pas la racine.
    out.push(node.part ? node : { ...node, part: "1" });
  }
  return out;
}

/**
 * Construit le corps d'un message en ne téléchargeant que les parties
 * affichées (texte, HTML, images intégrées). Les pièces jointes restent sur le
 * serveur : leur nom et leur taille viennent de la structure MIME.
 */
async function readStructuredBody(client, uid, structure, folder) {
  const textParts = [];
  const htmlParts = [];
  const inlineImages = [];
  const attachments = [];

  for (const leaf of flattenParts(structure)) {
    const type = String(leaf.type || "").toLowerCase();
    const disposition = String(leaf.disposition || "").toLowerCase();
    const filename =
      leaf.dispositionParameters?.filename || leaf.parameters?.name || "";
    const cid = leaf.id ? String(leaf.id).replace(/^<|>$/g, "") : null;
    const isAttachment =
      disposition === "attachment" || (!!filename && !type.startsWith("text/"));

    if (!isAttachment && type === "text/plain") {
      textParts.push(leaf);
      continue;
    }
    if (!isAttachment && type === "text/html") {
      htmlParts.push(leaf);
      continue;
    }
    if (cid && type.startsWith("image/") && (leaf.size || 0) <= MAX_INLINE_BYTES) {
      inlineImages.push(leaf);
    }

    attachments.push({
      index: attachments.length,
      folder,
      uid,
      part: leaf.part,
      filename: filename || `piece-jointe-${attachments.length + 1}`,
      contentType: type || "application/octet-stream",
      size: leaf.size || 0,
      cid,
      embedded: false,
    });
  }

  const readPart = async (leaf) => {
    const { content } = await client.download(String(uid), leaf.part, { uid: true });
    return streamToBuffer(content);
  };

  let text = "";
  for (const leaf of textParts) {
    const buffer = await readPart(leaf);
    text += (text ? "\n" : "") + decodeText(buffer, leaf.parameters?.charset);
  }

  let html = "";
  for (const leaf of htmlParts) {
    const buffer = await readPart(leaf);
    html += decodeText(buffer, leaf.parameters?.charset);
  }
  html = html ? sanitizeHtml(html) : "";

  if (html) {
    for (const leaf of inlineImages) {
      const entry = attachments.find((item) => item.part === leaf.part);
      // On ne télécharge l'image que si le HTML y fait réellement référence.
      if (!entry?.cid || !html.includes(`cid:${entry.cid}`)) continue;
      const buffer = await readPart(leaf);
      const dataUri = `data:${entry.contentType};base64,${buffer.toString("base64")}`;
      html = html.split(`cid:${entry.cid}`).join(dataUri);
      entry.embedded = true;
    }
  }

  return {
    html,
    text: text || (html ? stripHtml(html) : ""),
    attachments: attachments.filter((item) => !item.embedded),
  };
}

// Le contenu d'un message ne change jamais : on garde les corps déjà rendus.
// La clé inclut le Message-ID, pour être insensible à une réattribution d'UID.
const BODY_CACHE_MAX = 60;
// Le processus tourne en continu : on plafonne aussi la mémoire retenue, un
// corps pouvant embarquer des images intégrées en data URI.
const BODY_CACHE_MAX_BYTES =
  Math.max(8, Number(process.env.MAIL_BODY_CACHE_MB || 64)) * 1024 * 1024;

const bodyKey = (message) => `${message.folder}:${message.uid}:${message.messageId}`;

const bodyWeight = (body) =>
  (body.html?.length || 0) + (body.text?.length || 0) + 512;

function cacheBody(state, key, body) {
  const previous = state.bodies.get(key);
  if (previous) state.bodyBytes -= bodyWeight(previous);

  state.bodies.delete(key);
  state.bodies.set(key, body);
  state.bodyBytes += bodyWeight(body);

  while (
    state.bodies.size > BODY_CACHE_MAX ||
    state.bodyBytes > BODY_CACHE_MAX_BYTES
  ) {
    const oldest = state.bodies.keys().next().value;
    if (oldest === undefined) break;
    const evicted = state.bodies.get(oldest);
    state.bodies.delete(oldest);
    if (evicted) state.bodyBytes -= bodyWeight(evicted);
  }
}

export async function getThread(accountId, threadId) {
  const account = resolveAccount(accountId);
  const state = stateFor(account.id);

  const index = await getIndex(account.id);
  const thread = index.byId.get(threadId);
  if (!thread) return null;

  const messages = [];
  const missing = [];
  for (const base of thread.messages) {
    const cached = state.bodies.get(bodyKey(base));
    if (cached) messages.push({ ...base, ...cached });
    else missing.push(base);
  }

  if (missing.length) {
    await withClient(account, async (client) => {
      for (const [folder, list] of groupByFolder(missing)) {
        const lock = await client.getMailboxLock(folder);
        try {
          // Petits messages : une seule requête pour tout le lot.
          const small = list.filter((m) => !m.size || m.size <= MAX_FULL_SOURCE_BYTES);
          const large = list.filter((m) => m.size > MAX_FULL_SOURCE_BYTES);

          if (small.length) {
            const byUid = new Map(small.map((m) => [m.uid, m]));
            for await (const message of client.fetch(
              small.map((m) => m.uid).join(","),
              { uid: true, flags: true, source: true },
              { uid: true }
            )) {
              const base = byUid.get(message.uid);
              if (!base) continue;
              let body = { html: "", text: "", attachments: [] };
              try {
                body = renderBody(await simpleParser(message.source), folder, message.uid);
              } catch (error) {
                body.text = `Impossible de lire ce message : ${error.message}`;
              }
              cacheBody(state, bodyKey(base), body);
              messages.push({
                ...base,
                seen: message.flags ? message.flags.has("\\Seen") : base.seen,
                ...body,
              });
            }
          }

          // Gros messages : structure MIME puis parties affichées uniquement.
          for (const base of large) {
            let body;
            try {
              const meta = await client.fetchOne(
                String(base.uid),
                { uid: true, bodyStructure: true },
                { uid: true }
              );
              body = await readStructuredBody(client, base.uid, meta.bodyStructure, folder);
            } catch (error) {
              console.error(
                `Lecture structurée impossible (uid ${base.uid}), repli sur le message complet:`,
                error?.message || error
              );
              try {
                const message = await client.fetchOne(
                  String(base.uid),
                  { uid: true, source: true },
                  { uid: true }
                );
                body = renderBody(await simpleParser(message.source), folder, base.uid);
              } catch (fallbackError) {
                body = {
                  html: "",
                  text: `Impossible de lire ce message : ${fallbackError.message}`,
                  attachments: [],
                };
              }
            }
            cacheBody(state, bodyKey(base), body);
            messages.push({ ...base, ...body });
          }
        } finally {
          lock.release();
        }
      }
    });
  }

  messages.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    id: thread.id,
    subject: thread.subject,
    participants: thread.participants,
    count: messages.length,
    lastDate: thread.lastDate,
    messages,
  };
}

export async function getAttachment(accountId, { folder, uid, index, part }) {
  const account = resolveAccount(accountId);
  return withClient(account, async (client) => {
    // Le dossier vient de l'URL : on le restreint aux dossiers connus.
    const folders = await resolveFolders(account, client);
    const allowed = [folders.inbox, folders.sent].filter(Boolean);
    if (!allowed.includes(folder)) {
      throw new Error("Dossier inconnu.");
    }

    const lock = await client.getMailboxLock(folder);
    try {
      // Téléchargement direct de la partie : évite de rapatrier tout le message.
      if (part) {
        try {
          const { content, meta } = await client.download(String(uid), part, {
            uid: true,
          });
          const buffer = await streamToBuffer(content);
          if (buffer.length) {
            return {
              filename: meta?.filename || `piece-jointe-${(index ?? 0) + 1}`,
              contentType: meta?.contentType || "application/octet-stream",
              content: buffer,
            };
          }
        } catch (error) {
          console.error(
            `Téléchargement direct de la partie ${part} impossible, repli:`,
            error?.message || error
          );
        }
      }

      const message = await client.fetchOne(
        String(uid),
        { uid: true, source: true },
        { uid: true }
      );
      if (!message) return null;
      const parsed = await simpleParser(message.source);
      const attachment = (parsed.attachments || [])[index];
      if (!attachment) return null;
      return {
        filename: attachment.filename || `piece-jointe-${index + 1}`,
        contentType: attachment.contentType || "application/octet-stream",
        content: attachment.content,
      };
    } finally {
      lock.release();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export async function setThreadSeen(accountId, threadId, seen) {
  const account = resolveAccount(accountId);
  const index = await getIndex(account.id);
  const thread = index.byId.get(threadId);
  if (!thread) return false;

  const targets = thread.messages.filter((m) => m.role === "inbox");
  if (!targets.length) return true;

  await withClient(account, async (client) => {
    for (const [folder, list] of groupByFolder(targets)) {
      const lock = await client.getMailboxLock(folder);
      try {
        const uids = list.map((m) => m.uid);
        if (seen) {
          await client.messageFlagsAdd({ uid: uids }, ["\\Seen"], { uid: true });
        } else {
          await client.messageFlagsRemove({ uid: uids }, ["\\Seen"], { uid: true });
        }
        for (const message of list) message.seen = seen;
      } finally {
        lock.release();
      }
    }
  });

  thread.unread = thread.messages.some((m) => m.role === "inbox" && !m.seen);
  return true;
}

const uniqueAddresses = (list, selfAddress) => {
  const self = String(selfAddress || "").toLowerCase();
  const map = new Map();
  for (const entry of list || []) {
    const address = String(entry.address || entry || "").trim();
    const key = address.toLowerCase();
    if (!key || key === self) continue;
    map.set(key, entry.name ? { name: entry.name, address } : { address });
  }
  return [...map.values()];
};

/** Destinataires proposés + en-têtes de threading pour répondre à une discussion. */
export function buildReplyDraft(accountId, thread) {
  const account = resolveAccount(accountId);
  const incoming = [...thread.messages].reverse().find((m) => m.role === "inbox");
  const last = incoming || thread.messages[thread.messages.length - 1];
  if (!last) return null;

  const to = incoming
    ? uniqueAddresses(last.replyTo.length ? last.replyTo : last.from, account.address)
    : uniqueAddresses(last.to, account.address);

  const subject = /^re\s*:/i.test(last.subject)
    ? last.subject
    : `Re: ${normalizeSubject(last.subject) || last.subject}`;

  return {
    to,
    cc: uniqueAddresses(last.cc, account.address),
    subject,
    inReplyTo: last.messageId,
    references: [...new Set([...last.references, ...last.inReplyTo, last.messageId])],
  };
}

export async function sendReply(accountId, {
  threadId,
  to,
  cc = [],
  subject,
  text,
  inReplyTo,
  references = [],
  attachments = [],
}) {
  const account = resolveAccount(accountId);
  const recipients = (Array.isArray(to) ? to : [to]).map(String).filter(Boolean);
  if (!recipients.length) throw new Error("Aucun destinataire.");
  if (!text || !text.trim()) throw new Error("Le message est vide.");

  const total = attachments.reduce(
    (sum, file) => sum + (file.content?.length || 0),
    0
  );
  if (total > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Pièces jointes trop volumineuses (${Math.round(total / 1024 / 1024)} Mo, ` +
        `maximum ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} Mo).`
    );
  }

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">${text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("")}</div>`;

  const message = {
    from: `"${account.fromName}" <${account.address}>`,
    to: recipients,
    cc: (Array.isArray(cc) ? cc : [cc]).map(String).filter(Boolean),
    subject: subject || "(sans objet)",
    text,
    html,
    inReplyTo: inReplyTo ? `<${inReplyTo}>` : undefined,
    references: references.map((reference) => `<${reference}>`),
    attachments: attachments.map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType || undefined,
    })),
  };

  // Génère la source brute une seule fois : envoyée par SMTP puis archivée dans "Envoyés".
  const composer = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "unix",
  });
  const built = await composer.sendMail(message);
  const raw = built.message;

  const transport = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.smtp.user, pass: account.smtp.pass },
  });
  const info = await transport.sendMail({ envelope: built.envelope, raw });

  // Résolu AVANT d'ouvrir la connexion : getIndex() peut lui-même déclencher un
  // accès IMAP, et withClient est sérialisé — un appel imbriqué s'attendrait
  // lui-même indéfiniment (la requête resterait bloquée sans jamais répondre).
  let answered = [];
  if (threadId) {
    try {
      const index = await getIndex(account.id);
      const thread = index.byId.get(threadId);
      answered = thread?.messages.filter((m) => m.role === "inbox") || [];
    } catch (error) {
      console.error(
        "Discussion introuvable pour le marquage:",
        error?.message || error
      );
    }
  }

  // Le message est déjà parti : aucune erreur d'archivage ne doit remonter,
  // sinon l'admin croirait l'envoi échoué et enverrait un doublon.
  try {
    await withClient(account, async (client) => {
      const sentFolder = await ensureSentFolder(account, client);
      if (sentFolder) {
        try {
          await client.append(sentFolder, raw, ["\\Seen"], new Date());
        } catch (error) {
          console.error(
            "Copie dans le dossier Envoyés impossible:",
            error?.message || error
          );
        }
      }

      for (const [folder, list] of groupByFolder(answered)) {
        const lock = await client.getMailboxLock(folder);
        try {
          await client.messageFlagsAdd(
            { uid: list.map((m) => m.uid) },
            ["\\Seen", "\\Answered"],
            { uid: true }
          );
        } catch {
          /* non bloquant */
        } finally {
          lock.release();
        }
      }
    });
  } catch (error) {
    console.error("Archivage de la réponse impossible:", error?.message || error);
  }

  invalidateIndex(account.id);
  return { messageId: info.messageId, accepted: info.accepted };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
