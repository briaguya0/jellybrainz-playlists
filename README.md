# jellybrainz-playlists

Browse your Jellyfin playlists and export them as [MusicBrainz](https://musicbrainz.org) recording collections. All API calls are client-side — your Jellyfin API key and MusicBrainz access token never leave the browser.

## Features

- Connect to any Jellyfin server using an API key
- Browse playlists in a grid or list view
- Per-track match table: Jellyfin metadata on the left, linked MusicBrainz recording on the right
- Diagnostic popover on unmatched tracks (shows raw `ProviderIds` or MB API error)
- OAuth2 PKCE flow for MusicBrainz — no client secret required
- Export matched recordings to a new or existing MB recording collection
- `VITE_MB_BASE_URL` override for testing against a local [musicbrainz-docker](https://github.com/metabrainz/musicbrainz-docker) instance

## Setup

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `VITE_MB_CLIENT_ID` | Yes (for MB sync) | OAuth application client ID. Register at [musicbrainz.org/account/applications/register](https://musicbrainz.org/account/applications/register) with redirect URI `http://localhost:3000/mb-callback` |
| `VITE_MB_BASE_URL` | No | Override the MusicBrainz host, e.g. `http://localhost:5000` for local testing |

## Running

```bash
npm install
npm run dev
```

The app starts at `http://localhost:3000`. On first visit an overlay prompts for your Jellyfin server URL and API key. MusicBrainz connection is optional — needed only to export collections.

## Testing

```bash
npm run test
```

Unit tests cover the pure utility functions in `src/lib/`: duration formatting, array chunking, artist credit formatting, PKCE generation, and OAuth URL construction (29 tests).

For manual testing against a local MusicBrainz instance, set `VITE_MB_BASE_URL=http://localhost:5000` in `.env.local` and follow the [musicbrainz-docker](https://github.com/metabrainz/musicbrainz-docker) setup guide.

## Building

```bash
npm run build
```

## Linting & formatting

```bash
npm run check
```

Uses [Biome](https://biomejs.dev/) for both linting and formatting.

## Architecture

- **Framework**: [TanStack Start](https://tanstack.com/start) (React, SSR shell only — all data fetching is client-side)
- **Routing**: [TanStack Router](https://tanstack.com/router) with `?playlist=<id>` search param for selected playlist
- **Data fetching**: [TanStack Query](https://tanstack.com/query) — per-row MB recording queries with `staleTime: Infinity`
- **Auth**: MusicBrainz OAuth2 PKCE via `SubtleCrypto` (browser-native, no server needed)
- **Storage**: Jellyfin config and MB auth stored in `localStorage` (SSR-safe)
- **Styling**: Tailwind CSS v4 with custom design tokens

### Key files

```
src/lib/
  types.ts         — shared TypeScript interfaces
  config.ts        — SSR-safe localStorage helpers
  jellyfin.ts      — Jellyfin API client
  musicbrainz.ts   — MusicBrainz API client (recordings + collections)
  oauth.ts         — PKCE helpers + token exchange

src/routes/
  index.tsx        — playlists grid + track table + sync dropdown
  settings.tsx     — edit Jellyfin config, connect/disconnect MB
  mb-callback.tsx  — OAuth2 callback handler
```
