import path from "node:path";

const basePath = process.env.BASE_PATH || "/teleclip";

export const config = {
  port: Number(process.env.PORT || 3000),
  basePath: basePath === "/" ? "" : basePath.replace(/\/$/, ""),
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}${basePath}`).replace(/\/$/, ""),
  dataDir: path.resolve(process.env.DATA_DIR || "./data"),
  clipTtlSeconds: Number(process.env.CLIP_TTL_SECONDS || 600),
  maxTextLength: Number(process.env.MAX_TEXT_LENGTH || 10000),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 30),
  trustProxy: process.env.TRUST_PROXY === "1"
};
