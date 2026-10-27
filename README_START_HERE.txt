STRIP GAMES COMPENDIUM — BROWSER-NATIVE FIVE-GAME EDITION v1.0
==============================================================

WHAT THIS IS
------------
A first fully browser-native, playable version of all five current Web Edition
modes: Dice, Strip Memory, Wheel of Misfortune, Strip Hold'em, Five-Card Draw.
Runs with JavaScript + browser Canvas, not the Windows Python server. All 65
opponent profiles and the original source dialogue banks are included.

IMPORTANT: This is a NEW browser-engine implementation. It follows the core
Python game mechanics (13 clothing states, dice rolls and penalties, shuffled
Memory cards, sixteen-segment Wheel/voting/recovery, real Hold'em and two-round
Five-Card Draw), but some advanced dialogue selection, relationship weighting
and AI choices differ from the desktop Python engines. Please test and report
any rules that you want brought into exact parity.

PC and Android games/saves are separate. Your Windows editions are unchanged.

INSTALLING THE WEBSITE ON GITHUB PAGES
--------------------------------------
1. FIRST BACK UP YOUR EXISTING GitHub repository or download its current files.
2. Extract this ZIP on your Windows PC.
3. Open GitHub repository: compendium-browser-test.
4. Upload / replace these 7 WEBSITE items in the repository root:
     index.html
     app.js
     engine.js
     style.css
     service-worker.js
     manifest.webmanifest
     icon.svg
5. Upload the entire WEBSITE data/ folder containing the six JSON files.
   The data/ subfolder is ON GITHUB, not on your phone. It contains text,
   profiles and dialogue, NOT character photographs.
6. Do NOT upload Prepare_Flat_Assets.py, .cmd, or local artwork to GitHub.
7. Wait for GitHub Pages to deploy; FIRST open this cache-busting link:
   https://andrewtaylor1979-source.github.io/compendium-browser-test/?release=full5
   This bypasses the OLD feasibility-test service worker without clearing your
   folder permissions or stored data. After it has loaded online and the new
   service worker activates, the usual site URL should show the new version.
8. Confirm the page has FIVE game tiles and a v1.0 version indicator.
   You may need to refresh twice after the new service worker takes control.
9. Tap Assets, then 'Select Assets folder' (or Reconnect saved folder if it
   still has permission from the v0.1 feasibility test).
10. Play with Wi-Fi turned off after the app's first online load.

THE SINGLE FLAT FOLDER ON YOUR PHONE
------------------------------------
Examples:
  Ahsoka_TJBP.png   Jack_TJBP.png   Silvie_JBP.png
  MemoryCard_Ahsoka.png   MemoryCard_Jack.png
  Dice_1.png ... Dice_6.png
  2_of_clubs.png   ace_of_spades.png   queen_of_hearts2.png
  card_back.png
  Background_Nightclub.png

The browser reads only the selected folder. No subfolders are needed or
scanned. Character-state filenames stay unchanged: e.g. Ahsoka_Naked5.png.

If your existing desktop artwork is in subfolders, on Windows run
Prepare_Flat_Assets.cmd (or Prepare_Flat_Assets.py). It will ASK for:
  (1) your desktop Assets source folder,
  (2) a SEPARATE destination folder for the phone,
  (3) optionally, an extra Memory Cards folder if stored separately.
It COPIES images, never moves/changes originals. Memory Cards receive
MemoryCard_ prefixes and dice images Dice_1.png etc. It creates a conflict
report and DOES NOT overwrite differing same-name artwork.
Transfer the resulting image files into ONE phone folder. They do NOT go on
GitHub. Make sure the phone has enough free storage for all states.

SAVES
-----
Each of the five games has its own local browser save and Resume button.
Use Menu > Assets & saves > Export saved games to make a JSON backup.
Import on another browser or after resetting your phone.

OFFLINE
-------
The service worker caches all site code and dialogue. Game images are loaded
from your local Assets folder, never the cloud. First opening must be online;
then relaunch offline to test. Chrome could ask you to grant folder access
again if its permissions have expired. Avoid clearing Chrome site data unless
you have exported your saved games.

NOTES
-----
- Your GitHub Pages URL and website FILES are public. Do not put private
  artwork, personal details or private saves in the GitHub repository.
- Images missing from the separate folder appear as placeholders; controls
  remain usable.
- Real Hold'em and Five-Card Draw use a 52-card deck and 5-card hand evaluator.
- Original desktop Memory Cards can be used as MemoryCard_<AssetName>.png.
- Original game modes contain highly customised AI and personality logic;
  this implementation reproduces the fundamental rules but is not a
  byte-for-byte translation of every Python dialogue/relationship branch.
- If a new release appears stuck on old content, refresh Chrome while online,
  then reopen the site once more. Do NOT clear site storage unless you have
  exported your saves and are prepared to select the Assets folder again.

TEST CHECKLIST FOR GALAXY S22
----------------------------
[ ] Menu displays all five games.
[ ] Choose/reconnect flat Assets folder; portraits appear in 5x5 grids.
[ ] Page stays fixed; roster and action panels scroll inside themselves.
[ ] Dice rolls and moves characters through different costume states.
[ ] Strip Memory reveals the character card, applies penalty, continues.
[ ] Wheel visibly spins; vote/target/recovery results make sense.
[ ] Hold'em has visible five-card board plus private hole cards and showdown.
[ ] Five-Card Draw can exchange selected cards in round 1 AND round 2.
[ ] Quit/reopen each game from its independent saved state.
[ ] Wi-Fi off / PC off: complete a game and see local artwork.

