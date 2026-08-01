import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import "./styles.css";

const BASE = import.meta.env.BASE_URL || "/";
const COPY_RESET_MS = 1400;

const UI = {
  en: {
    lang: "en",
    dir: "ltr",
    switchLabel: "FA",
    qrTitle: "Teleclip QR code",
    qrAlt: "QR code for Teleclip",
    qrCaption: "Scan to open Teleclip",
    cancel: "Cancel",
    copy: "Copy",
    copied: "Copied",
    select: "Select",
    call: "Call",
    open: "Open",
    refresh: "Refresh",
    headline: "Copy here. Paste there.",
    subhead: "One shared clipboard for your own devices.",
    placeholder: "Drop text here",
    inputLabel: "Text to reflect",
    chars: (count) => `${count} characters`,
    paste: "Paste",
    clear: "Clear",
    light: "Light",
    dark: "Dark",
    pasted: "Pasted",
    clipboardEmpty: "Clipboard is empty",
    clipboardBlocked: "Browser blocked clipboard paste",
    qr: "QR",
    reflect: "Reflect",
    reflecting: "Reflecting",
    reflected: "Reflected",
    loading: "Loading...",
    history: "History",
    deleteAll: "Delete all",
    emptyHistory: "No reflected text yet.",
    delete: "Delete",
    deleteItemLabel: "Delete history item",
    deleted: "Deleted",
    clearTitle: "Delete history?",
    clearBody: "This removes every previous reflected text from this host.",
    clearConfirm: "Delete all",
    historyCleared: "History cleared",
    couldNotLoad: "Could not load",
    couldNotReflect: "Could not reflect",
    couldNotDelete: "Could not delete",
    couldNotClear: "Could not clear history",
    wentWrong: "Something went wrong"
  },
  fa: {
    lang: "fa",
    dir: "rtl",
    switchLabel: "EN",
    qrTitle: "کد QR تله کلیپ",
    qrAlt: "کد QR برای تله کلیپ",
    qrCaption: "برای باز کردن تله کلیپ اسکن کنید",
    cancel: "لغو",
    copy: "کپی",
    copied: "کپی شد",
    select: "انتخاب کنید",
    call: "تماس",
    open: "باز کردن",
    refresh: "تازه سازی",
    headline: "اینجا کپی کن. آنجا بردار.",
    subhead: "یک کلیپ بورد مشترک برای دستگاه های خودت.",
    placeholder: "متن را اینجا بگذار",
    inputLabel: "متن برای انعکاس",
    chars: (count) => `${new Intl.NumberFormat("fa-IR").format(count)} نویسه`,
    paste: "جایگذاری",
    clear: "پاک کردن",
    light: "روشن",
    dark: "تیره",
    pasted: "جایگذاری شد",
    clipboardEmpty: "کلیپ بورد خالی است",
    clipboardBlocked: "مرورگر اجازه جایگذاری نداد",
    qr: "QR",
    reflect: "انعکاس",
    reflecting: "در حال انعکاس",
    reflected: "منعکس شد",
    loading: "در حال بارگذاری...",
    history: "تاریخچه",
    deleteAll: "حذف همه",
    emptyHistory: "هنوز تاریخچه ای وجود ندارد.",
    delete: "حذف",
    deleteItemLabel: "حذف مورد تاریخچه",
    deleted: "حذف شد",
    clearTitle: "تاریخچه حذف شود؟",
    clearBody: "همه متن های قبلی ذخیره شده روی هاست حذف می شوند.",
    clearConfirm: "حذف همه",
    historyCleared: "تاریخچه حذف شد",
    couldNotLoad: "بارگذاری انجام نشد",
    couldNotReflect: "انعکاس انجام نشد",
    couldNotDelete: "حذف انجام نشد",
    couldNotClear: "حذف تاریخچه انجام نشد",
    wentWrong: "مشکلی پیش آمد"
  }
};

function apiPath(path) {
  return `${BASE.replace(/\/$/, "")}${path}`;
}

function appPath(path = "") {
  return `${BASE}${path}`.replace(/\/{2,}/g, "/");
}

