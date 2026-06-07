// Terp Sessions (formerly Volcano Controller) — app-shell SW
const VERSION = 'v9.21.0';
const CACHE = `terp-sessions-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('message', e=>{
  if(e.data && e.data.type === 'SKIP_WAITING'){ self.skipWaiting(); }
});

self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);

  // v4.9.4: Google Fonts NICHT intercepten (vermeidet ORB-Blocking durch opaque Responses)
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    return; // Browser lädt direkt
  }

  // v4.8: Wetter API immer network-first (Daten sollen frisch sein)
  if(url.hostname === 'api.open-meteo.com' || url.hostname === 'geocoding-api.open-meteo.com'){
    e.respondWith(fetch(req).catch(()=>caches.match(req)));
    return;
  }

  if(url.origin===location.origin){
    // App-Shell: network-first, fall back to cache
    e.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
  }else{
    // Cross-origin (other CDNs etc.): cache-first
    e.respondWith(
      caches.match(req).then(r=>r || fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=>r))
    );
  }
});
