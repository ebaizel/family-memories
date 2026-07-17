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
  author: string | null;
  created_at: string; // ISO UTC
}

export interface MomentWithKids extends Moment {
  kids: Kid[]; // every kid tagged on this moment, oldest first
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
    kid_id INTEGER REFERENCES kids(id), -- legacy single-kid column; moment_kids is the source of truth
    author TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_moments_created ON moments(created_at DESC);
  CREATE TABLE IF NOT EXISTS moment_kids (
    moment_id INTEGER NOT NULL REFERENCES moments(id),
    kid_id INTEGER NOT NULL REFERENCES kids(id),
    PRIMARY KEY (moment_id, kid_id)
  );
`);

// Migrate any pre-multi-kid rows into the join table (idempotent).
db.exec(`
  INSERT OR IGNORE INTO moment_kids (moment_id, kid_id)
    SELECT id, kid_id FROM moments WHERE kid_id IS NOT NULL;
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

const insertMomentKids = db.transaction((momentId: number, kidIds: number[]) => {
  const stmt = db.prepare("INSERT OR IGNORE INTO moment_kids (moment_id, kid_id) VALUES (?, ?)");
  for (const kidId of kidIds) stmt.run(momentId, kidId);
});

export function addMoment(m: {
  type: MomentType;
  text?: string | null;
  mediaFile?: string | null;
  kidIds?: number[];
  author?: string | null;
}): Moment {
  const info = db
    .prepare("INSERT INTO moments (type, text, media_file, author) VALUES (?, ?, ?, ?)")
    .run(m.type, m.text ?? null, m.mediaFile ?? null, m.author ?? null);
  const id = Number(info.lastInsertRowid);
  if (m.kidIds?.length) insertMomentKids(id, m.kidIds);
  return db.prepare("SELECT * FROM moments WHERE id = ?").get(id) as Moment;
}

// json_group_array lets one query return each moment with all its tagged kids.
const KIDS_JSON = `(
  SELECT json_group_array(json_object('id', k.id, 'name', k.name, 'birthdate', k.birthdate))
  FROM (SELECT kid_id FROM moment_kids WHERE moment_id = m.id) mk
  JOIN kids k ON k.id = mk.kid_id
) AS kids_json`;

function withKids(rows: (Moment & { kids_json: string })[]): MomentWithKids[] {
  return rows.map(({ kids_json, ...m }) => {
    const kids = (JSON.parse(kids_json) as Kid[]).sort((a, b) => a.birthdate.localeCompare(b.birthdate));
    return { ...m, kids };
  });
}

export function recentMoments(limit = 200, kidId?: number): MomentWithKids[] {
  const where = kidId
    ? "WHERE EXISTS (SELECT 1 FROM moment_kids mk2 WHERE mk2.moment_id = m.id AND mk2.kid_id = ?)"
    : "";
  const params = kidId ? [kidId, limit] : [limit];
  return withKids(
    db
      .prepare(
        `SELECT m.*, ${KIDS_JSON} FROM moments m
         ${where}
         ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
      )
      .all(...params) as (Moment & { kids_json: string })[],
  );
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

export function momentsSince(isoDate: string): MomentWithKids[] {
  return withKids(
    db
      .prepare(
        `SELECT m.*, ${KIDS_JSON} FROM moments m
         WHERE m.created_at >= ?
         ORDER BY m.created_at ASC, m.id ASC`,
      )
      .all(isoDate) as (Moment & { kids_json: string })[],
  );
}
