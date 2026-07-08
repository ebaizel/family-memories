// Minimal service worker: makes the app installable and keeps the shell
// loading fast. Pages go network-first (fresh content), icons cache-first.
const CACHE = "fm-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/capture", "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(e.request).then((hit) => hit ?? fetch(e.request)));
    return;
  }
  if (url.pathname === "/" || url.pathname === "/capture") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request)),
    );
  }
});
