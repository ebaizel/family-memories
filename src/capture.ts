import { type Kid } from "./db.js";
import { esc } from "./render.js";

export interface ContributorMode {
  token: string;
  label: string; // who the invite was made for, e.g. "Grandma"
}

/**
 * The capture screen: big one-tap buttons for Quote / Photo / Video / Voice,
 * kid chips for tagging, in-browser voice recording via MediaRecorder,
 * native camera/library pickers for photo and video. Designed phone-first.
 *
 * Two modes: the family's own screen (authed, posts to /api/moments,
 * installable as a PWA) and contributor mode (public invite link, posts to
 * /api/contribute/:token, requires the contributor's name, no PWA chrome).
 */
export function capturePage(kids: Kid[], contributor?: ContributorMode): string {
  const kidChips = kids
    .map((k) => `<button class="chip kid-chip" data-kid="${k.id}" type="button">${esc(k.name)}</button>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  ${contributor ? "" : `<link rel="manifest" href="/manifest.webmanifest">`}
  <link rel="apple-touch-icon" href="/icons/icon-180.png">
  <title>${contributor ? "Share a moment — Family Memories" : "Capture — Family Memories"}</title>
  <style>
    :root { --fg:#1c1917; --muted:#78716c; --bg:#faf9f7; --card:#ffffff; --line:#e7e5e4; --accent:#b45309; --accent-soft:#fef3c7; }
    @media (prefers-color-scheme: dark) {
      :root { --fg:#e7e5e4; --muted:#a8a29e; --bg:#1c1917; --card:#292524; --line:#44403c; --accent:#fbbf24; --accent-soft:#44320a; }
    }
    * { box-sizing:border-box; }
    body { font-family:ui-sans-serif,system-ui,sans-serif; background:var(--bg); color:var(--fg); margin:0;
           padding:max(1rem, env(safe-area-inset-top)) 1rem calc(2rem + env(safe-area-inset-bottom)); }
    main { max-width:28rem; margin:0 auto; }
    nav { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:1.25rem; }
    nav h1 { font-size:1.2rem; margin:0; }
    nav a { color:var(--accent); text-decoration:none; font-weight:600; font-size:0.95rem; }
    .label { font-size:0.8rem; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin:1.25rem 0 0.5rem; }
    .chips { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .chip { border:1.5px solid var(--line); background:var(--card); color:var(--fg); border-radius:999px;
            padding:0.5rem 1rem; font-size:1rem; cursor:pointer; }
    .chip.selected { border-color:var(--accent); background:var(--accent-soft); font-weight:600; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    .big { border:1.5px solid var(--line); background:var(--card); color:var(--fg); border-radius:16px;
           padding:1.25rem 0.5rem; font-size:1rem; cursor:pointer; display:flex; flex-direction:column;
           align-items:center; gap:0.4rem; }
    .big .icon { font-size:1.8rem; }
    .big.selected { border-color:var(--accent); background:var(--accent-soft); }
    textarea { width:100%; min-height:7rem; font:inherit; color:inherit; background:var(--card);
               border:1.5px solid var(--line); border-radius:12px; padding:0.75rem; resize:vertical; }
    input[type=text] { width:100%; font:inherit; color:inherit; background:var(--card);
               border:1.5px solid var(--line); border-radius:12px; padding:0.6rem 0.75rem; }
    .hidden { display:none !important; }
    #preview img, #preview video { max-width:100%; border-radius:12px; margin-top:0.5rem; }
    #preview audio { width:100%; margin-top:0.5rem; }
    .rec-controls { display:flex; align-items:center; gap:1rem; margin-top:0.5rem; }
    #recBtn { width:4.5rem; height:4.5rem; border-radius:50%; border:3px solid var(--accent); background:var(--card);
              font-size:1.6rem; cursor:pointer; }
    #recBtn.recording { background:#dc2626; border-color:#dc2626; animation:pulse 1.2s infinite; }
    @keyframes pulse { 50% { opacity:0.6; } }
    #recTime { font-variant-numeric:tabular-nums; color:var(--muted); font-size:1.1rem; }
    #saveBtn { width:100%; margin-top:1.5rem; padding:1rem; font-size:1.1rem; font-weight:700; color:#fff;
               background:var(--accent); border:none; border-radius:14px; cursor:pointer; }
    #saveBtn:disabled { opacity:0.5; }
    #toast { position:fixed; left:50%; bottom:calc(2rem + env(safe-area-inset-bottom)); transform:translateX(-50%);
             background:var(--fg); color:var(--bg); padding:0.75rem 1.25rem; border-radius:999px; font-weight:600;
             opacity:0; transition:opacity 0.3s; pointer-events:none; max-width:90vw; text-align:center; }
    #toast.show { opacity:1; }
    details { margin-top:1.5rem; color:var(--muted); }
    details input { margin-top:0.5rem; }
  </style>
</head>
<body>
<main>
  ${
    contributor
      ? `<nav><h1>💛 Share a moment</h1></nav>
  <p style="color:var(--muted);margin:0 0 0.5rem">Hi ${esc(contributor.label)}! Anything you add here goes straight into the family's private memory book.</p>
  <div class="label">Your name</div>
  <input type="text" id="author" placeholder="So we know who shared it" autocomplete="name">`
      : `<nav><h1>✨ Capture a moment</h1><a href="/">Timeline →</a></nav>`
  }

  <div class="label">Who is it about?</div>
  <div class="chips" id="kids">
    <button class="chip kid-chip selected" data-kid="" type="button">Family</button>
    ${kidChips}
    ${!kids.length && !contributor ? `<a class="chip" href="/kids" style="text-decoration:none">＋ Add your kids</a>` : ""}
  </div>

  <div class="label">What kind of moment?</div>
  <div class="grid">
    <button class="big selected" data-type="quote" type="button"><span class="icon">💬</span>Quote / note</button>
    <button class="big" data-type="photo" type="button"><span class="icon">📷</span>Photo</button>
    <button class="big" data-type="video" type="button"><span class="icon">🎬</span>Video</button>
    <button class="big" data-type="audio" type="button"><span class="icon">🎙️</span>Voice</button>
  </div>

  <div id="pane-text">
    <div class="label">The moment</div>
    <textarea id="text" placeholder="What did they say or do?" autocomplete="off"></textarea>
  </div>

  <div id="pane-file" class="hidden">
    <div class="label" id="fileLabel">Photo</div>
    <button class="big" id="pickBtn" type="button" style="width:100%"><span class="icon">📁</span><span id="pickText">Choose or take a photo</span></button>
    <input type="file" id="fileInput" class="hidden">
    <div class="label">Caption (optional)</div>
    <input type="text" id="caption" placeholder="Add a caption…" autocomplete="off">
  </div>

  <div id="pane-audio" class="hidden">
    <div class="label">Voice recording</div>
    <div class="rec-controls">
      <button id="recBtn" type="button" aria-label="Record">🎙️</button>
      <span id="recTime">0:00</span>
      <button class="chip hidden" id="discardBtn" type="button">Discard</button>
    </div>
    <div class="label">Caption (optional)</div>
    <input type="text" id="audioCaption" placeholder="Singing in the bath…" autocomplete="off">
  </div>

  <div id="preview"></div>

  <button id="saveBtn" type="button">${contributor ? "Share moment" : "Save moment"}</button>

  ${
    contributor
      ? ""
      : `<details>
    <summary>Saving as…</summary>
    <input type="text" id="author" placeholder="Your name (shown as 'added by')" autocomplete="name">
  </details>`
  }
</main>
<div id="toast"></div>

<script>
(() => {
  const $ = (s) => document.querySelector(s);
  const POST_URL = ${JSON.stringify(contributor ? `/api/contribute/${contributor.token}` : "/api/moments")};
  const CONTRIBUTOR = ${contributor ? "true" : "false"};
  let momentType = "quote";
  let file = null;        // File or Blob to upload
  let fileName = "";
  let recorder = null, recChunks = [], recTimer = null, recStart = 0;

  // --- kid selection ---
  document.querySelectorAll(".kid-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".kid-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      localStorage.setItem("lastKid", chip.dataset.kid);
    });
  });
  const lastKid = localStorage.getItem("lastKid");
  if (lastKid) {
    const chip = document.querySelector('.kid-chip[data-kid="' + lastKid + '"]');
    if (chip) { document.querySelectorAll(".kid-chip").forEach((c) => c.classList.remove("selected")); chip.classList.add("selected"); }
  }

  // --- author memory ---
  $("#author").value = localStorage.getItem("author") || "";
  $("#author").addEventListener("input", (e) => localStorage.setItem("author", e.target.value));

  // --- type selection ---
  document.querySelectorAll(".big[data-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".big[data-type]").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      momentType = btn.dataset.type;
      resetMedia();
      $("#pane-text").classList.toggle("hidden", momentType !== "quote");
      $("#pane-file").classList.toggle("hidden", momentType !== "photo" && momentType !== "video");
      $("#pane-audio").classList.toggle("hidden", momentType !== "audio");
      if (momentType === "photo" || momentType === "video") {
        $("#fileLabel").textContent = momentType === "photo" ? "Photo" : "Video";
        $("#pickText").textContent = momentType === "photo" ? "Choose or take a photo" : "Choose or record a video";
        $("#fileInput").accept = momentType === "photo" ? "image/*" : "video/*";
      }
    });
  });

  // --- photo/video picking (native camera or library) ---
  $("#pickBtn").addEventListener("click", () => $("#fileInput").click());
  $("#fileInput").addEventListener("change", () => {
    const f = $("#fileInput").files[0];
    if (!f) return;
    file = f; fileName = f.name;
    const url = URL.createObjectURL(f);
    $("#preview").innerHTML = momentType === "photo"
      ? '<img src="' + url + '" alt="">'
      : '<video src="' + url + '" controls playsinline></video>';
  });

  // --- voice recording ---
  $("#recBtn").addEventListener("click", async () => {
    if (recorder && recorder.state === "recording") { recorder.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
                 : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recChunks = [];
      recorder.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recTimer);
        $("#recBtn").classList.remove("recording");
        const type = recorder.mimeType || "audio/webm";
        file = new Blob(recChunks, { type });
        fileName = "voice." + (type.includes("mp4") ? "m4a" : "webm");
        $("#preview").innerHTML = '<audio controls src="' + URL.createObjectURL(file) + '"></audio>';
        $("#discardBtn").classList.remove("hidden");
      };
      recorder.start();
      recStart = Date.now();
      $("#recBtn").classList.add("recording");
      recTimer = setInterval(() => {
        const s = Math.floor((Date.now() - recStart) / 1000);
        $("#recTime").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      }, 250);
    } catch (err) {
      toast("Microphone unavailable: " + err.message);
    }
  });
  $("#discardBtn").addEventListener("click", resetMedia);

  function resetMedia() {
    if (recorder && recorder.state === "recording") recorder.stop();
    file = null; fileName = "";
    $("#preview").innerHTML = "";
    $("#recTime").textContent = "0:00";
    $("#discardBtn").classList.add("hidden");
    $("#fileInput").value = "";
  }

  // --- save ---
  $("#saveBtn").addEventListener("click", async () => {
    if (CONTRIBUTOR && !$("#author").value.trim()) return toast("Add your name first 🙂");
    const kid = document.querySelector(".kid-chip.selected").dataset.kid;
    const form = new FormData();
    form.append("type", momentType);
    form.append("kid_id", kid);
    form.append("author", $("#author").value.trim());
    if (momentType === "quote") {
      const text = $("#text").value.trim();
      if (!text) return toast("Write the moment first ✏️");
      form.append("text", text);
    } else {
      if (!file) return toast(momentType === "audio" ? "Record something first 🎙️" : "Pick a file first 📁");
      form.append("text", (momentType === "audio" ? $("#audioCaption") : $("#caption")).value.trim());
      form.append("file", file, fileName);
    }
    $("#saveBtn").disabled = true;
    try {
      const res = await fetch(POST_URL, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      toast((CONTRIBUTOR ? "Shared" : "Saved") + (saved.kid_name ? " — " + saved.kid_name + " (" + saved.age + ")" : "") + " 🎉");
      $("#text").value = ""; $("#caption").value = ""; $("#audioCaption").value = "";
      resetMedia();
    } catch (err) {
      toast("Couldn't save: " + err.message);
    } finally {
      $("#saveBtn").disabled = false;
    }
  });

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 3000);
  }

  if (!CONTRIBUTOR && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
})();
</script>
</body>
</html>`;
}
