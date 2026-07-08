import { type Invite, inviteUsable } from "./db.js";
import { esc } from "./render.js";

/**
 * Authed admin page for upload-only invite links: create (with optional
 * expiry), copy, and revoke. The links themselves are public — anyone who
 * has one can contribute moments (but never view the timeline).
 */
export function invitesPage(invites: Invite[], baseUrl: string): string {
  const rows = invites
    .map((inv) => {
      const url = `${baseUrl}/contribute/${inv.token}`;
      const status = !inviteUsable(inv)
        ? `<span class="status dead">${inv.revoked ? "revoked" : "expired"}</span>`
        : inv.expires_at
          ? `<span class="status">expires ${inv.expires_at.slice(0, 10)}</span>`
          : `<span class="status">never expires</span>`;
      const actions = inviteUsable(inv)
        ? `<button class="chip" data-copy="${esc(url)}" type="button">Copy link</button>
           <button class="chip danger" data-revoke="${inv.id}" type="button">Revoke</button>`
        : "";
      return `<article class="invite">
        <header><strong>${esc(inv.label)}</strong> ${status}</header>
        <code>${esc(url)}</code>
        <div class="actions">${actions}</div>
      </article>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Invite links — Family Memories</title>
  <style>
    :root { --fg:#1c1917; --muted:#78716c; --bg:#faf9f7; --card:#ffffff; --line:#e7e5e4; --accent:#b45309; }
    @media (prefers-color-scheme: dark) {
      :root { --fg:#e7e5e4; --muted:#a8a29e; --bg:#1c1917; --card:#292524; --line:#44403c; --accent:#fbbf24; }
    }
    * { box-sizing:border-box; }
    body { font-family:ui-sans-serif,system-ui,sans-serif; background:var(--bg); color:var(--fg); margin:0; padding:2rem 1rem 4rem; }
    main { max-width:32rem; margin:0 auto; }
    nav { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:0.5rem; }
    nav h1 { font-size:1.2rem; margin:0; }
    nav a { color:var(--accent); text-decoration:none; font-weight:600; }
    .hint { color:var(--muted); font-size:0.9rem; margin:0 0 1.5rem; }
    form { display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    input, select { font:inherit; color:inherit; background:var(--card); border:1.5px solid var(--line); border-radius:10px; padding:0.6rem 0.75rem; }
    input { flex:1; min-width:10rem; }
    button.primary { color:#fff; background:var(--accent); border:none; border-radius:10px; padding:0.6rem 1.1rem; font-weight:700; cursor:pointer; }
    .invite { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:1rem; margin-bottom:0.75rem; }
    .invite header { display:flex; gap:0.75rem; align-items:baseline; margin-bottom:0.5rem; }
    .status { color:var(--muted); font-size:0.8rem; }
    .status.dead { color:#dc2626; font-weight:600; }
    code { display:block; font-size:0.75rem; color:var(--muted); word-break:break-all; margin-bottom:0.6rem; }
    .actions { display:flex; gap:0.5rem; }
    .chip { border:1.5px solid var(--line); background:var(--bg); color:var(--fg); border-radius:999px; padding:0.35rem 0.9rem; font-size:0.85rem; cursor:pointer; }
    .chip.danger { color:#dc2626; border-color:#dc2626; }
    #toast { position:fixed; left:50%; bottom:2rem; transform:translateX(-50%); background:var(--fg); color:var(--bg);
             padding:0.75rem 1.25rem; border-radius:999px; font-weight:600; opacity:0; transition:opacity 0.3s; pointer-events:none; }
    #toast.show { opacity:1; }
  </style>
</head>
<body>
<main>
  <nav><h1>Invite links</h1><a href="/">Timeline →</a></nav>
  <p class="hint">Send one of these to grandparents or friends — they can add photos, videos, voice memos, and stories without an account. They can never see the timeline.</p>
  <form id="createForm">
    <input type="text" id="label" placeholder="Who's it for? e.g. Grandma" required>
    <select id="expiry">
      <option value="">Never expires</option>
      <option value="7">7 days</option>
      <option value="30">30 days</option>
    </select>
    <button class="primary" type="submit">Create link</button>
  </form>
  ${rows || '<p class="hint">No invite links yet.</p>'}
</main>
<div id="toast"></div>
<script>
(() => {
  const toast = (msg) => {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2500);
  };
  document.getElementById("createForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: document.getElementById("label").value.trim(),
        expires_days: document.getElementById("expiry").value || null,
      }),
    });
    if (res.ok) location.reload(); else toast("Couldn't create link");
  });
  document.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      await navigator.clipboard.writeText(b.dataset.copy);
      toast("Link copied 📋");
    }),
  );
  document.querySelectorAll("[data-revoke]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Revoke this link? Anyone holding it loses access.")) return;
      const res = await fetch("/api/invites/" + b.dataset.revoke + "/revoke", { method: "POST" });
      if (res.ok) location.reload(); else toast("Couldn't revoke");
    }),
  );
})();
</script>
</body>
</html>`;
}

/** Friendly dead-end for revoked/expired/unknown invite links. */
export function inviteGonePage(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link no longer active</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#faf9f7;color:#1c1917}
@media (prefers-color-scheme:dark){body{background:#1c1917;color:#e7e5e4}} main{text-align:center;padding:2rem}</style></head>
<body><main><h1>🕰️</h1><h2>This link is no longer active</h2><p>Ask the family for a fresh invite link.</p></main></body></html>`;
}
