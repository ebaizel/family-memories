import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config, mediaDir } from "./config.js";

export type MomentType = "quote" | "note" | "photo" | "video" | "audio";

export interface Kid {
  id: number;
  name: string;
  birthdate: string; // YYYY-MM-DD
}

export interface Moment {
  id: number;
  type: MomentType;
  text: string | null;
  media_file: string | null;
  kid_id: number | null;
  author: string | null;
  created_at: string; // ISO UTC
}

export interface MomentWithKid extends Moment {
  kid_name: string | null;
  kid_birthdate: string | null;
}

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(mediaDir(), { recursive: true });

const db = new Database(path.join(config.dataDir, "memories.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS kids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    birthdate TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS moments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    text TEXT,
    media_file TEXT,
    kid_id INTEGER REFERENCES kids(id),
    author TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_moments_created ON moments(created_at DESC);
`);

export function addKid(name: string, birthdate: string): Kid {
  const info = db.prepare("INSERT INTO kids (name, birthdate) VALUES (?, ?)").run(name, birthdate);
  return { id: Number(info.lastInsertRowid), name, birthdate };
}

export function listKids(): Kid[] {
  return db.prepare("SELECT * FROM kids ORDER BY birthdate").all() as Kid[];
}

export function findKidByName(name: string): Kid | undefined {
  return db.prepare("SELECT * FROM kids WHERE name = ? COLLATE NOCASE").get(name) as Kid | undefined;
}

export function addMoment(m: {
  type: MomentType;
  text?: string | null;
  mediaFile?: string | null;
  kidId?: number | null;
  author?: string | null;
}): Moment {
  const info = db
    .prepare("INSERT INTO moments (type, text, media_file, kid_id, author) VALUES (?, ?, ?, ?, ?)")
    .run(m.type, m.text ?? null, m.mediaFile ?? null, m.kidId ?? null, m.author ?? null);
  return db.prepare("SELECT * FROM moments WHERE id = ?").get(info.lastInsertRowid) as Moment;
}

export function recentMoments(limit = 200, kidId?: number): MomentWithKid[] {
  const where = kidId ? "WHERE m.kid_id = ?" : "";
  const params = kidId ? [kidId, limit] : [limit];
  return db
    .prepare(
      `SELECT m.*, k.name AS kid_name, k.birthdate AS kid_birthdate
       FROM moments m LEFT JOIN kids k ON k.id = m.kid_id
       ${where}
       ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    )
    .all(...params) as MomentWithKid[];
}

export function getKid(id: number): Kid | undefined {
  return db.prepare("SELECT * FROM kids WHERE id = ?").get(id) as Kid | undefined;
}

export function momentsSince(isoDate: string): MomentWithKid[] {
  return db
    .prepare(
      `SELECT m.*, k.name AS kid_name, k.birthdate AS kid_birthdate
       FROM moments m LEFT JOIN kids k ON k.id = m.kid_id
       WHERE m.created_at >= ?
       ORDER BY m.created_at ASC, m.id ASC`,
    )
    .all(isoDate) as MomentWithKid[];
}
