import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { config } from "./config.js";
import { createRateLimiter } from "./rateLimit.js";
import { FileClipboardStore } from "./store/fileStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const app = express();
const store = new FileClipboardStore({ dataDir: config.dataDir, ttlSeconds: config.clipTtlSeconds });
const apiBase = `${config.basePath}/api`;

await store.init();
setInterval(() => store.cleanupExpired(), 60_000).unref();

if (config.trustProxy) app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.post(`${apiBase}/create`, createRateLimiter({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
}), async (req, res) => {
  const rawText = typeof req.body?.text === "string" ? req.body.text : "";
  const text = rawText.trim();

  if (!text) return res.status(400).json({ error: "Text is required." });
  const item = await store.create(text);
  const url = `${config.publicUrl}/c/${item.id}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 360,
    errorCorrectionLevel: "M"
  });

  res.status(201).json({
    id: item.id,
    url,
    qrDataUrl,
    preview: item.text,
    expiresAt: item.expiresAt
  });
});

app.get(`${apiBase}/reflect`, async (_req, res) => {
  const state = await readReflectState();
  res.json(state);
});

app.post(`${apiBase}/reflect`, createRateLimiter({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
}), async (req, res) => {
  const rawText = typeof req.body?.text === "string" ? req.body.text : "";
  const text = rawText.trim();

  if (!text) return res.status(400).json({ error: "Text is required." });
  const state = await readReflectState();
  const item = {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString()
  };
  const history = [item, ...(state.history || [])]
    .filter(Boolean)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.id === entry.id) === index)
    .slice(0, 80);
  const next = { current: item, history };
  await writeReflectState(next);
  res.status(201).json(next);
});

app.delete(`${apiBase}/reflect`, createRateLimiter({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
}), async (_req, res) => {
  const next = { current: null, history: [] };
  await writeReflectState(next);
  res.json(next);
});

app.delete(`${apiBase}/reflect/:id`, createRateLimiter({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
}), async (req, res) => {
  const state = await readReflectState();
  const history = (state.history || []).filter((item) => item.id !== req.params.id);
  const current = state.current?.id === req.params.id ? history[0] || null : state.current || null;
  const next = { current, history };
  await writeReflectState(next);
  res.json(next);
});

app.get(`${apiBase}/clipboard/:id`, async (req, res) => {
  const item = await store.get(req.params.id);
  if (!item) return res.status(404).json({ error: "This clip expired or does not exist." });

  res.json({
    id: item.id,
    text: item.text,
    expiresAt: item.expiresAt
  });
});

app.use(config.basePath || "/", express.static(distDir, {
  index: false,
  etag: true,
  maxAge: "1h"
}));

app.get([config.basePath || "/", `${config.basePath}/c/:id`], (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.get("/", (_req, res) => {
  if (config.basePath) return res.redirect(config.basePath);
  res.sendFile(path.join(distDir, "index.html"));
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(config.port, () => {
  console.log(`Teleclip listening on ${config.port}`);
});

async function readReflectState() {
  const fs = await import("node:fs/promises");
  const file = path.join(config.dataDir, "reflect.json");
  try {
    const state = JSON.parse(await fs.readFile(file, "utf8"));
    const currentId = state.current?.id;
    const history = (state.history || []).filter((item) => item.id !== currentId);
    if (state.current) history.unshift(state.current);
    return {
      current: state.current || null,
      history: history.slice(0, 80)
    };
  } catch {
    return { current: null, history: [] };
  }
}

async function writeReflectState(state) {
  const fs = await import("node:fs/promises");
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(path.join(config.dataDir, "reflect.json"), JSON.stringify(state), { mode: 0o600 });
}
