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

export function updateKid(id: number, name: string, birthdate: string): void {
  db.prepare("UPDATE kids SET name = ?, birthdate = ? WHERE id = ?").run(name, birthdate, id);
}

// --- Invites: upload-only share links for family & friends ---

export interface Invite {
  id: number;
  token: string;
  label: string;
  created_at: string;
  expires_at: string | null; // ISO UTC or null = never
  revoked: number; // 0 | 1
}

db.exec(`
  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    expires_at TEXT,
    revoked INTEGER NOT NULL DEFAULT 0
  );
`);

export function createInvite(token: string, label: string, expiresAt: string | null): Invite {
  const info = db
    .prepare("INSERT INTO invites (token, label, expires_at) VALUES (?, ?, ?)")
    .run(token, label, expiresAt);
  return db.prepare("SELECT * FROM invites WHERE id = ?").get(info.lastInsertRowid) as Invite;
}

export function listInvites(): Invite[] {
  return db.prepare("SELECT * FROM invites ORDER BY created_at DESC").all() as Invite[];
}

export function findInvite(token: string): Invite | undefined {
  return db.prepare("SELECT * FROM invites WHERE token = ?").get(token) as Invite | undefined;
}

export function revokeInvite(id: number): void {
  db.prepare("UPDATE invites SET revoked = 1 WHERE id = ?").run(id);
}

/** An invite works if it hasn't been revoked and hasn't expired. */
export function inviteUsable(inv: Invite, now: Date = new Date()): boolean {
  if (inv.revoked) return false;
  if (inv.expires_at && new Date(inv.expires_at) <= now) return false;
  return true;
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
