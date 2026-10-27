STRIP GAMES COMPENDIUM Browser Edition v1.0.1 — Loading fix

I checked the public GitHub repository. The six JSON files are at the root
instead of the data/ folder expected by v1.0. This made the loader fail.

FIX: Upload and REPLACE exactly these four files in the repository root:
  index.html
  app.js
  boot-guard.js  (NEW)
  service-worker.js

Do not move artwork, delete saved games, clear Chrome site data, or reselect
the Assets folder. The fixed application checks both /data/ and / for its JSONs.
Its new offline worker caches the correct published files and uses network-first
loading to make future releases simpler.

After GitHub Pages publishes, open on the phone with Wi-Fi ON:
https://andrewtaylor1979-source.github.io/compendium-browser-test/?repair=101

If the old screen persists, use a new Incognito tab as a quick test of
whether the normal Chrome tab has a stale service worker. Incognito does not
share your folder permissions or saves, so do not use it for normal gameplay.
The new startup screen includes a repair button that clears only this site's
cached code files, not the saved games or remembered directory handle.

Keep the existing engine.js, style.css, icon.svg, manifest.webmanifest and the
six JSON data files in place. No game engines or assets are changed by this fix.
