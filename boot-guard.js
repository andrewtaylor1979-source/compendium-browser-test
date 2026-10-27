/* Startup diagnostics. Kept separate so it still runs when the module import fails. */
(() => {
  'use strict';
  const errors = [];
  let done = false;
  function showProblem() {
    if (done) return;
    const app = document.getElementById('app');
    if (!app || !app.querySelector('.splash')) { done = true; return; }
    done = true;
    const wrapper = document.createElement('div');
    wrapper.className = 'startup-error';
    wrapper.style.cssText = 'max-width:620px;margin:15vh auto;padding:22px;color:#f3e6d1;background:#21181b;border:1px solid #896f57;border-radius:14px;font-family:system-ui;text-align:center;line-height:1.5';
    const heading=document.createElement('h2');heading.textContent='Compendium could not finish loading';
    const explanation=document.createElement('p');
    explanation.textContent='Check that app.js, engine.js, and all six JSON data files are published on GitHub. Data files may be in the data folder or at the repository root.';
    wrapper.append(heading,explanation);
    if (errors.length) {
      const info=document.createElement('p'); info.style.cssText='font-size:12px;overflow-wrap:anywhere;color:#ffb9ad';
      info.textContent=errors.slice(-3).join(' | '); wrapper.append(info);
    }
    const btn=document.createElement('button'); btn.textContent='Retry / refresh site files';
    btn.style.cssText='font:inherit;color:white;background:#67373f;border:1px solid #a37e5d;border-radius:10px;padding:12px;margin-top:10px;cursor:pointer';
    btn.addEventListener('click',async()=>{
      // Deleting cache storage, unlike clearing site data, keeps IndexedDB folder handle and saves.
      try { const keys=await caches.keys(); await Promise.all(keys.filter(k=>k.startsWith('sgc-')).map(k=>caches.delete(k))); }catch(_){}
      const url=new URL(location.href);url.searchParams.set('repair',Date.now().toString());
      location.replace(url.href);
    });
    wrapper.append(btn);
    app.replaceChildren(wrapper);
  }
  window.addEventListener('error', e => { errors.push(e.message || e.target?.src || 'A required script failed to load'); },true);
  window.addEventListener('unhandledrejection', e => {errors.push(e.reason?.message||String(e.reason));});
  window.addEventListener('DOMContentLoaded',()=>setTimeout(showProblem,12000));
})();
