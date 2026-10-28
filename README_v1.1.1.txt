STRIP GAMES COMPENDIUM — Browser Edition v1.1.1
Five-Card Draw: discard/deck exhaustion repair
================================================

WHAT CAUSED THE ERROR
The original browser-native Five-Card Draw implementation did not
put exchanged cards into the discard pile. Five players can need more
than the 27 remaining undealt cards during two exchange rounds.
When the second-round deck emptied, AI turns failed with the misleading
message "Invalid discard selection."

THE FIX
* Each replaced card is collected in the discard pile.
* At the end of draw round 1, the round-one discards are shuffled into
  the remaining deck, providing enough cards for round 2.
* All 52 cards remain unique and cards still held by another player
  are NEVER taken for the replacement deck.
* Existing v1.1 saved games (which do not have a proper discard pile)
  automatically recover safe, unused cards if their deck runs short.
* A valid discard selection is no longer incorrectly rejected due to
  deck exhaustion. Illegal card indices are still rejected.
* Hold'em and all other modes remain unchanged.

INSTALLATION
1. On your PC extract this ZIP.
2. Open your GitHub repository:
   https://github.com/andrewtaylor1979-source/compendium-browser-test
3. Upload these FOUR files to the repository ROOT, replacing old copies:
     engine.js
     app.js
     index.html
     service-worker.js
4. Commit. Do NOT delete or re-upload the JSON data, Assets or saves.
5. Once GitHub Pages has published, on the phone with Wi-Fi enabled open:
   https://andrewtaylor1979-source.github.io/compendium-browser-test/?drawfix=111
6. The header should show v1.1.1. Resume your existing Five-Card Draw
   saved game and press Viktoria's exchange again. It should continue.

Note: if an already-cached Chrome tab is still open, close the old tab
and open the link above. Do not clear Chrome site data; that would also
remove your saves and folder authorization.

TESTED
* Five players each exchanging 5 cards in both rounds: passed.
* 500 random complete five-player hands with unique-card checks: passed.
* Recovery from a mid-round-2 legacy save with exhausted deck: passed.
* Index validation and unchanged Hold'em progression: passed.

Original desktop Compendium, Python Web Edition and phone artwork untouched.
