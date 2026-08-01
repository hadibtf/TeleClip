import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

const ID_ALPHABET = /^[A-Za-z0-9_-]{12,32}$/;

export class FileClipboardStore {
  constructor({ dataDir, ttlSeconds }) {
    this.itemsDir = path.join(dataDir, "clipboards");
    this.ttlMs = ttlSeconds * 1000;
  }

  async init() {
    await fs.mkdir(this.itemsDir, { recursive: true });
    await this.cleanupExpired();
  }

  async create(text) {
    const now = Date.now();
    const item = {
      id: nanoid(16),
      text,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.ttlMs).toISOString()
    };
    await fs.writeFile(this.filePath(item.id), JSON.stringify(item), { flag: "wx", mode: 0o600 });
    return item;
  }

  async get(id) {
    if (!ID_ALPHABET.test(id)) return null;

    try {
      const raw = await fs.readFile(this.filePath(id), "utf8");
      const item = JSON.parse(raw);
      if (new Date(item.expiresAt).getTime() <= Date.now()) {
        await this.delete(id);
        return null;
      }
      return item;
    } catch {
      return null;
    }
  }

  async delete(id) {
    if (!ID_ALPHABET.test(id)) return;
    await fs.rm(this.filePath(id), { force: true });
  }

  async cleanupExpired() {
    let names = [];
    try {
      names = await fs.readdir(this.itemsDir);
    } catch {
      return;
    }

    await Promise.all(names.map(async (name) => {
      const id = path.basename(name, ".json");
      if (!ID_ALPHABET.test(id)) return;
      const item = await this.get(id);
      if (!item) await this.delete(id);
    }));
  }

  filePath(id) {
    return path.join(this.itemsDir, `${id}.json`);
  }
}
