'use strict';
const CACHE='sgc-five-games-browser-v1.0.0';
const SHELL=['./','./index.html','./app.js','./app.js?v=full5','./engine.js','./style.css','./style.css?v=full5','./manifest.webmanifest','./icon.svg','./data/characters.json','./data/dice_dialogue.json','./data/wheel_dialogue.json','./data/holdem_dialogue.json','./data/poker_dialogue.json','./data/memory_dialogue.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sgc-')&&k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});
