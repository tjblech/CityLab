const CACHE='citylab-v1.0.0';
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;
  event.respondWith(fetch(event.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(event.request,clone));return r;}).catch(()=>caches.match(event.request)));
});
