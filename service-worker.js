'use strict';
const CACHE='sgc-feasibility-v0.1';
const SHELL=['./','./index.html','./app.js','./style.css','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&new URL(event.request.url).origin===self.location.origin){event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));}});
