# TODO

## `rise-in` and `animate-slide-in-right` — register as Tailwind animate tokens

These are custom keyframe animations. They work fine as CSS classes, but Tailwind 4 lets you register them as theme tokens so they can be used as `animate-rise-in` alongside built-ins. Low priority — the current classes are clear enough.

## GitHub Pages deployment

SPA mode is configured (`spa: { enabled: true }` in vite.config.ts, outputs `dist/client/`). Need to wire up:
- GitHub Actions workflow to build and deploy to `gh-pages` branch
- `_redirects` / `404.html` fallback so all routes serve `/_shell.html`
- `base` path config if hosted at a subpath (e.g. `/<repo-name>/`)

## MusicBrainz collections — track order

MB collections are unordered sets. The ListenBrainz export preserves order via JSPF playlists, but there's no equivalent for MB. Consider surfacing this distinction in the UI — perhaps a tooltip or note on the MB export button.

## Duplicate recordings in MB collections

MB collections are sets — duplicate MBIDs are collapsed. The export already warns the user when duplicates are present. Consider writing duplicate info into the MB collection description field (e.g. "Exported from Jellyfin playlist 'Road Trip'. Duplicates: 'I'm Gonna Be (500 Miles)' ×30"). Need to verify whether the collection API accepts a description field.
