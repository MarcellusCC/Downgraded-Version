/* WebVantage PWA Service Worker
   - Precaches app shell (all main pages)
   - Network-first for navigations (HTML)
   - Cache-first for static assets (CSS/JS/fonts/images)
*/

const CACHE_PREFIX = "wv-cache";
const CACHE_VERSION = "v1";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",                 // root
  "/index.html",
  "/manifest.json",
  "/navigation.css",

  // Pages
  "/login.html",
  "/register.html",
  "/my-profile.html",
  "/team-intro.html",
  "/learn.html",
  "/learn-html.html",
  "/learn-css.html",
  "/learn-javascript.html",
  "/quiz.html",
  "/challenges.html",
  "/leaderboard.html",
  "/ai-battle.html",
  "/courses.html",
  "/code-editor.html",

  // JS you want cached (add more if needed)
  "/auth.js",

  // Icons (optional, but nice to have offline)
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
];

// Helpers
const sameOrigin = (url) => self.location.origin === new URL(url).origin;
const isHTMLNavigation = (req) =>
  req.mode === "navigate" ||
  (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));
const isStaticAsset = (req) => {
  const url = typeof req === "string" ? req : req.url;
  return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url);
};

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1) HTML/page navigations: network-first, fall back to cache → index.html
  if (isHTMLNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Cache the route root if it's index, else the request itself
            const key =
              new URL(request.url).pathname === "/" ? "/index.html" : request;
            cache.put(key, copy);
          });
          return res;
        })
        .catch(async () => {
          // Try exact match, then index.html fallback
          const cached =
            (await caches.match(request)) ||
            (await caches.match("/index.html"));
          return cached || new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // 2) Same-origin static assets: cache-first
  if (sameOrigin(request.url) && isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        });
      })
    );
    return;
  }

  // 3) Everything else: network, fall back to cache if available
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Optional: allow immediate activation after update
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
