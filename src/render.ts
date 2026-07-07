import { type MomentWithKid } from "./db.js";
import { ageAt } from "./age.js";

const ICONS: Record<string, string> = {
  quote: "💬",
  note: "📝",
  photo: "📷",
  audio: "🎙️",
  video: "🎬",
};

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function mediaTag(m: MomentWithKid): string {
  if (!m.media_file) return "";
  const src = `/media/${encodeURIComponent(m.media_file)}`;
  if (m.type === "photo") return `<img src="${src}" alt="" loading="lazy">`;
  if (m.type === "audio") return `<audio controls src="${src}"></audio>`;
  if (m.type === "video") return `<video controls preload="metadata" src="${src}"></video>`;
  return "";
}

function momentCard(m: MomentWithKid): string {
  const when = new Date(m.created_at + (m.created_at.endsWith("Z") ? "" : "Z"));
  const who = m.kid_name
    ? `<span class="kid">${esc(m.kid_name)}</span> <span class="age">${ageAt(m.kid_birthdate!, when)}</span>`
    : "";
  const body =
    m.type === "quote" && m.text
      ? `<blockquote>“${esc(m.text)}”</blockquote>`
      : m.text
        ? `<p>${esc(m.text)}</p>`
        : "";
  const author = m.author ? `<span class="author">added by ${esc(m.author)}</span>` : "";
  return `<article class="moment">
    <header>${ICONS[m.type] ?? ""} ${who} <time datetime="${esc(m.created_at)}">${when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></header>
    ${body}
    ${mediaTag(m)}
    <footer>${author}</footer>
  </article>`;
}

const STYLE = `
  :root { --fg: #1c1917; --muted: #78716c; --bg: #faf9f7; --card: #ffffff; --line: #e7e5e4; --accent: #b45309; }
  @media (prefers-color-scheme: dark) {
    :root { --fg: #e7e5e4; --muted: #a8a29e; --bg: #1c1917; --card: #292524; --line: #44403c; --accent: #fbbf24; }
  }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 0; padding: 2rem 1rem 4rem; }
  main { max-width: 40rem; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 1.5rem; }
  .moment { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
  .moment header { font-size: 0.85rem; color: var(--muted); display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
  .moment header .kid { font-weight: 600; color: var(--fg); }
  .moment header .age { color: var(--accent); font-weight: 600; }
  .moment header time { margin-left: auto; }
  blockquote { font-size: 1.15rem; line-height: 1.5; margin: 0.6rem 0 0.2rem; font-style: italic; }
  p { margin: 0.6rem 0 0.2rem; line-height: 1.5; }
  img, video { max-width: 100%; border-radius: 8px; margin-top: 0.75rem; display: block; }
  audio { width: 100%; margin-top: 0.75rem; }
  footer { font-size: 0.75rem; color: var(--muted); margin-top: 0.5rem; }
  .empty { color: var(--muted); text-align: center; padding: 3rem 0; }
`;

export function timelinePage(moments: MomentWithKid[]): string {
  const cards = moments.length
    ? moments.map(momentCard).join("\n")
    : `<p class="empty">No moments yet — message the bot to save your first one.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Family Memories</title>
  <style>${STYLE}</style>
</head>
<body>
  <main>
    <h1>Family Memories</h1>
    ${cards}
  </main>
</body>
</html>`;
}

/** Simple self-contained HTML for the weekly digest email. */
export function digestHtml(moments: MomentWithKid[], since: Date): string {
  const items = moments
    .map((m) => {
      const when = new Date(m.created_at + (m.created_at.endsWith("Z") ? "" : "Z"));
      const who = m.kid_name ? `<strong>${esc(m.kid_name)}</strong> (${ageAt(m.kid_birthdate!, when)}) — ` : "";
      const text = m.text ? esc(m.text) : `[${m.type}]`;
      return `<li style="margin-bottom:12px">${ICONS[m.type] ?? ""} ${who}${text}</li>`;
    })
    .join("\n");
  return `<div style="font-family:sans-serif;max-width:600px">
    <h2>This week's moments</h2>
    <p style="color:#666">Since ${since.toDateString()} — ${moments.length} moment${moments.length === 1 ? "" : "s"}</p>
    <ul style="list-style:none;padding:0">${items || "<li>No moments captured this week.</li>"}</ul>
  </div>`;
}
