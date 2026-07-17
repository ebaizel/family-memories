import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config, mediaDir } from "./config.js";
import { addKid, addMoment, findKidByName, listKids, type Kid, type MomentType } from "./db.js";
import { parseKidTags } from "./parse.js";
import { ageAt } from "./age.js";

// Minimal slice of Telegram's Update type — just the fields we use.
interface TgUpdate {
  message?: {
    message_id: number;
    from?: { first_name?: string; username?: string };
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: { file_id: string; width: number; height: number }[];
    voice?: { file_id: string };
    audio?: { file_id: string };
    video?: { file_id: string };
    video_note?: { file_id: string };
  };
}

const api = (method: string) => `https://api.telegram.org/bot${config.telegramToken}/${method}`;

async function reply(chatId: number, text: string): Promise<void> {
  if (!config.telegramToken) return;
  try {
    await fetch(api("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("telegram reply failed:", err);
  }
}

async function downloadFile(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(api("getFile"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const body = (await res.json()) as { ok: boolean; result?: { file_path: string } };
    if (!body.ok || !body.result) return null;
    const remotePath = body.result.file_path;
    const ext = path.extname(remotePath) || ".bin";
    const localName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const fileRes = await fetch(`https://api.telegram.org/file/bot${config.telegramToken}/${remotePath}`);
    if (!fileRes.ok) return null;
    const buf = Buffer.from(await fileRes.arrayBuffer());
    fs.writeFileSync(path.join(mediaDir(), localName), buf);
    return localName;
  } catch (err) {
    console.error("telegram file download failed:", err);
    return null;
  }
}

const HELP = [
  "I save your family's moments. Send me:",
  "• a quote — \"Maya: the moon is following our car\"",
  "• a photo, voice memo, or video (caption it \"Maya: ...\" to tag)",
  "• a note about anything worth remembering",
  "",
  "Commands:",
  "/addkid Maya 2023-04-12 — register a kid + birthday",
  "/kids — list registered kids",
].join("\n");

export async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const author = msg.from?.first_name ?? msg.from?.username ?? null;
  const text = msg.text?.trim();

  if (text?.startsWith("/")) {
    await handleCommand(chatId, text);
    return;
  }

  const allKids = listKids();
  const kidNames = allKids.map((k) => k.name);
  const rawText = text ?? msg.caption?.trim() ?? "";
  const { kidNames: taggedNames, text: cleanText } = parseKidTags(rawText, kidNames);
  const kids = taggedNames
    .map((n) => findKidByName(n))
    .filter((k): k is Kid => Boolean(k));

  let type: MomentType;
  let fileId: string | null = null;
  if (msg.photo?.length) {
    type = "photo";
    fileId = msg.photo[msg.photo.length - 1].file_id; // largest size is last
  } else if (msg.voice || msg.audio) {
    type = "audio";
    fileId = (msg.voice ?? msg.audio)!.file_id;
  } else if (msg.video || msg.video_note) {
    type = "video";
    fileId = (msg.video ?? msg.video_note)!.file_id;
  } else if (text) {
    // A tagged text message reads as a quote; untagged reads as a note.
    type = kids.length ? "quote" : "note";
  } else {
    await reply(chatId, "I can save text, photos, voice memos, and videos. Try /help");
    return;
  }

  const mediaFile = fileId ? await downloadFile(fileId) : null;
  if (fileId && !mediaFile) {
    await reply(chatId, "Hmm, I couldn't download that file — try sending it again?");
    return;
  }

  addMoment({
    type,
    text: cleanText || null,
    mediaFile,
    kidIds: kids.map((k) => k.id),
    author,
  });

  const icon = { quote: "💬", note: "📝", photo: "📷", audio: "🎙️", video: "🎬" }[type];
  if (kids.length) {
    const who = kids.map((k) => `${k.name} (${ageAt(k.birthdate, new Date())})`).join(", ");
    await reply(chatId, `Saved ${icon} — ${who}`);
  } else {
    const tip = kidNames.length
      ? ` Tip: start with "${kidNames[0]}:" (or "${kidNames.join(" + ")}:" for all) to tag.`
      : " Tip: register kids with /addkid so moments get tagged with their age.";
    await reply(chatId, `Saved ${icon}.${tip}`);
  }
}

async function handleCommand(chatId: number, text: string): Promise<void> {
  const [cmd, ...args] = text.split(/\s+/);
  switch (cmd.split("@")[0]) {
    case "/start":
    case "/help":
      await reply(chatId, HELP);
      return;
    case "/addkid": {
      const birthdate = args[args.length - 1];
      const name = args.slice(0, -1).join(" ");
      if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate ?? "")) {
        await reply(chatId, "Usage: /addkid Maya 2023-04-12");
        return;
      }
      if (findKidByName(name)) {
        await reply(chatId, `${name} is already registered.`);
        return;
      }
      const kid = addKid(name, birthdate);
      await reply(chatId, `Added ${kid.name} (${ageAt(kid.birthdate, new Date())}) 🎉`);
      return;
    }
    case "/kids": {
      const kids = listKids();
      await reply(
        chatId,
        kids.length
          ? kids.map((k) => `• ${k.name} — ${ageAt(k.birthdate, new Date())} (b. ${k.birthdate})`).join("\n")
          : "No kids registered yet. Use /addkid Maya 2023-04-12",
      );
      return;
    }
    default:
      await reply(chatId, "Unknown command. Try /help");
  }
}
