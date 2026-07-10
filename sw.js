/* 매일 영어 3문장 — Service Worker (오프라인 지원)
   전략:
   - HTML 문서: network-first (온라인이면 항상 최신 화면, 오프라인이면 캐시)
   - 그 외 자원(아이콘/매니페스트): stale-while-revalidate (빠르게 캐시로 보여주고 뒤에서 갱신)
   - 첨삭 API(Claude/Gemini 등 외부 호출)는 가로채지 않음 */
const CACHE = 'de3-v2';
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
  if (url.origin !== self.location.origin) return; // 외부(API 등)는 그대로 통과

  const isHTML = req.mode === 'navigate' || req.destination === 'document';

  if (isHTML) {
    // network-first: 최신 화면 우선, 실패 시 캐시로 폴백
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // stale-while-revalidate: 캐시로 즉시 응답 + 백그라운드 갱신
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
