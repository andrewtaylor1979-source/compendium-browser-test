STRIP GAMES COMPENDIUM — BROWSER EDITION v1.1
MOBILE EXPERIENCE UPDATE — PATCH FOR v1.0.4

This is the BROWSER-NATIVE GitHub Pages edition, NOT the older Python-server
Web Edition or desktop game. It keeps all FIVE current games and the same
flat Assets folder on the Samsung Galaxy S22.

FILES TO UPLOAD TO THE ROOT OF YOUR EXISTING GITHUB PAGES REPOSITORY:
  index.html                 REPLACE
  app.js                     REPLACE
  style.css                  REPLACE
  service-worker.js          REPLACE
  manifest.webmanifest       REPLACE
  icon-192.png               ADD
  icon-512.png               ADD

Leave engine.js, boot-guard.js, icon.svg, JSON data and your image Assets alone.
NO image files, game saves or dialogue files need to be uploaded for this patch.
Do not clear the Chrome site data or folder permission: v1.1 reads the existing
save key and adds a separate preference key for automatic AI speed.

WHAT'S NEW
* AI auto-progress (Slow / Normal / Fast / Manual). Normal is the initial
  setting. AI moves and non-decision transitions advance after short delays.
  It always pauses for human choices, including selecting a Memory Card, a
  poker discard, or an opponent/clothing action. A new poker hand and a new
  Dice round remain player-triggered. Wheel spin animations have a delay to
  keep results readable. Automatic moves pause when the browser is hidden or
  the scene viewer is open.
* Tap the AI speed button in the game panel to cycle Normal -> Fast -> Manual
  -> Slow -> Normal. The preference also appears under Assets & saved games.
* More compact portrait control panel. Dialogue and phase guidance move
  nearer the action. The main page remains fixed; long game controls scroll
  within their panel.
* Expand "Recent turns" to review actions performed by the AI. History is
  saved as part of each game and capped at 40 entries.
* Bigger portrait cards and dice icons.
* New PNG home-screen icons to help Android Chrome install the PWA.
  In Chrome's menu choose "Install app" or "Add to Home screen" (wording may
  vary). Install is optional and should retain the existing storage origin.
* Double-tap scene still toggles immersive toolbars. View/Save still permits
  zoom and PNG download.

AFTER GITHUB PAGES PUBLISHES THE UPDATED FILES:
https://andrewtaylor1979-source.github.io/compendium-browser-test/?mobile=110

Keep Wi-Fi enabled for the initial update. After the new service worker caches
v1.1's files, the app can work offline as before. Do NOT clear browser data.

NOTES
* All five games are still based on the existing browser-native engine.js,
  which is not changed here. This patch does not claim exact parity with
  every advanced Python desktop AI rule.
* System-level full-screen depends on Chrome and Android. Installing the PWA
  is the supported way to normally hide the Chrome address bar.
* Source was linted with Node and exercised with Chromium mock-fed roster and
  dialogue data at 390x780, 360x640, 844x390 and 1440x900. Full on-device
  testing remains with the user's Galaxy S22.
