import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const webPort = process.env.VITE_DEV_PORT || "18731";
const apiPort = process.env.DEV_API_PORT || "18732";
const basePath = process.env.BASE_PATH || "/";
const publicUrl = process.env.PUBLIC_URL || `http://127.0.0.1:${webPort}${basePath}`;

const processes = [
  spawn(process.execPath, ["server/index.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: apiPort,
      BASE_PATH: basePath,
      PUBLIC_URL: publicUrl,
      DATA_DIR: process.env.DATA_DIR || "./data-dev",
      TRUST_PROXY: "0"
    }
  }),
  spawn(process.execPath, [
    path.join(rootDir, "node_modules", "vite", "bin", "vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    webPort,
    "--strictPort"
  ], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_BASE_PATH: basePath === "/" ? "/" : `${basePath.replace(/\/$/, "")}/`,
      VITE_DEV_PORT: webPort,
      VITE_API_TARGET: `http://127.0.0.1:${apiPort}`
    }
  })
];

function stopAll(signal = "SIGTERM") {
  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }
}

process.on("SIGINT", () => {
  stopAll("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll("SIGTERM");
  process.exit(0);
});

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}
