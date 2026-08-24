"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCornerUpLeft,
  FiDownload,
  FiPaperclip,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiMail,
  FiEyeOff,
  FiX,
  FiEdit,
} from "react-icons/fi";

import Spinner from "./spinner/Spinner";
import {
  downloadAttachment,
  getThread,
  getThreads,
  markThreadRead,
  replyToThread,
} from "@/services/mail.service";

const PAGE_SIZE = 20;

// "Toutes" ne montre que les discussions reçues : l'onglet "Reçues" ferait
// double emploi, seul "Envoyées" ouvre sur les messages partis sans réponse.
const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "unread", label: "Non lues" },
  { key: "sent", label: "Envoyées" },
];

const displayName = (person) => {
  if (!person) return "Inconnu";
  return person.name || person.address || "Inconnu";
};

const initials = (person) =>
  displayName(person).trim().charAt(0).toUpperCase() || "?";

const formatDate = (value) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("fr-CA", { day: "2-digit", month: "short" });
  }
  return date.toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatFullDate = (value) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-CA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const addressLine = (list) =>
  (list || []).map((person) => person.name || person.address).join(", ");

const parseAddresses = (value) =>
  String(value || "")
    .split(/[,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

/** Corps d'un message : le HTML est isolé dans une iframe sans scripts. */
const MessageBody = ({ message }) => {
  const frameRef = useRef(null);
  const observerRef = useRef(null);
  const [height, setHeight] = useState(120);

  const srcDoc = useMemo(() => {
    if (!message.html) return null;
    return `<!doctype html><html><head><meta charset="utf-8"/><base target="_blank"/>
      <style>
        body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;word-break:break-word}
        img{max-width:100%;height:auto}
        table{max-width:100%}
        a{color:#166534}
      </style></head><body>${message.html}</body></html>`;
  }, [message.html]);

  const measure = useCallback(() => {
    try {
      const doc = frameRef.current?.contentDocument;
      if (doc?.body) {
        setHeight(Math.min(doc.body.scrollHeight + 24, 4000));
      }
    } catch {
      /* hauteur par défaut */
    }
  }, []);

  // Le contenu peut grandir après le onLoad (polices, images) : on re-mesure.
  const handleLoad = () => {
    measure();
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body || typeof ResizeObserver === "undefined") {
      setTimeout(measure, 400);
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
    observerRef.current = observer;
  };

  useEffect(() => () => observerRef.current?.disconnect(), []);

  if (srcDoc) {
    return (
      <iframe
        ref={frameRef}
        title={`message-${message.uid}`}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={srcDoc}
        onLoad={handleLoad}
        style={{ height }}
        className="w-full border-0"
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-800 leading-relaxed">
      {message.text || "(message vide)"}
    </pre>
  );
};

const MessageCard = ({ message, mailbox, account }) => {
  const outgoing = message.role === "sent";
  const sender = message.from[0];

  return (
    <article
      className={`rounded-xl border shadow-sm ${
        outgoing ? "border-brand/50 bg-brand/5" : "border-gray-200 bg-white"
      }`}
    >
      <header className="flex items-start gap-3 border-b border-gray-100 px-4 py-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            outgoing ? "bg-brand text-black" : "bg-gray-800 text-white"
          }`}
        >
          {initials(sender)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-gray-900">
              {outgoing ? `Vous (${mailbox})` : displayName(sender)}
            </span>
            {!outgoing && sender?.address && (
              <span className="text-xs text-gray-500">{sender.address}</span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">
            À : {addressLine(message.to) || "—"}
            {message.cc?.length ? ` · Cc : ${addressLine(message.cc)}` : ""}
          </p>
        </div>
        <time className="shrink-0 text-xs text-gray-500">
          {formatFullDate(message.date)}
        </time>
      </header>

      <div className="px-4 py-3">
        <MessageBody message={message} />
      </div>

      {message.attachments?.length > 0 && (
        <footer className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
          {message.attachments.map((attachment) => (
            <button
              key={`${attachment.uid}-${attachment.index}`}
              type="button"
              onClick={() =>
                downloadAttachment({ ...attachment, account }).catch((error) =>
                  toast.error(error.message)
                )
              }
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 transition-colors hover:border-brand hover:bg-brand/10"
            >
              <FiPaperclip className="shrink-0" />
              <span className="max-w-[180px] truncate">{attachment.filename}</span>
              <span className="text-gray-400">{formatSize(attachment.size)}</span>
              <FiDownload className="shrink-0" />
            </button>
          ))}
        </footer>
      )}
    </article>
  );
};

/** Message optimiste : affiché immédiatement, avant confirmation du serveur. */
const PendingCard = ({ entry, mailbox, onRetry, onDiscard }) => (
  <article
    className={`rounded-xl border shadow-sm ${
      entry.error ? "border-red-300 bg-red-50" : "border-brand/50 bg-brand/5 opacity-70"
    }`}
  >
    <header className="flex items-start gap-3 border-b border-gray-100 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-black">
        {initials({ name: mailbox })}
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-gray-900">Vous ({mailbox})</span>
        <p className="truncate text-xs text-gray-500">
          À : {entry.payload.to.join(", ")}
        </p>
      </div>
      <span
        className={`shrink-0 text-xs font-medium ${
          entry.error ? "text-red-600" : "text-gray-500"
        }`}
      >
        {entry.error ? "Échec de l'envoi" : "Envoi…"}
      </span>
    </header>

    <div className="px-4 py-3">
      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-800 leading-relaxed">
        {entry.payload.text}
      </pre>
    </div>

    {entry.files.length > 0 && (
      <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
        {entry.files.map((file) => (
          <span
            key={`${file.name}-${file.size}`}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600"
          >
            <FiPaperclip className="shrink-0" />
            <span className="max-w-[180px] truncate">{file.name}</span>
            <span className="text-gray-400">{formatSize(file.size)}</span>
          </span>
        ))}
      </div>
    )}

    {entry.error && (
      <footer className="flex flex-wrap items-center gap-3 border-t border-red-200 px-4 py-3">
        <span className="text-xs text-red-700">{entry.error}</span>
        <button
          type="button"
          onClick={() => onRetry(entry.id)}
          className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-brand transition-colors hover:bg-gray-800"
        >
          <FiRefreshCw />
          Réessayer
        </button>
        <button
          type="button"
          onClick={() => onDiscard(entry.id)}
          className="text-xs text-gray-500 transition-colors hover:text-gray-900"
        >
          Abandonner
        </button>
      </footer>
    )}
  </article>
);

/** Sélection de pièces jointes, partagée entre la réponse et le nouveau message. */
const useAttachments = (maxAttachmentBytes) => {
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const attachedSize = files.reduce((sum, file) => sum + file.size, 0);

  const pick = (event) => {
    const picked = Array.from(event.target.files || []);
    // Un même fichier ne doit pas être joint deux fois.
    const merged = [...files];
    for (const file of picked) {
      const already = merged.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified
      );
      if (!already) merged.push(file);
    }

    const total = merged.reduce((sum, file) => sum + file.size, 0);
    if (total > maxAttachmentBytes) {
      toast.error(
        `Pièces jointes trop volumineuses (${formatSize(total)}, maximum ${formatSize(
          maxAttachmentBytes
        )}).`
      );
    } else {
      setFiles(merged);
    }

    // Permet de re-sélectionner le même fichier après l'avoir retiré.
    event.target.value = "";
  };

  const remove = (index) =>
    setFiles((current) => current.filter((_, position) => position !== index));

  const tooLarge = attachedSize > maxAttachmentBytes;

  return { files, setFiles, attachedSize, tooLarge, inputRef, pick, remove };
};

/** Pastilles des fichiers joints, avec retrait. */
const AttachmentChips = ({ files, onRemove }) =>
  files.length === 0 ? null : (
    <ul className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.size}-${file.lastModified}`}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
        >
          <FiPaperclip className="shrink-0" />
          <span className="max-w-[200px] truncate">{file.name}</span>
          <span className="text-gray-400">{formatSize(file.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Retirer ${file.name}`}
            className="text-gray-400 transition-colors hover:text-red-600"
          >
            <FiX />
          </button>
        </li>
      ))}
    </ul>
  );

/** Bouton « Joindre un fichier » + son champ masqué. */
const AttachmentButton = ({ inputRef, onPick, files, attachedSize }) => (
  <>
    <input ref={inputRef} type="file" multiple onChange={onPick} className="hidden" />
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-brand hover:text-black"
    >
      <FiPaperclip />
      Joindre un fichier
    </button>
    {files.length > 0 && (
      <span className="text-xs text-gray-500">
        {files.length} fichier{files.length > 1 ? "s" : ""} · {formatSize(attachedSize)}
      </span>
    )}
  </>
);

/** Rédaction d'un nouveau message, sans discussion parente. */
const ComposeModal = ({ mailbox, maxAttachmentBytes, onSend, onClose }) => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const { files, attachedSize, tooLarge, inputRef, pick, remove } =
    useAttachments(maxAttachmentBytes);

  const dirtyRef = useRef(false);
  dirtyRef.current = Boolean(
    to.trim() || cc.trim() || subject.trim() || text.trim() || files.length
  );

  // Ne jamais jeter un message commencé sans demander.
  const requestClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm("Abandonner ce message ?")) return;
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const submit = (event) => {
    event.preventDefault();
    const recipients = parseAddresses(to);
    if (!recipients.length) {
      toast.error("Ajoutez au moins un destinataire.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Ajoutez un objet.");
      return;
    }
    if (!text.trim()) {
      toast.error("Le message est vide.");
      return;
    }
    if (tooLarge) {
      toast.error(
        `Pièces jointes trop volumineuses (maximum ${formatSize(maxAttachmentBytes)}).`
      );
      return;
    }

    // Aucun threadId ni inReplyTo : c'est une nouvelle conversation.
    onSend(
      { to: recipients, cc: parseAddresses(cc), subject, text },
      files
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={requestClose}
      role="presentation"
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Nouveau message</h2>
            <p className="truncate text-xs text-gray-500">De : {mailbox}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <FiX />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
          <label className="flex items-center gap-3 text-sm">
            <span className="w-14 shrink-0 text-gray-500">À</span>
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="destinataire@exemple.com"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-14 shrink-0 text-gray-500">Cc</span>
            <input
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="Optionnel"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-14 shrink-0 text-gray-500">Objet</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            placeholder="Écrivez votre message…"
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <AttachmentChips files={files} onRemove={remove} />
        </div>

        <footer className="flex items-center gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-semibold text-black transition-colors hover:bg-brand-dark"
          >
            <FiSend />
            Envoyer
          </button>
          <AttachmentButton
            inputRef={inputRef}
            onPick={pick}
            files={files}
            attachedSize={attachedSize}
          />
        </footer>
      </form>
    </div>
  );
};

const ReplyBox = ({ draft, threadId, maxAttachmentBytes, onSend }) => {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const { files, setFiles, attachedSize, tooLarge, inputRef, pick, remove } =
    useAttachments(maxAttachmentBytes);

  useEffect(() => {
    setOpen(false);
    setText("");
    setFiles([]);
    setTo((draft?.to || []).map((person) => person.address).join(", "));
    setCc((draft?.cc || []).map((person) => person.address).join(", "));
    setSubject(draft?.subject || "");
    // setFiles vient de useState : sa référence ne change jamais.
  }, [draft, threadId, setFiles]);


  // L'envoi part en arrière-plan : le formulaire se ferme tout de suite et le
  // message apparaît dans la conversation avec l'état « Envoi… ». Une erreur
  // éventuelle s'affiche après coup, sans perdre le contenu saisi.
  const handleSend = (event) => {
    event.preventDefault();
    const recipients = parseAddresses(to);
    if (!recipients.length) {
      toast.error("Ajoutez au moins un destinataire.");
      return;
    }
    if (!text.trim()) {
      toast.error("Le message est vide.");
      return;
    }
    if (tooLarge) {
      toast.error(
        `Pièces jointes trop volumineuses (maximum ${formatSize(maxAttachmentBytes)}).`
      );
      return;
    }

    onSend(
      {
        threadId,
        to: recipients,
        cc: parseAddresses(cc),
        subject,
        text,
        inReplyTo: draft?.inReplyTo,
        references: draft?.references || [],
      },
      files
    );

    setText("");
    setFiles([]);
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 font-semibold text-brand transition-colors hover:bg-gray-800"
        >
          <FiCornerUpLeft />
          Répondre
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSend}
      className="border-t border-gray-200 bg-white px-6 py-4"
    >
      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm">
          <span className="w-14 shrink-0 text-gray-500">À</span>
          <input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="destinataire@exemple.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <span className="w-14 shrink-0 text-gray-500">Cc</span>
          <input
            value={cc}
            onChange={(event) => setCc(event.target.value)}
            placeholder="Optionnel"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <span className="w-14 shrink-0 text-gray-500">Objet</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          placeholder="Écrivez votre réponse…"
          className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <AttachmentChips files={files} onRemove={remove} />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-semibold text-black transition-colors hover:bg-brand-dark"
        >
          <FiSend />
          Envoyer
        </button>

        <AttachmentButton
          inputRef={inputRef}
          onPick={pick}
          files={files}
          attachedSize={attachedSize}
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-3 text-sm text-gray-600 hover:text-gray-900"
        >
          Annuler
        </button>
      </div>
    </form>
  );
};

const MessagerieContent = () => {
  const [threads, setThreads] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mailbox, setMailbox] = useState("info@bsr3r.com");
  const [maxAttachmentBytes, setMaxAttachmentBytes] = useState(4 * 1024 * 1024);
  const [accounts, setAccounts] = useState([]);
  // "selection" reste null tant que l'utilisateur n'a pas choisi : le serveur
  // décide alors de la boîte par défaut. "account" est la boîte réellement
  // affichée ; la garder hors des dépendances de chargement évite une seconde
  // requête inutile quand le serveur nous renvoie son choix.
  const [selection, setSelection] = useState(null);
  const [account, setAccount] = useState(null);
  const [outbox, setOutbox] = useState([]);
  const [composing, setComposing] = useState(false);

  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  // openThread est mémoïsé sans dépendances : il lit la liste courante via une
  // ref plutôt que via l'état, et sans effet de bord dans un updater React
  // (que StrictMode invoque deux fois en développement).
  const threadsRef = useRef([]);
  const selectedIdRef = useRef(null);
  const accountRef = useRef(null);
  const loadThreadsRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);

  const loadThreads = useCallback(
    async ({ refresh = false, silent = false } = {}) => {
      try {
        if (!silent) setListLoading(true);
        setListError(null);
        const data = await getThreads({
          account: selection,
          filter,
          search,
          page,
          pageSize: PAGE_SIZE,
          refresh,
        });
        setThreads(data.threads);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
        setMailbox(data.mailbox);
        setAccounts(data.accounts || []);
        setAccount(data.account);
        accountRef.current = data.account;
        if (data.maxAttachmentBytes) setMaxAttachmentBytes(data.maxAttachmentBytes);
      } catch (error) {
        setListError(error.message);
      } finally {
        setListLoading(false);
      }
    },
    [selection, filter, search, page]
  );

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  useEffect(() => {
    loadThreadsRef.current = loadThreads;
  }, [loadThreads]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const refreshAfterSend = useCallback((threadId) => {
    getThread(threadId, accountRef.current)
      .then((data) => {
        // L'utilisateur a pu changer de discussion entre-temps.
        setThread((current) => (current?.id === threadId ? data.thread : current));
        setDraft((current) => (current && threadId === selectedIdRef.current ? data.draft : current));
      })
      .catch(() => {});
    loadThreadsRef.current?.({ refresh: true, silent: true });
  }, []);

  const openThread = useCallback(async (threadId) => {
    setSelectedId(threadId);
    setThreadLoading(true);
    setThreadError(null);
    try {
      const data = await getThread(threadId, accountRef.current);
      setThread(data.thread);
      setDraft(data.draft);
      markThreadRead(threadId, true, accountRef.current)
        .then(() => {
          // Le compteur ne bouge que si la discussion était réellement non lue.
          if (threadsRef.current.some((item) => item.id === threadId && item.unread)) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          setThreads((current) =>
            current.map((item) =>
              item.id === threadId ? { ...item, unread: false } : item
            )
          );
        })
        .catch(() => {});
    } catch (error) {
      setThread(null);
      setThreadError(error.message);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // L'envoi ne bloque pas l'interface : le message s'affiche tout de suite, et
  // le résultat (succès ou échec) arrive après. Aucun contenu n'est perdu en cas
  // d'échec, l'entrée reste dans la conversation avec un bouton « Réessayer ».
  const deliver = useCallback(
    (id, payload, files) => {
      setOutbox((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, error: null } : entry
        )
      );

      replyToThread(payload, files)
        .then(() => {
          setOutbox((current) => current.filter((entry) => entry.id !== id));
          toast.success("Réponse envoyée.");
          if (payload.threadId) refreshAfterSend(payload.threadId);
          else loadThreadsRef.current?.({ refresh: true, silent: true });
        })
        .catch((error) => {
          setOutbox((current) =>
            current.map((entry) =>
              entry.id === id ? { ...entry, error: error.message } : entry
            )
          );
          toast.error(`Échec de l'envoi : ${error.message}`);
        });
    },
    // refreshAfterSend est stable (useCallback sans dépendance changeante)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSend = useCallback(
    (payload, files) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const withAccount = { ...payload, account: accountRef.current };
      setOutbox((current) => [
        ...current,
        {
          id,
          threadId: payload.threadId,
          account: accountRef.current,
          payload: withAccount,
          files,
          error: null,
        },
      ]);
      deliver(id, withAccount, files);
    },
    [deliver]
  );

  const retrySend = useCallback(
    (id) => {
      setOutbox((current) => {
        const entry = current.find((item) => item.id === id);
        if (entry) deliver(id, entry.payload, entry.files);
        return current;
      });
    },
    [deliver]
  );

  const discardSend = useCallback(
    (id) => setOutbox((current) => current.filter((entry) => entry.id !== id)),
    []
  );

  const switchAccount = useCallback(
    (nextAccount) => {
      if (nextAccount === accountRef.current) return;
      accountRef.current = nextAccount;
      setAccount(nextAccount);
      setSelection(nextAccount);
      // Rien de la boîte précédente ne doit rester à l'écran.
      setSelectedId(null);
      setThread(null);
      setDraft(null);
      setThreadError(null);
      setThreads([]);
      // Sinon la pastille afficherait brièvement le compte de la boîte quittée.
      setUnreadCount(0);
      setTotal(0);
      setPage(1);
      setSearchInput("");
      setSearch("");
      setFilter("all");
    },
    []
  );

  const handleMarkUnread = async () => {
    if (!selectedId) return;
    try {
      await markThreadRead(selectedId, false, accountRef.current);
      if (threadsRef.current.some((item) => item.id === selectedId && !item.unread)) {
        setUnreadCount((count) => count + 1);
      }
      setThreads((current) =>
        current.map((item) =>
          item.id === selectedId ? { ...item, unread: true } : item
        )
      );
      toast.success("Marquée comme non lue.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Liste des discussions */}
      <section className="flex w-[380px] shrink-0 flex-col border-r border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-semibold text-brand transition-colors hover:bg-gray-800"
          >
            <FiEdit />
            Nouveau message
          </button>

          {accounts.length > 1 && (
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
              {accounts.map((item) => {
                const active = item.id === account;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.configured}
                    title={
                      item.configured
                        ? item.address
                        : `${item.address} — identifiants manquants`
                    }
                    onClick={() => switchAccount(item.id)}
                    className={`flex-1 truncate rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-black text-brand shadow-sm"
                        : "text-gray-600 hover:bg-white hover:text-black"
                    } disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{mailbox}</p>
              <p className="text-xs text-gray-500">
                {total} discussion{total > 1 ? "s" : ""}
                {unreadCount > 0 ? ` · ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadThreads({ refresh: true })}
              title="Actualiser"
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:border-brand hover:text-black"
            >
              <FiRefreshCw className={listLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher (objet, expéditeur)"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="flex gap-1">
            {FILTERS.map((item) => {
              const active = filter === item.key;
              // Le nombre de discussions non lues est porté par son onglet.
              const badge = item.key === "unread" ? unreadCount : 0;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setFilter(item.key);
                  }}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    active ? "bg-black text-brand" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                        active ? "bg-brand text-black" : "bg-brand-dark text-black"
                      }`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Un nouveau message n'appartient à aucune discussion : son état
            s'affiche ici plutôt que dans le fil. */}
        {outbox
          .filter((entry) => !entry.threadId && entry.account === account)
          .map((entry) => (
            <div
              key={entry.id}
              className={`border-b px-4 py-3 text-xs ${
                entry.error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gray-100 bg-brand/5 text-gray-600"
              }`}
            >
              <p className="truncate font-semibold">
                {entry.error ? "Échec de l'envoi" : "Envoi en cours…"} —{" "}
                {entry.payload.subject || "(sans objet)"}
              </p>
              <p className="truncate">À : {entry.payload.to.join(", ")}</p>
              {entry.error && (
                <>
                  <p className="mt-1">{entry.error}</p>
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => retrySend(entry.id)}
                      className="rounded bg-black px-3 py-1 font-semibold text-brand"
                    >
                      Réessayer
                    </button>
                    <button
                      type="button"
                      onClick={() => discardSend(entry.id)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      Abandonner
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {listLoading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}

          {!listLoading && listError && (
            <p className="px-4 py-6 text-sm text-red-600">{listError}</p>
          )}

          {!listLoading && !listError && threads.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Aucune discussion.
            </p>
          )}

          {!listLoading &&
            !listError &&
            threads.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openThread(item.id)}
                  className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors ${
                    active ? "bg-brand/10" : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                      item.unread ? "bg-brand-dark" : "bg-transparent"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          item.unread ? "font-bold text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {item.lastIsOutgoing ? "Vous · " : ""}
                        {item.participants.length
                          ? item.participants.map(displayName).join(", ")
                          : displayName(item.lastFrom)}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatDate(item.lastDate)}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-sm ${
                        item.unread ? "font-semibold text-gray-900" : "text-gray-600"
                      }`}
                    >
                      {item.subject || "(sans objet)"}
                      {item.count > 1 && (
                        <span className="ml-1 text-xs text-gray-400">({item.count})</span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      {item.preview || "—"}
                    </span>
                  </span>
                </button>
              );
            })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded px-2 py-1 text-gray-600 disabled:opacity-40 hover:text-black"
            >
              Précédent
            </button>
            <span className="text-xs text-gray-500">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded px-2 py-1 text-gray-600 disabled:opacity-40 hover:text-black"
            >
              Suivant
            </button>
          </div>
        )}
      </section>

      {/* Discussion sélectionnée */}
      <section className="flex min-w-0 flex-1 flex-col">
        {!selectedId && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
            <FiMail size={48} />
            <p className="text-sm">Sélectionnez une discussion pour l&apos;afficher.</p>
          </div>
        )}

        {selectedId && threadLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        )}

        {selectedId && !threadLoading && threadError && (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-red-600">
            {threadError}
          </div>
        )}

        {selectedId && !threadLoading && !threadError && thread && (
          <>
            <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-gray-900">
                  {thread.subject || "(sans objet)"}
                </h2>
                <p className="truncate text-sm text-gray-500">
                  {thread.count} message{thread.count > 1 ? "s" : ""}
                  {thread.participants.length
                    ? ` · ${thread.participants.map(displayName).join(", ")}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleMarkUnread}
                  title="Marquer comme non lue"
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:border-brand hover:text-black"
                >
                  <FiEyeOff />
                </button>
                <button
                  type="button"
                  onClick={() => openThread(selectedId)}
                  title="Actualiser la discussion"
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:border-brand hover:text-black"
                >
                  <FiRefreshCw />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 px-6 py-5">
              {thread.messages.map((message) => (
                <MessageCard
                  key={message.key}
                  message={message}
                  mailbox={mailbox}
                  account={account}
                />
              ))}

              {outbox
                .filter(
                  (entry) =>
                    entry.threadId === selectedId && entry.account === account
                )
                .map((entry) => (
                  <PendingCard
                    key={entry.id}
                    entry={entry}
                    mailbox={mailbox}
                    onRetry={retrySend}
                    onDiscard={discardSend}
                  />
                ))}
            </div>

            <ReplyBox
              draft={draft}
              threadId={selectedId}
              maxAttachmentBytes={maxAttachmentBytes}
              onSend={handleSend}
            />
          </>
        )}
      </section>

      {composing && (
        <ComposeModal
          mailbox={mailbox}
          maxAttachmentBytes={maxAttachmentBytes}
          onSend={handleSend}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
};

export default MessagerieContent;
