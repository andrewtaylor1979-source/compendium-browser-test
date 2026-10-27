STRIP GAMES COMPENDIUM — Browser Edition v1.0.4
Five-Card Draw Privacy + Scene Viewer + Double-Tap Immersive Display

PATCH INSTALLATION
1. On Windows, extract this ZIP.
2. Open the GitHub repository: https://github.com/andrewtaylor1979-source/compendium-browser-test
3. Upload ONLY these four files to the repository's top/root directory:
      app.js
      index.html
      style.css
      service-worker.js
   REPLACE the existing files and commit. Keep the existing engine.js and all six
   JSON files exactly where they are. No images/assets need to be uploaded.
4. After GitHub Pages publishes, open Chrome on the phone with Wi-Fi ON:
   https://andrewtaylor1979-source.github.io/compendium-browser-test/?ui=104
5. Confirm header version v1.0.4 (in portrait; version hidden by landscape UI).
   If stale, close/reopen the page using ?ui=104 with a fresh browser tab.

WHAT'S CHANGED
- Five-Card Draw: Only the human player's hand is face up during the two
  exchange rounds. AI players' hands remain face down until showdown.
  At showdown, all remaining hands and their hand rankings are visible.
- Double-tap the composite scene (NOT the gameplay buttons) to hide the game
  header, game navigation and bottom player-status bar. Double-tap again to
  restore. Where Chrome allows it, this requests browser full-screen as well.
  Android system UI/full-screen permissions are controlled by Chrome/Android.
- Tap the 'View / Save' control over the composite to open the scene viewer.
  Zoom with + / - or two-finger pinch; swipe/drag to pan a zoomed image.
  'Full screen' requests Chrome full-screen; 'Save PNG' downloads the CURRENT
  composite scene at its full internal 1180x590 resolution.

NOTES
- Nothing is uploaded from the Assets folder; the PNG is generated locally.
- Your flat Assets folder, stored directory permission and saved games remain
  in place. This patch does not modify game rules or the Python editions.
- It intentionally does NOT include character art or the six JSON data files.
- On some Android Chrome builds, the browser's address/status/navigation bars
  cannot all be hidden by a webpage. The game's own toolbars can still hide.
- Testing completed in mocked Chromium at 390x780, 844x390 and 1440x900:
  AI hands hidden, 15 showdown cards visible, scene view, zoom, PNG download,
  double-tap on/off, no JS errors and no page-level overflow.
- Final Android Chrome behaviour should be checked on the Galaxy S22.
