import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { basicAuth } from "hono/basic-auth";
import fs from "node:fs";
import path from "node:path";
import { config, mediaDir } from "./config.js";
import { recentMoments } from "./db.js";
import { timelinePage } from "./render.js";
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

// --- Family-facing pages, behind basic auth ---
if (config.sitePassword) {
  app.use("/*", basicAuth({ username: "family", password: config.sitePassword }));
}

app.get("/", (c) => c.html(timelinePage(recentMoments())));

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
