/* Thermal Gauge service worker — makes the app work offline after the first visit. */
const CACHE = "thermal-gauge-1.54";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./icon-aurora-180.png", "./icon-aurora-192.png"];
const OCR_CACHE = "thermal-gauge-ocr-5.1.1";   // kept across app updates (13 MB, only changes if the reader changes)
const OCR_FILES = ["./ocr/core-simd.js", "./ocr/core.js", "./ocr/eng.js"];   // photo reader: cached in the background so it works offline
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).then(() => { caches.open(OCR_CACHE).then(o => o.match(OCR_FILES[2]).then(h => h || o.addAll(OCR_FILES))).catch(() => {}); })).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== OCR_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // newest version when online (gives up after 3 s on a weak signal), saved copy when offline
    e.respondWith(Promise.race([
      fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return r; }),
      new Promise((_, rej) => setTimeout(rej, 3000)),
    ]).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {            // keep a copy of anything else we load (photo reader files)
    if (r.ok && new URL(req.url).pathname.includes("/ocr/")) { const copy = r.clone(); caches.open(OCR_CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
