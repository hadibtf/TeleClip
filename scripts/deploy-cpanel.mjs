import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, "deploy.env");

function loadEnv(file) {
  if (!fs.existsSync(file)) {
    console.error("Missing deploy.env. Copy deploy.env.sample to deploy.env and fill it in.");
    process.exit(1);
  }

  const cfg = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.replace(/^\uFEFF/, "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    cfg[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return cfg;
}

function listFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full));
    else files.push(full);
  }
  return files;
}

function excluded(rel) {
  return rel === "api/config.php" || rel === "api/core.php";
}

function uploadFile(netrc, server, remoteDir, dist, file) {
  const rel = path.relative(dist, file).split(path.sep).join("/");
  const url = `ftp://${server}/${remoteDir.replace(/\/$/, "")}/${rel}`;
  return spawnSync("curl", [
    "-sS",
    "--ssl-reqd",
    "-k",
    "--ftp-create-dirs",
    "--retry",
    "2",
    "--retry-delay",
    "1",
    "--retry-all-errors",
    "--connect-timeout",
    "15",
    "--max-time",
    "90",
    "--netrc-file",
    netrc,
    "-T",
    file,
    url
  ], { encoding: "utf8" });
}

function run(label, command, args, options = {}) {
  console.log(`==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const env = loadEnv(ENV_FILE);
for (const key of ["FTP_SERVER", "FTP_USER", "FTP_PASSWORD", "FTP_REMOTE_DIR"]) {
  if (!env[key]) {
    console.error(`Missing ${key} in deploy.env`);
    process.exit(1);
  }
}

const buildDir = path.join(ROOT, ".teleclip-build", `deploy-${process.pid}-${Date.now()}`);

run("Building Teleclip", "npm", ["run", "build"], {
  env: {
    ...process.env,
    VITE_BASE_PATH: env.VITE_BASE_PATH || "/",
    VITE_OUT_DIR: buildDir
  }
});

const netrc = path.join(os.tmpdir(), `teleclip_ftp_${process.pid}.netrc`);
fs.writeFileSync(netrc, `machine ${env.FTP_SERVER} login ${env.FTP_USER} password ${env.FTP_PASSWORD}\n`, { mode: 0o600 });
process.on("exit", () => {
  try {
    fs.unlinkSync(netrc);
  } catch {}
});

const dist = buildDir;
let uploaded = 0;
let failed = 0;

console.log(`==> Uploading build to ${env.FTP_REMOTE_DIR}`);
for (const file of listFiles(dist)) {
  const rel = path.relative(dist, file).split(path.sep).join("/");
  if (excluded(rel)) continue;
  const result = uploadFile(netrc, env.FTP_SERVER, env.FTP_REMOTE_DIR, dist, file);

  if (result.status === 0) {
    uploaded += 1;
    process.stdout.write(".");
  } else {
    failed += 1;
    process.stdout.write(`\nFAILED: ${rel}\n${result.stderr || result.error || ""}\n`);
  }
}

process.stdout.write(`\nUploaded ${uploaded}, failed ${failed}\n`);
try {
  fs.rmSync(path.join(ROOT, ".teleclip-build"), { recursive: true, force: true });
} catch {}
process.exit(failed === 0 ? 0 : 1);
