import { type Kid } from "./db.js";
import { esc } from "./render.js";
import { ageAt } from "./age.js";

/**
 * Authed page for managing the kids: add each child with name + birthday,
 * fix typos later. Ages everywhere in the app are computed from these
 * birthdates at each moment's capture time.
 */
export function kidsPage(kids: Kid[]): string {
  const rows = kids
    .map(
      (k) => `<article class="kid" data-id="${k.id}">
        <div class="info">
          <strong>${esc(k.name)}</strong>
          <span class="age">${ageAt(k.birthdate, new Date())}</span>
          <span class="bday">born ${esc(k.birthdate)}</span>
        </div>
        <button class="chip" data-edit="${k.id}" data-name="${esc(k.name)}" data-birthdate="${esc(k.birthdate)}" type="button">Edit</button>
      </article>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Kids — Family Memories</title>
  <style>
    :root { --fg:#1c1917; --muted:#78716c; --bg:#faf9f7; --card:#ffffff; --line:#e7e5e4; --accent:#b45309; }
    @media (prefers-color-scheme: dark) {
      :root { --fg:#e7e5e4; --muted:#a8a29e; --bg:#1c1917; --card:#292524; --line:#44403c; --accent:#fbbf24; }
    }
    * { box-sizing:border-box; }
    body { font-family:ui-sans-serif,system-ui,sans-serif; background:var(--bg); color:var(--fg); margin:0; padding:2rem 1rem 4rem; }
    main { max-width:28rem; margin:0 auto; }
    nav { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:0.5rem; }
    nav h1 { font-size:1.2rem; margin:0; }
    nav a { color:var(--accent); text-decoration:none; font-weight:600; }
    .hint { color:var(--muted); font-size:0.9rem; margin:0 0 1.5rem; }
    form { display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    input { font:inherit; color:inherit; background:var(--card); border:1.5px solid var(--line); border-radius:10px; padding:0.6rem 0.75rem; }
    #name { flex:1; min-width:8rem; }
    button.primary { color:#fff; background:var(--accent); border:none; border-radius:10px; padding:0.6rem 1.1rem; font-weight:700; cursor:pointer; }
    .kid { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:1rem; margin-bottom:0.75rem;
           display:flex; align-items:center; justify-content:space-between; gap:0.75rem; }
    .info { display:flex; gap:0.6rem; align-items:baseline; flex-wrap:wrap; }
    .age { color:var(--accent); font-weight:600; }
    .bday { color:var(--muted); font-size:0.85rem; }
    .chip { border:1.5px solid var(--line); background:var(--bg); color:var(--fg); border-radius:999px; padding:0.35rem 0.9rem; font-size:0.85rem; cursor:pointer; }
    #toast { position:fixed; left:50%; bottom:2rem; transform:translateX(-50%); background:var(--fg); color:var(--bg);
             padding:0.75rem 1.25rem; border-radius:999px; font-weight:600; opacity:0; transition:opacity 0.3s; pointer-events:none; }
    #toast.show { opacity:1; }
  </style>
</head>
<body>
<main>
  <nav><h1>Kids</h1><a href="/">Timeline →</a></nav>
  <p class="hint">Add each child with their birthday — every moment gets tagged with their exact age at the time ("2y 4mo"), which is what makes it precious later.</p>
  <form id="addForm">
    <input type="text" id="name" placeholder="Name" required>
    <input type="date" id="birthdate" required>
    <button class="primary" type="submit">Add</button>
  </form>
  ${rows || '<p class="hint">No kids yet — add your first above.</p>'}
</main>
<div id="toast"></div>
<script>
(() => {
  const toast = (msg) => {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2500);
  };
  const post = async (url, data) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) location.reload(); else toast(await res.text());
  };
  document.getElementById("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    post("/api/kids", {
      name: document.getElementById("name").value.trim(),
      birthdate: document.getElementById("birthdate").value,
    });
  });
  document.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      const name = prompt("Name:", b.dataset.name);
      if (name === null) return;
      const birthdate = prompt("Birthday (YYYY-MM-DD):", b.dataset.birthdate);
      if (birthdate === null) return;
      post("/api/kids/" + b.dataset.edit, { name: name.trim(), birthdate: birthdate.trim() });
    }),
  );
})();
</script>
</body>
</html>`;
}
