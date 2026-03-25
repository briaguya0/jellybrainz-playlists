# TODO

## Test coverage

### `tests/utils.test.ts`

Pure functions, no mocking needed.

- `cn`: merges class names, resolves Tailwind conflicts (e.g. `text-red-500` + `text-blue-500` → `text-blue-500`)
- `parseOverrides`: empty string → `{}`, `null`/non-string → `{}`, valid `"k1:v1,k2:v2"` → correct map, pair missing colon → skipped, pair with empty key or value → skipped, colon in value → everything after first colon is the value
- `serializeOverrides`: empty object → `undefined`, non-empty → `"k:v,..."`, round-trips with `parseOverrides`
- `getErrorMessage`: `Error` instance → `err.message`, string thrown → fallback, `null` → fallback

### `tests/config.test.ts`

Needs `environment: "jsdom"` for `localStorage`. Use `beforeEach(() => localStorage.clear())`.

- round-trip set/get for each type: jellyfin config, mb auth, mb client id, mb client secret, lb auth
- returns `null` for all getters when key is absent
- handles corrupted JSON in localStorage gracefully (returns `null`, does not throw)
- clear functions remove the key so subsequent get returns `null`
- `typeof window === "undefined"` guard: all functions return/noop silently in SSR — test by replacing `window` with `undefined` via `vi.stubGlobal`

### `tests/jellyfin.test.ts` (additions to existing file)

Pure functions — no mocking needed:

- `extractMbArtistId`: returns `MusicBrainzArtist`, `undefined` when absent or no `ProviderIds`
- `extractMbAlbumId`: returns `MusicBrainzAlbum`, `undefined` when absent or no `ProviderIds`
- `playlistThumbnailUrl`: returns `null` when no `Primary` image tag, returns URL string containing correct item id, `fillWidth=96`, `fillHeight=96`, `quality=80`, and `tag` param when present
- `thumbnailUrl`: uses `AlbumId` when present, falls back to `track.Id`; includes `fillWidth=80`, `fillHeight=80`, `quality=80`; includes `tag` param when `AlbumPrimaryImageTag` is set

Network functions — mock `fetch`:

- `resolveUserId`: returns `cfg.userId` directly when already set (no fetch); fetches `/Users` and returns first `Id` when not set; throws on non-ok response; throws when `/Users` returns empty array
- `fetchPlaylists`: sends `IncludeItemTypes=Playlist` and `Recursive=true` params; returns `Items` array; throws on non-ok
- `fetchPlaylistTracks`: sends `UserId` and `Fields=ProviderIds,RunTimeTicks` params; returns `Items` array; throws on non-ok

### `tests/oauth.test.ts` (additions to existing file)

- `exchangeCode`: sends correct `grant_type`, `code`, `redirect_uri`, `code_verifier` in POST body; returns `{ accessToken, refreshToken }`; throws on non-ok
- `fetchMbUsername`: sends `Authorization: Bearer {token}` header; returns `sub` field from response; throws on non-ok

### `tests/musicbrainz.test.ts` (additions to existing file)

- `fetchRecordingsByRecordingIds`: maps `rid:` search results by recording id; returns empty map for empty input; handles chunk boundary exactly at 100
- `fetchCollections`: sends `editor` and `inc=user-collections` params; sends `Authorization` header when access token provided; returns `collections` array
- `fetchCollectionRecordings`: makes multiple paginated requests when `recording-count` exceeds limit=100; accumulates all mbids across pages; sends `Authorization` header
- `deleteRecordingsFromCollection`: sends `DELETE`; sends `client` param; chunks at 400 (test with 401 items → 2 requests); throws on non-ok
- `addRecordingsToCollection`: sends `PUT`; chunks at 400; throws on non-ok
- `createCollection`: sends correct JSON body with `name`, `entity_type: "recording"`, `public` flag; returns `id` from response; returns `null` on 404; returns `null` on 405; returns `null` on `TypeError`

### `tests/listenbrainz.test.ts`

- `fetchLbUsername`: sends `Authorization: Token {token}` header; returns `user_name`; throws when `valid: false`; throws on non-ok (includes response body in message)
- `fetchLbPlaylists`: sends `include_private=true` and `count=100`; unwraps `playlists[].playlist`; throws on non-ok
- `fetchLbPlaylistTracks`: extracts MBIDs from `musicbrainz.org/recording/` identifier URLs; skips non-MB identifiers; handles tracks with multiple identifiers (takes only MB ones); skips empty strings from `.pop()`
- `createLbPlaylist`: sends JSPF structure with `title`, `public`, extension block, and `track` array with correct identifier URLs; returns `playlist_mbid`; throws on non-ok
- `replaceLbPlaylistTracks`: fetches existing tracks first; sends delete POST with `index: 0, count: existing.length` when existing is non-empty; skips delete request when existing is empty; sends add POST with JSPF track array when mbids non-empty; skips add request when mbids is empty; throws on delete failure; throws on add failure
- `appendLbPlaylistTracks`: sends JSPF track array to `.../item/add` endpoint; throws on non-ok

