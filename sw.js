/* 매일 영어 3문장 — Service Worker (오프라인 지원)
   앱 화면(셸)과 아이콘을 캐시합니다. 첨삭(Claude API)은 항상 네트워크로만 동작하며 캐시하지 않습니다. */
const CACHE = 'de3-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Claude API 등 외부 호출은 캐시/가로채기 하지 않음
  if (url.hostname.includes('anthropic.com')) return;
  if (url.origin !== self.location.origin) return;

  // 캐시 우선, 없으면 네트워크(성공 시 캐시에 저장), 실패하면 앱 셸로 폴백
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    )
  );
});
