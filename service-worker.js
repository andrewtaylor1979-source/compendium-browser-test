'use strict';
const CACHE='sgc-six-games-browser-v1.2.3';
const SHELL=['./','./index.html','./app.js','./app.js?v=solo123','./engine.js','./engine.js?v=solo123','./boot-guard.js','./boot-guard.js?v=fix101','./style.css','./style.css?v=solo123','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./header_logo.png'];
const DATA=['characters','dice_dialogue','wheel_dialogue','holdem_dialogue','poker_dialogue','memory_dialogue'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CACHE);
 // Cache required shell. Failure logs but does not prevent SW taking over.
 for(const path of SHELL){try{await c.add(path);}catch(err){console.warn('Unable to cache shell',path,err);}}
 // GitHub uploads may put JSON files at root instead of data/. Either works.
 for(const name of DATA){
  let found=false;
  for(const path of [`./data/${name}.json`,`./${name}.json`]){
   try{const url=new URL(path,self.registration.scope);const r=await fetch(url,{cache:'no-store'});if(r.ok){await c.put(url,r);found=true;break;}}catch(err){console.warn('Data cache attempt failed',path,err);}
  }
  if(!found)console.warn('Missing offline dialogue:',name);
 }
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('sgc-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const hit=await caches.match(e.request);
  try {
   // Network-first keeps the app updatable; cached copies work offline.
   const res=await fetch(e.request);
   if(res.ok)await cache.put(e.request,res.clone());
   return res;
  } catch(err) {if(hit)return hit;throw err;}
 })());
});
