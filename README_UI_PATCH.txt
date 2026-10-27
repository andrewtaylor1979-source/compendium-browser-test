Strip Games Compendium — Browser Edition v1.0.2
LANDSCAPE & PORTRAIT UI REPAIR

What changes
============
* Landscape on Galaxy S22: game art is large on the left, controls on the right.
* Game scene no longer shrinks to a thin strip on short landscape screens.
* Game controls scroll *inside their panel*, not the browser page.
* Compact landscape header and participant strip give the art more room.
* Portrait layout remains broadly familiar.
* These CSS changes apply to all FIVE games. Gameplay rules and saves are unchanged.
* Cache and visible version updated to v1.0.2.

How to install
==============
1. Open https://github.com/andrewtaylor1979-source/compendium-browser-test
2. Upload index.html, app.js, style.css, service-worker.js from THIS ZIP
   into the ROOT of the repository. Replace those four existing files.
3. Commit the update. Do not move the JSON data files, images, or Assets folder.
4. Once GitHub Pages has published, open:
   https://andrewtaylor1979-source.github.io/compendium-browser-test/?layout=102
5. Keep Wi-Fi on for the first update, then test landscape Dice again.

IMPORTANT: Do not clear Chrome site data; that would risk saved games and
selected-folder permissions. This patch does not change either.

Testing notes
=============
Layout tested in Chromium at landscape 844×390 and 800×360 plus 390×780
portrait, with checks for correct dimensions and no page scroll. On-phone
visual test still needs to be confirmed on the Samsung Galaxy S22.