### `tests/useThemeMode.test.ts`

Needs `environment: "jsdom"`. Mock `localStorage` via `vi.stubGlobal` or `jsdom`'s built-in.

- `getStoredMode`: returns `"dark"` / `"light"` / `"auto"` from localStorage; returns `"auto"` as default when key absent or invalid value
- `applyThemeMode`: `"dark"` → adds `dark` class to `document.documentElement`; `"light"` → removes `dark` class; `"auto"` → adds/removes based on `prefers-color-scheme` media query
- `useThemeMode`: initial mode read from localStorage; `setAndApply` updates state, writes to localStorage, and updates DOM class; changing preference fires correct class change

### `tests/useIsMobile.test.ts`

Needs `environment: "jsdom"`.

- initially `true` when `window.innerWidth < 640`; `false` when `>= 640`
- updates when `matchMedia` listener fires with `matches: true` / `matches: false`

### `tests/contexts/JellyfinContext.test.tsx`

Needs `environment: "jsdom"`, `renderHook` wrapped in `JellyfinProvider`.

- `useJellyfin` throws when used outside provider
- initial `cfg` is `null` and `hydrated` is `false` before effect fires
- after effect, `cfg` is populated from `getJellyfinConfig()` and `hydrated` is `true`
- `setCfg` updates context value; subsequent renders see new cfg

### `tests/contexts/MbAuthContext.test.tsx`

Needs `environment: "jsdom"`.

- `useMbAuth` throws when used outside provider
- initial auth, client id, client secret are read from localStorage after mount
- `setAuth` writes to localStorage and updates context
- `clearAuth` removes from localStorage and sets to `null` in context
- same for `setClientId`, `setClientSecret`, `clearClientSecret`

### `tests/contexts/LbAuthContext.test.tsx`

Needs `environment: "jsdom"`.

- `useLbAuth` throws when used outside provider
- initial auth read from localStorage after mount
- `setAuth` writes to localStorage; `clearAuth` removes it

### `tests/useTrackMatching.test.ts`

Needs `environment: "jsdom"`, `renderHook` + `QueryClient` wrapper, `vi.useFakeTimers()`. Mock: `fetchPlaylistTracks`, `fetchRecordingsByTrackIds`, `searchRecordingsByRelease`, `searchRecordingsByArtist`, `fetchRecordingsByRecordingIds`.

One test per scenario using fixtures:

- **exact match**: TID in `recordingMap` → `{ kind: "exact", recording }`
- **stale TID + valid album ID**: TID miss, album search → 1 result → `{ kind: "partial-auto" }`
- **stale TID + stale album ID**: TID miss, album search miss, release lookup, retry → `{ kind: "partial-auto" }`
- **no TID + artist ID, single result**: → `{ kind: "partial-auto" }`
- **no TID + artist ID, multiple results**: → `{ kind: "unresolved", candidates }`
- **no TID + stale artist ID**: artist search miss, lookup, retry → `{ kind: "partial-auto" }`
- **override takes precedence over TID**: `overrides[track.Id]` set on a track that also has a valid TID → `{ kind: "override" }`
- **no artist ID, no TID**: → `{ kind: "unresolved", candidates: [] }`
- **loading — `recordingMap` pending**: tracks loaded, MB lookup not yet done → TID tracks show `{ kind: "loading" }`
- **loading — album search pending**: tracks with album IDs show `{ kind: "loading" }` while album search in flight
- **artist search not enabled until album search settles**: assert `searchRecordingsByArtist` is not called while album search is pending
- **`matchedMbids`**: includes exact matches and resolved overrides; excludes partial-auto; deduplicates
- **`totalPartialAuto`**: counts only `partial-auto` states across all tracks

### `tests/components/Popover.test.tsx`

Needs `environment: "jsdom"`, `@testing-library/react`.

- renders trigger child
- opens popover content on trigger click
- closes on backdrop click
- closes on Escape keydown
- `content` render prop receives a `close` function that works
- desktop: renders as a fixed-position div (not a bottom sheet)
- mobile (`window.innerWidth < 640` + `enableMobile`): renders as a bottom sheet via portal

### `tests/components/SettingsPanel.test.tsx`

Needs `environment: "jsdom"`, all three context providers.

- renders with `createPortal` to `document.body`
- Escape key calls `onClose`
- backdrop click calls `onClose`
- renders ThemeSection, JellyfinSection, MbSection, LbSection

### `tests/components/settings/ThemeSection.test.tsx`

- renders three toggle buttons (Light, Dark, Auto)
- active button reflects current mode from `useThemeMode`
- clicking a button calls `setAndApply` with correct mode

### `tests/components/settings/JellyfinSection.test.tsx`

Needs `useJellyfin` mock or provider with fake localStorage.

- shows current server URL and API key when connected
- save button calls `resolveUserId` then `setCfg` with resolved userId
- shows error message when `resolveUserId` throws
- disconnect button calls `setCfg(null)`

### `tests/components/settings/MbSection.test.tsx`

