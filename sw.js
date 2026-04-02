// Service Worker – 3D Solitaire v2.2.5
const CACHE = 'solitaire-v4';

const PRECACHE = [
  './index.html',
  './main.js',
  './style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Three.js CDN もキャッシュ
const CDN = [
  'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js',
];

// ── インストール：ローカルアセットを事前キャッシュ ──────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // ローカルは必須キャッシュ
      cache.addAll(PRECACHE);
      // CDNはベストエフォート（失敗しても続行）
      CDN.forEach(url => cache.add(url).catch(() => {}));
    })
  );
  self.skipWaiting();
});

// ── アクティベート：古いキャッシュを削除 ────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── フェッチ：キャッシュ優先（オフライン対応） ─────────────────
self.addEventListener('fetch', e => {
  // POST等は無視
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // 有効なレスポンスのみキャッシュに追加
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
