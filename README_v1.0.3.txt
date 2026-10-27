STRIP GAMES COMPENDIUM — BROWSER EDITION v1.0.3
LARGER CHARACTERS / SCENE COMPOSITOR PATCH
=====================================================

This patch builds on the WORKING v1.0.2 landscape update.
It does not change game logic, saves, artwork filenames, folder permissions,
roster, game controls, the layout or the Python desktop editions.

WHAT CHANGED
- The Canvas compositor now fits the VISIBLE part of each character
  image instead of including empty transparent or pale borders.
- Opaque nearly-white backgrounds are removed for DISPLAY only when
  connected to the image's outside edge. Original files are untouched.
- Characters are drawn taller in BOTH portrait and landscape.
- Processed figures are cached per file and refreshed if you select a
  different Assets directory.
- Rendering size is optimised to avoid decoding huge sprites on Android.

INSTALLATION (on PC)
1. Exit/close the Compendium tab on your phone for now.
2. Go to github.com/andrewtaylor1979-source/compendium-browser-test
3. Upload the THREE files in this ZIP to the repository ROOT:
      app.js
      index.html
      service-worker.js
   Replace existing versions and COMMIT changes.
   Do not add this README to your hosted site unless you want to.
   Do not touch any JSON files, existing style.css, or the phone Assets.
4. Wait for GitHub Pages publishing to finish.
5. On your S22, with Wi-Fi on, open:
      https://andrewtaylor1979-source.github.io/compendium-browser-test/?scene=103
6. Resume or start Dice and check character sizes in both orientations.

The webpage uses a new versioned script path and service-worker cache so
Chrome should not require Clear site data; do not clear it as it may remove
saved games or folder permissions.

TESTED
- JavaScript syntax checking passed.
- Headless Chromium compositing passed with Ahsoka, Jack, Silvie and Suzi.
- All four test figures occupied approximately 90% of scene height.
- Transparent art and near-white-background art both handled correctly.
- Final real-device test must be performed on your Galaxy S22.

To roll back, restore the v1.0.2 copies of the same three files from the
previous release. Your original images and saved games are unaffected.
