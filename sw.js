/* SwimWithSmile — service worker
   Файловете на сайта (CSS/JS/иконки/шрифтове) се пазят локално → второто
   отваряне е моментално. Страницата (index.html) винаги се взима свежа,
   ако има интернет. Заявките към Google Apps Script НЕ се кешират. */
const CACHE = 'sws-v34';
const CORE = ['./', 'index.html', 'css/styles.css?v=34', 'css/landing.css?v=34', 'css/app.css?v=34', 'css/mobile.css?v=34',
  'js/api.js?v=34', 'js/app.js?v=34', 'js/coach.js?v=34', 'js/parent.js?v=34', 'js/landing.js?v=34', 'manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;                 // напр. script.google.com — без кеш

  // Страницата: първо мрежата, после кеша (за офлайн)
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // Всичко останало: от кеша веднага, обновяване във фона
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
