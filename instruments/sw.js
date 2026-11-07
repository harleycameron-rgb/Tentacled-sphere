const CACHE='scandoc-instruments-v1';
const ASSETS=['./','./index.html','./seven-stage.html','./octopus.html','./style.css','./state.js','./model.js','./render.js','./instrument.js','./legacy.js','../web/geometry.js','../web/audio.js','../web/protocol.js'].map(x=>new URL(x,self.location.href).href);
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('scandoc-instruments-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&ASSETS.includes(e.request.url))e.respondWith((async()=>await caches.match(e.request,{cacheName:CACHE})||fetch(e.request))());});