function prettyDate(value, lang) {
  if (!value) return "";
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function detectTextKind(text) {
  const trimmed = text.trim();
  const urlMatch = trimmed.match(/\b(https?:\/\/[^\s]+|www\.[^\s]+)/i);
  if (urlMatch) {
    const value = urlMatch[1].replace(/[),.;!?]+$/, "");
    return { type: "url", href: value.startsWith("http") ? value : `https://${value}` };
  }

  const phoneMatch = trimmed.match(/(?:\+?\d[\d\s().-]{6,}\d)/);
  const compactPhone = (phoneMatch?.[0] || "").replace(/[^\d+]/g, "");
  if (/^\+?\d{7,15}$/.test(compactPhone)) return { type: "phone", href: `tel:${compactPhone}` };

  return { type: "text" };
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function QRModal({ url, onClose, t }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 420, errorCorrectionLevel: "M" }).then(setQr);
  }, [url]);

  return (
    <div className="modalShade" onClick={onClose} role="presentation">
      <div className="qrModal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.qrTitle}>
        {qr && <img src={qr} alt={t.qrAlt} />}
        <p>{t.qrCaption}</p>
        <span>{url}</span>
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, cancelLabel, onConfirm, onClose }) {
  return (
    <div className="modalShade" onClick={onClose} role="presentation">
      <div className="confirmModal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <p>{body}</p>
        <div>
          <button className="softButton" onClick={onClose}>{cancelLabel}</button>
          <button className="dangerButton" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function TextActions({ text, t, compact = false }) {
  const [label, setLabel] = useState(t.copy);
  const kind = useMemo(() => detectTextKind(text || ""), [text]);

  useEffect(() => {
    setLabel(t.copy);
  }, [t]);

  async function copy() {
    try {
      await copyText(text);
      setLabel(t.copied);
      window.setTimeout(() => setLabel(t.copy), COPY_RESET_MS);
    } catch {
      setLabel(t.select);
    }
  }

  return (
    <div className={compact ? "miniActions" : "actions"}>
      {kind.type === "phone" && <a href={kind.href}>{t.call}</a>}
      {kind.type === "url" && <a href={kind.href} target="_blank" rel="noreferrer">{t.open}</a>}
      <button onClick={copy} disabled={!text}>{label}</button>
    </div>
  );
}

function useReflect() {
  const [state, setState] = useState({ loading: true, current: null, history: [] });

  async function load() {
    const res = await fetch(apiPath("/api/reflect.php"));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load");
    setState({ loading: false, current: data.current, history: data.history || [] });
    return data;
  }

  useEffect(() => {
    load().catch(() => setState({ loading: false, current: null, history: [] }));
  }, []);

  return { state, setState, load };
}

function HomeView({ lang, t, theme, setTheme }) {
  const { state, setState, load } = useReflect();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const textRef = useRef(null);
  const homeUrl = `${window.location.origin}${appPath()}`;

  async function paste() {
    setStatus("");
    try {
      const value = await navigator.clipboard.readText();
      setText(value);
      setStatus(value ? t.pasted : t.clipboardEmpty);
    } catch {
      const field = textRef.current;
      if (field) {
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
      }

      const pasted = document.execCommand?.("paste");
      if (pasted) {
        window.setTimeout(() => {
          if (textRef.current && textRef.current.value && textRef.current.value !== text) {
            setText(textRef.current.value);
            setStatus(t.pasted);
          }
        }, 50);
        return;
      }

      setStatus(t.clipboardBlocked);
    }
  }

  function clearText() {
    setText("");
    setStatus("");
    textRef.current?.focus();
  }

  async function reflect() {
    const value = text.trim();
    if (!value || saving) return;

    setSaving(true);
    setStatus("");
    try {
      const res = await fetch(apiPath("/api/reflect.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.couldNotReflect);
      setState({ loading: false, current: data.current, history: data.history || [] });
      setText("");
      setStatus(t.reflected);
    } catch (error) {
      setStatus(error.message || t.wentWrong);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    setStatus("");
    try {
      const res = await fetch(apiPath(`/api/reflect-item.php?id=${encodeURIComponent(id)}`), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.couldNotDelete);
      setState({ loading: false, current: data.current, history: data.history || [] });
      setStatus(t.deleted);
    } catch (error) {
      setStatus(error.message || t.wentWrong);
    }
  }

  async function clearHistory() {
    setConfirmClear(false);
    setStatus("");
    try {
      const res = await fetch(apiPath("/api/reflect.php"), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.couldNotClear);
      setState({ loading: false, current: data.current, history: data.history || [] });
      setStatus(t.historyCleared);
    } catch (error) {
      setStatus(error.message || t.wentWrong);
    }
  }

  return (
    <main className="stage" lang={t.lang} dir={t.dir}>
      <section className="panel">
        <header className="mast">
          <div>
            <span className="mark"><img src="/android-chrome-192x192.png" alt="" /></span>
            <h1>Teleclip</h1>
          </div>
          <div className="topActions">
            <button className="ghostButton" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? t.light : t.dark}
            </button>
            <button className="ghostButton" onClick={() => load()}>{t.refresh}</button>
          </div>
        </header>

        <div className="heroCopy">
          <p>{t.headline}</p>
          <span>{t.subhead}</span>
        </div>

        <textarea
          ref={textRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t.placeholder}
          aria-label={t.inputLabel}
        />

        <div className="commandRow">
          <span>{t.chars(text.length)}</span>
          <div>
            <button className="softButton" onClick={paste}>{t.paste}</button>
            <button className="softButton" onClick={clearText} disabled={!text}>{t.clear}</button>
            <button className="softButton" onClick={() => setShowQr(true)}>{t.qr}</button>
            <button className="reflectButton" onClick={reflect} disabled={!text.trim() || saving}>
              {saving ? t.reflecting : t.reflect}
            </button>
          </div>
        </div>

        {status && <p className="status">{status}</p>}

        <HistoryList
          history={state.history}
          lang={lang}
          t={t}
          onRefresh={load}
          onDelete={deleteItem}
          onClear={() => setConfirmClear(true)}
        />
      </section>

      {showQr && <QRModal url={homeUrl} t={t} onClose={() => setShowQr(false)} />}
      {confirmClear && (
        <ConfirmModal
          title={t.clearTitle}
          body={t.clearBody}
          confirmLabel={t.clearConfirm}
          cancelLabel={t.cancel}
          onConfirm={clearHistory}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </main>
  );
}

function HistoryList({ history, lang, t, onRefresh, onDelete, onClear }) {
  return (
    <section className="history">
      <div className="historyHead">
        <span className="eyebrow">{t.history}</span>
        <div>
          <button className="iconButton" onClick={() => onRefresh?.()}>{t.refresh}</button>
          <button className="iconButton dangerText" onClick={() => onClear?.()} disabled={history.length === 0}>{t.deleteAll}</button>
        </div>
      </div>

      <div className="historyList">
        {history.length === 0 && <p className="empty">{stateText(t)}</p>}
        {history.map((item) => (
          <article className="historyItem" key={item.id}>
            <div>
              <time>{prettyDate(item.createdAt, lang)}</time>
              <p>{item.text}</p>
            </div>
            <div className="historyTools">
              <TextActions text={item.text} t={t} compact />
              <button className="deleteButton" onClick={() => onDelete?.(item.id)} aria-label={t.deleteItemLabel}>{t.delete}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function stateText(t) {
  return t.emptyHistory;
}

function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("teleclip-lang") || "en");
  const [theme, setTheme] = useState(() => localStorage.getItem("teleclip-theme") || "light");
  const t = UI[lang] || UI.en;
  const path = window.location.pathname;
  const basePath = BASE.replace(/\/$/, "");
  const relativePath = path.startsWith(basePath) ? path.slice(basePath.length) : path;

  useEffect(() => {
    if (relativePath.replace(/\/$/, "") === "/reflect") {
      window.history.replaceState(null, "", appPath());
    }
  }, [relativePath]);

  useEffect(() => {
    document.documentElement.lang = t.lang;
    document.documentElement.dir = t.dir;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#061817" : "#00D5A7");
    localStorage.setItem("teleclip-lang", lang);
    localStorage.setItem("teleclip-theme", theme);
  }, [lang, t, theme]);

  return (
    <div className="appFrame" data-lang={lang}>
      <button
        className="langSwitch"
        onClick={() => setLang(lang === "fa" ? "en" : "fa")}
        aria-label={lang === "fa" ? "Switch to English" : "تغییر به فارسی"}
      >
        <span>{t.switchLabel}</span>
      </button>
      <HomeView lang={lang} t={t} theme={theme} setTheme={setTheme} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
