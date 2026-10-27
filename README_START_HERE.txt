STRIP GAMES COMPENDIUM — Browser Feasibility Test v0.1
====================================================

This is NOT the Dice game yet. It tests the most important prerequisite for a
browser-only Android edition: loading a separately stored folder of artwork.

WHAT IT DOES
- Runs entirely in Chrome, without Python or your PC server.
- Opens a user-chosen local folder (read-only).
- Finds Ahsoka_TJBP.png and Jack_TJBP.png, even in subfolders (up to 3 deep).
- Renders them together with browser Canvas, without uploading artwork.
- Saves the selected folder HANDLE in browser IndexedDB where permitted.
- Caches the app shell for later offline opening, using a service worker.

IMPORTANT: HOST OVER HTTPS
Folder pickers and service workers require a secure context. The recommended
way to test on the phone is a FREE GitHub Pages site. Double-clicking
index.html from Downloads is NOT the intended phone test.

PUBLISH TO GITHUB PAGES (no Android Studio / Python needed)
1) Log in to https://github.com (create a free account if required).
2) Create a new PUBLIC repository, for example 'compendium-browser-test'.
   Do NOT put artwork, character assets, or private saves into this repository.
3) Use 'Add file' > 'Upload files' and upload the SIX files in this folder:
      index.html, app.js, style.css, service-worker.js,
      manifest.webmanifest, icon.svg
   Commit them to the main branch at the ROOT of the repository.
4) Open Settings > Pages, set Build and deployment to 'Deploy from a branch',
   choose branch 'main', folder '/ (root)', then Save.
5) Open the HTTPS URL provided by GitHub Pages on your Galaxy S22 in CHROME.
   Example: https://YOURNAME.github.io/compendium-browser-test/
6) Copy your EXISTING Assets folder to the PHONE first. Preserve filenames.
7) Tap 'Select Assets folder'; pick your Assets folder.
8) Look for both images marked FOUND and displayed on screen.
9) Close and reopen the site; try 'Reconnect saved folder'.
10) Optional: Chrome menu > Add to Home screen / Install app.
    After it is installed and opened online once, test with airplane mode on.

WHAT TO REPORT
- Does the folder picker open?
- Does it find and display both Ahsoka_TJBP.png and Jack_TJBP.png?
- Does 'Reconnect saved folder' work after closing/reopening Chrome?
- Can the home-screen app open with phone offline (at least the shell)?

SECURITY / PRIVACY
GitHub Pages websites and PUBLIC repository source files are PUBLIC.
Do not upload your image Assets folder or game saves to GitHub.
This proof-of-concept has no analytics or file-upload code. Artwork is read
locally and never sent to the hosting site. The GitHub Pages site itself still
requires a network connection the first time to cache the app shell.

LIMITATIONS
- Not yet a game; no Python game logic converted.
- Stored directory handles can require permission to be granted again.
- Browser site data can be deleted; asset files are NOT stored in site data.
- Some Android file providers may present folders differently. If directory
  selection fails, we can design an alternative explicit ZIP-import workflow.
- Offline availability relies on successfully installed/cached service worker.
