import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { basicAuth } from "hono/basic-auth";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config, mediaDir } from "./config.js";
import { addMoment, getKid, listKids, recentMoments, type MomentType } from "./db.js";
import { timelinePage } from "./render.js";
import { capturePage } from "./capture.js";
import { ageAt } from "./age.js";
import { handleUpdate } from "./telegram.js";
import { buildWeeklyDigest, sendWeeklyDigest } from "./digest.js";

const app = new Hono();

// --- Telegram webhook (secret path segment gates who can post) ---
app.post("/webhook/:secret", async (c) => {
  if (!config.webhookSecret || c.req.param("secret") !== config.webhookSecret) {
    return c.text("forbidden", 403);
  }
  const update = await c.req.json().catch(() => null);
  if (update) await handleUpdate(update);
  // Always 200 so Telegram doesn't retry forever on our bugs.
  return c.json({ ok: true });
});

// --- Digest cron endpoint (same secret) ---
app.post("/digest/send/:secret", async (c) => {
  if (!config.webhookSecret || c.req.param("secret") !== config.webhookSecret) {
    return c.text("forbidden", 403);
  }
  const result = await sendWeeklyDigest();
  return c.json(result);
});

// --- PWA assets (nothing private in these; served without auth so
// installability and icon fetches never hit an auth wall) ---
const pub = (name: string, type: string) => {
  const file = path.join("public", path.basename(name));
  return fs.existsSync(file)
    ? { body: fs.readFileSync(file), type }
    : null;
};
app.get("/manifest.webmanifest", (c) => {
  const f = pub("manifest.webmanifest", "application/manifest+json");
  return f ? c.body(f.body, 200, { "content-type": f.type }) : c.notFound();
});
app.get("/sw.js", (c) => {
  const f = pub("sw.js", "text/javascript");
  return f ? c.body(f.body, 200, { "content-type": f.type }) : c.notFound();
});
app.get("/icons/:file", (c) => {
  const file = path.join("public/icons", path.basename(c.req.param("file")));
  if (!fs.existsSync(file)) return c.notFound();
  return c.body(fs.readFileSync(file), 200, {
    "content-type": "image/png",
    "cache-control": "public, max-age=86400",
  });
});

// --- Family-facing pages, behind basic auth ---
if (config.sitePassword) {
  app.use("/*", basicAuth({ username: "family", password: config.sitePassword }));
}

app.get("/", (c) => {
  const kidParam = Number(c.req.query("kid"));
  const kidId = Number.isInteger(kidParam) && kidParam > 0 ? kidParam : undefined;
  return c.html(timelinePage(recentMoments(200, kidId), listKids(), kidId));
});

app.get("/capture", (c) => c.html(capturePage(listKids())));

const MEDIA_EXT: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic",
  "audio/mp4": ".m4a", "audio/webm": ".webm", "audio/mpeg": ".mp3", "audio/ogg": ".ogg",
  "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
};

app.post("/api/moments", async (c) => {
  const body = await c.req.parseBody();
  const type = String(body.type ?? "");
  if (!["quote", "note", "photo", "audio", "video"].includes(type)) {
    return c.text("invalid type", 400);
  }
  const text = String(body.text ?? "").trim() || null;
  const author = String(body.author ?? "").trim() || null;
  const kidIdRaw = Number(body.kid_id);
  const kid = Number.isInteger(kidIdRaw) && kidIdRaw > 0 ? getKid(kidIdRaw) : undefined;

  let mediaFile: string | null = null;
  const file = body.file;
  if (file instanceof File) {
    const ext = MEDIA_EXT[file.type] ?? (path.extname(file.name) || ".bin");
    mediaFile = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(mediaDir(), mediaFile), Buffer.from(await file.arrayBuffer()));
  }
  if (["photo", "audio", "video"].includes(type) && !mediaFile) {
    return c.text("missing file", 400);
  }
  if (!mediaFile && !text) return c.text("empty moment", 400);

  const moment = addMoment({
    // Text sent as "quote" but untagged still reads better as a quote; keep the client's word.
    type: type as MomentType,
    text,
    mediaFile,
    kidId: kid?.id ?? null,
    author,
  });
  return c.json({
    id: moment.id,
    kid_name: kid?.name ?? null,
    age: kid ? ageAt(kid.birthdate, new Date()) : null,
  });
});

app.get("/digest/preview", (c) => c.html(buildWeeklyDigest().html));

app.get("/media/:file", (c) => {
  const name = path.basename(c.req.param("file")); // basename() blocks traversal
  const filePath = path.join(mediaDir(), name);
  if (!fs.existsSync(filePath)) return c.text("not found", 404);
  const ext = path.extname(name).toLowerCase();
  const types: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
    ".oga": "audio/ogg", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
    ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
  };
  return c.body(fs.readFileSync(filePath), 200, {
    "content-type": types[ext] ?? "application/octet-stream",
    "cache-control": "private, max-age=31536000",
  });
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`family-memories listening on :${info.port}`);
  if (!config.telegramToken) console.warn("TELEGRAM_BOT_TOKEN not set — bot replies/downloads disabled");
  if (!config.webhookSecret) console.warn("WEBHOOK_SECRET not set — webhook endpoint disabled");
  if (!config.sitePassword) console.warn("SITE_PASSWORD not set — timeline is unprotected");
});
