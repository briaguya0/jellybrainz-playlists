# jellybrainz-playlists

Browse your Jellyfin playlists and export them to [MusicBrainz](https://musicbrainz.org) collections or [ListenBrainz](https://listenbrainz.org) playlists. All API calls are client-side — your credentials never leave the browser.

## Features

- Connect to any Jellyfin server using an API key
- Browse playlists in a grid or list view
- Per-track match table: Jellyfin metadata on the left, linked MusicBrainz recording on the right
- Diagnostic popover on unmatched tracks (shows raw `ProviderIds` or MB API error)
- Export matched recordings to a MusicBrainz recording collection (append or replace, with backup download before replace)
- Export matched recordings to a ListenBrainz playlist (create new, append, or replace — track order preserved)
- Warning when not all tracks are matched before exporting
- Dark/light/auto theme, slide-in settings panel
- Mobile-friendly: thumbnail-only table column, bottom-sheet popovers

## Setup

All credentials are entered in the app's Settings panel — no environment variables or build step required for users. Simply open the app and configure via the cog icon in the header.

For local development:

```bash
npm ci
npm run dev
```

The app starts at `http://localhost:3000`.

### MusicBrainz OAuth

To use the MusicBrainz export you'll need to register an OAuth application:

1. Go to [musicbrainz.org/account/applications/register](https://musicbrainz.org/account/applications/register)
2. Set the redirect URI to `http://localhost:3000/mb-callback` (or your deployed URL)
3. Register as a **web application** — this requires a client secret
4. Enter the client ID and secret in Settings → MusicBrainz

### ListenBrainz

Get your user token from [listenbrainz.org/profile/](https://listenbrainz.org/profile/) and enter it in Settings → ListenBrainz.

### Optional environment variables

| Variable | Description |
|---|---|
| `VITE_MB_BASE_URL` | Override the MusicBrainz host, e.g. `http://localhost:5000` for a local [musicbrainz-docker](https://github.com/metabrainz/musicbrainz-docker) instance |

## Building

```bash
npm run build
```

Outputs a fully static SPA to `dist/client/` — no server required. Deploy to any static host with a catch-all redirect to `/_shell.html`.

## Testing

```bash
npm run test
```

Unit tests cover the pure utility functions in `src/lib/`: duration formatting, array chunking, artist credit formatting, PKCE generation, and OAuth URL construction.

## Linting & formatting

```bash
npm run check
```

Uses [Biome](https://biomejs.dev/) for both linting and formatting.

## Architecture

- **Framework**: [TanStack Start](https://tanstack.com/start) (React, SPA mode — all data fetching is client-side)
- **Routing**: [TanStack Router](https://tanstack.com/router) with `?playlist=<id>` search param for selected playlist
- **Data fetching**: [TanStack Query](https://tanstack.com/query) — per-row MB recording queries with `staleTime: Infinity`
- **Auth**: MusicBrainz OAuth2 PKCE + client secret via browser `SubtleCrypto`; ListenBrainz user token
- **Storage**: All credentials stored in `localStorage`
- **Styling**: Tailwind CSS v4 with custom design tokens

### Key files

```
src/lib/
  types.ts           — shared TypeScript interfaces
  config.ts          — localStorage helpers
  jellyfin.ts        — Jellyfin API client
  musicbrainz.ts     — MusicBrainz API client (recordings + collections)
  listenbrainz.ts    — ListenBrainz API client (playlists)
  oauth.ts           — PKCE helpers + token exchange

src/contexts/
  JellyfinContext.tsx — Jellyfin config state
  MbAuthContext.tsx   — MusicBrainz auth + OAuth client config
  LbAuthContext.tsx   — ListenBrainz auth state

src/routes/
  index.tsx          — playlists grid + track table + export buttons
  mb-callback.tsx    — MusicBrainz OAuth2 callback handler

src/components/
  Header.tsx         — app header with settings cog
  SettingsPanel.tsx  — slide-in settings panel
  settings/          — ThemeSection, JellyfinSection, MbSection, LbSection
```
