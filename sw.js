// Volcano Controller — minimal app-shell SW
const VERSION = 'v4.0.0';
const CACHE = `volcano-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  // Network-first for same-origin HTML, cache-first for the rest of app-shell.
  if(url.origin===location.origin){
    e.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
  }else{
    // Cross-origin (e.g. Google Fonts) — cache-first with network fallback
    e.respondWith(
      caches.match(req).then(r=>r || fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=>r))
    );
  }
});
