# Velvet VT — Native View Transitions Site Shell

A minimal same-document SPA shell showing:
- Native View Transitions (with graceful fallback)
- Nested region transitions (header, main, featured)
- Motion toggle + “no-VT” bypass
- Reduced-motion support
- Accessible nav + focus management

## Run
Just open `index.html` in a browser, or use VS Code “Live Preview”.
Hash routes: `#/home`, `#/work`, `#/about`, `#/contact`.

## Publish
1) Commit + push to GitHub.
2) Settings → Pages → Deploy from branch → `main` / root.  
3) Visit your Pages URL (hash routing means it works fine).

## Notes
- If View Transitions are unavailable or disabled, everything still works.
- Toggle motion in the header (persists in `localStorage`).
- Add your own “shared element” IDs across pages to make transitions feel custom.
