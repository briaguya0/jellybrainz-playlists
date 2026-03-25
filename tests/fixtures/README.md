# Test Fixtures

Each subdirectory is a scenario covering one track-matching case end-to-end.
All JSON files are real captured responses — Jellyfin track data and MusicBrainz API responses.

`jellyfin-track.json` in each scenario is a single item extracted from the `Items` array
returned by the playlist tracks endpoint (`GET /Users/{userId}/Items?ParentId={playlistId}`).
The full response envelope (`{ Items: [...] }`) is not included.

`UserData` and `ServerId` are excluded from all Jellyfin fixtures — `UserData` contains
personal playback history; `ServerId` uniquely identifies the server instance.

---

## `exact-match/`
Track has a valid, current `MusicBrainzTrack` ID that resolves directly.

| File | Description |
|------|-------------|
| `jellyfin-track.json` | Jellyfin track object with a valid `MusicBrainzTrack` provider ID |
| `mb-tid-search.json` | `GET /ws/2/recording/?query=tid:{trackMbid}&limit=N&fmt=json` — returns 1 recording |

**Expected result:** `exact`

---

## `stale-tid-valid-release/`
Track has a stale `MusicBrainzTrack` ID (tid: returns nothing) but a current `MusicBrainzAlbum` ID (reid: works directly).

| File | Description |
|------|-------------|
| `jellyfin-track.json` | Jellyfin track object with stale `MusicBrainzTrack` and valid `MusicBrainzAlbum` IDs |
| `mb-tid-search.json` | `GET /ws/2/recording/?query=tid:{staleTrackMbid}&limit=N&fmt=json` — returns 0 results |
| `mb-reid-search.json` | `GET /ws/2/recording/?query=reid:{releaseMbid} AND recording:"{title}"&limit=5&fmt=json` — returns 1 recording |

**Note:** `jellyfin-track.json` is a real Mountain Goats track from the same playlist as the `stale-tid-stale-release` scenario, with `MusicBrainzTrack` left as-is (stale) and `MusicBrainzAlbum` replaced with the current release MBID (`a27c4e85-9ed7-4fc4-8367-90ee32ddd8b6`) to simulate the case where the album ID is already current. `mb-tid-search.json` is the real response for the stale track MBID (0 results). `mb-reid-search.json` is the real response for the current release MBID + track title.

**Expected result:** `partial-auto`

---

## `stale-tid-stale-release/`
Track has a stale `MusicBrainzTrack` ID and a stale `MusicBrainzAlbum` ID (release was merged). The release lookup resolves the current MBID and the retry succeeds.

| File | Description |
|------|-------------|
| `jellyfin-track.json` | Jellyfin track object with stale `MusicBrainzTrack` and stale `MusicBrainzAlbum` IDs |
| `mb-tid-search.json` | `GET /ws/2/recording/?query=tid:{staleTrackMbid}&limit=N&fmt=json` — returns 0 results |
| `mb-reid-search-stale.json` | `GET /ws/2/recording/?query=reid:{staleReleaseMbid} AND recording:"{title}"&limit=5&fmt=json` — returns 0 results |
| `mb-release-lookup.json` | `GET /ws/2/release/{staleReleaseMbid}?fmt=json` — response `id` field contains the current MBID |
| `mb-reid-search-current.json` | `GET /ws/2/recording/?query=reid:{currentReleaseMbid} AND recording:"{title}"&limit=5&fmt=json` — returns 1 recording |

**Expected result:** `partial-auto`

---

## `no-tid-single-result/`
Track has no `MusicBrainzTrack` ID. Artist + title search returns exactly one candidate.

| File | Description |
|------|-------------|
| `jellyfin-track.json` | Jellyfin track object with no `MusicBrainzTrack` ID, has `MusicBrainzArtist` ID |
| `mb-arid-search.json` | `GET /ws/2/recording/?query=arid:{artistMbid} AND recording:"{title}"&limit=5&fmt=json` — returns 1 recording |

**Expected result:** `partial-auto`

---

## `no-tid-multiple-results/`
Track has no `MusicBrainzTrack` ID. Artist + title search returns multiple candidates.

| File | Description |
|------|-------------|
| `jellyfin-track.json` | Jellyfin track object with no `MusicBrainzTrack` ID, has `MusicBrainzArtist` ID |
| `mb-arid-search.json` | `GET /ws/2/recording/?query=arid:{artistMbid} AND recording:"{title}"&limit=5&fmt=json` — returns 2+ recordings |

**Expected result:** `unresolved` with candidates array

---

## `no-tid-stale-artist/`
Track has no `MusicBrainzTrack` ID and a stale `MusicBrainzArtist` ID (artist was merged in MB). The initial `arid:` search returns 0 results; the artist lookup resolves the current MBID and the retry succeeds.

| File | Description |
|------|-------------|
| `jellyfin-track.json` | Jellyfin track object with no `MusicBrainzTrack` ID and a stale `MusicBrainzArtist` ID |
| `mb-arid-search-stale.json` | `GET /ws/2/recording/?query=arid:{staleArtistMbid} AND recording:"{title}"&limit=5&fmt=json` — returns 0 results |
| `mb-artist-lookup.json` | `GET /ws/2/artist/{staleArtistMbid}?fmt=json` — response `id` field contains the current MBID |
| `mb-arid-search-current.json` | `GET /ws/2/recording/?query=arid:{currentArtistMbid} AND recording:"{title}"&limit=5&fmt=json` — returns 1 recording |

**Expected result:** `partial-auto`