Needs `useMbAuth` mock or provider.

- shows "Connect" button when no auth
- connect button builds auth URL using `generatePkce` + `buildAuthUrl` and navigates
- shows connected username when auth present
- disconnect button calls `clearAuth`

### `tests/components/settings/LbSection.test.tsx`

Needs `useLbAuth` mock or provider.

- shows token input and save button when not connected
- save calls `fetchLbUsername`, then `setAuth`; shows error on failure
- shows connected username when auth present
- disconnect button calls `clearAuth`

### `tests/components/playlist-selection/ConnectForm.test.tsx`

- renders URL input pre-filled with `http://localhost:8096`
- renders API key input
- submit calls `onConnect` with trimmed URL and API key values

### `tests/components/playlist-selection/PlaylistCard.test.tsx`

- renders playlist name and track count
- renders thumbnail when `imageUrl` provided
- renders placeholder when no image
- `disabled` prop applies correct styling and prevents click

### `tests/components/playlist-selection/PlaylistRow.test.tsx`

- renders playlist name
- click fires `onClick`
- `selected` prop applies selected styling

### `tests/components/playlist-selection/PlaylistSelection.test.tsx`

Needs React Query provider + Jellyfin context mock.

- shows `ConnectForm` when `cfg` is `null` and `hydrated` is `true`
- shows skeleton cards while playlists loading
- renders playlist cards after load
- grid/list toggle switches between card and row layout
- pagination: shows 12 items per page, next/prev buttons work
- empty playlists sorted to end

### `tests/components/playlist-viewer/RecordingInfo.test.tsx`

- renders recording title as a link to `musicbrainz.org/recording/{id}`
- renders formatted artist credits
- renders duration via `msToDisplay`

### `tests/components/playlist-viewer/ThumbnailTooltip.test.tsx`

- trigger renders children
- popover content shows track name, artist, album, duration

### `tests/components/playlist-viewer/MbBadge.test.tsx`

- **partial-auto state**: shows recording title; confirm button fires `onConfirm` with recording id; change button shows MBID input; clear button fires `onOverride` with empty string
- **override state**: shows recording title; change button shows MBID input; clear button fires `onClear`
- MBID input submit fires `onOverride` with entered id

### `tests/components/playlist-viewer/UnresolvedCell.test.tsx`

- shows `?` icon button
- click opens popover
- popover lists candidate recordings
- selecting a candidate fires `onOverride` with recording id and closes popover
- manual MBID input submit fires `onOverride` with entered id

### `tests/components/playlist-viewer/TrackTableRow.test.tsx`

Needs a `matchState` prop for each state:

- `loading`: shows spinner/search icon
- `exact`: shows MB recording icon link
- `partial-auto`: renders `MbBadge`
- `override`: renders `MbBadge` with override styling
- `unresolved`: renders `UnresolvedCell`

### `tests/components/playlist-viewer/TrackTable.test.tsx`

- renders skeleton rows when `isPending` is `true`
- renders one `TrackTableRow` per track after load
- renders column header icons

### `tests/components/playlist-viewer/PlaylistViewer.test.tsx`

Needs `useTrackMatching` mocked.

- returns `null` when `cfg` or `playlistId` missing
- renders playlist name
- renders match summary counts (exact, partial-auto, unresolved)
- renders `TrackTable` with tracks and match states
- `SyncDropdown` and `LbExportButton` present when auth available

### `tests/components/playlist-viewer/SyncDropdown.test.tsx`

Needs `useMbAuth` mock. Mock `fetchCollections`, `fetchCollectionRecordings`, `addRecordingsToCollection`, `deleteRecordingsFromCollection`.

State machine transitions:

- idle → click → shows collection list (fetches collections on open)
- pick collection → append: calls `addRecordingsToCollection`, shows progress then done
- pick collection → replace: shows replace-confirm view; confirm downloads backup then replaces; shows progress then done
- done: shows success state with external link to collection
- error: shows error message on any failure
- duplicate warning shown when `matchedMbids` has fewer unique entries than tracks

### `tests/components/playlist-viewer/LbExportButton.test.tsx`

Needs `useLbAuth` mock. Mock `fetchLbPlaylists`, `createLbPlaylist`, `replaceLbPlaylistTracks`, `appendLbPlaylistTracks`, `fetchLbPlaylistTracks`.

State machine transitions:

- idle → click → shows options (create new, export to existing)
- create new: privacy toggle; submit calls `createLbPlaylist`; done state with link
- export to existing: fetches playlists on open; pick playlist → append or replace flows
- replace: downloads backup, then calls `replaceLbPlaylistTracks`; done state
- error: shows error message on failure

### `tests/routes/mb-callback.test.tsx`

Needs `environment: "jsdom"`, TanStack Router test utilities or just render with mock router.

- missing `code` param → renders error message
- missing PKCE verifier in sessionStorage → renders error message
- `exchangeCode` throws → renders error message
- success: calls `exchangeCode`, then `fetchMbUsername`, calls `setAuth`, redirects to `"/"`

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
