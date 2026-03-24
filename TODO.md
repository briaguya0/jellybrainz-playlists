# TODO

## Export to MusicBrainz

The current sync dropdown has "Export to new collection" and "Export to existing collection" as two separate manual choices. The original Python script (`../sync.py`) had a smarter flow worth revisiting:

- Auto-match: if a collection named exactly after the playlist already exists, use it — skip the choice entirely
- Create as private by default
- Always append (PUT), never clear existing recordings first

### Things to decide before implementing

**Auto-match vs manual choice**
- Always show the choice explicitly — never silently reuse a collection
- A user may have intentionally diverged the Jellyfin playlist and the MB collection and want to keep both
- UI: always present "Create new collection" and "Add to existing…" as explicit options
- When picking an existing collection, show a link to `https://musicbrainz.org/collection/{mbid}` so the user can verify it's the right one before committing

**Append vs replace**
- Expose both options explicitly in the UI — neither is always right
- Append: user is building a "dumping ground" collection across multiple playlists, wants to accumulate
- Replace: user changed a playlist and wants the MB collection to reflect exactly what's in Jellyfin now (DELETE existing recordings, then PUT the new set)
- Replace flow: `DELETE /ws/2/collection/{mbid}/recordings/{ids}` then PUT — need to fetch current collection contents first to know what to delete
- **Before any DELETE, always export a backup:** generate a downloadable JSON or plain text file of all MBIDs currently in the collection so the user can restore manually if needed. Make this file easy to find/download — show it in the UI before confirming the replace.

**Public vs private**
- Python script hardcodes `public: False`
- UI should probably expose this as a toggle, defaulting to private
- MB API field: `"public": true/false` in the POST body when creating

**Collection type**
- Always `entity_type: "recording"` — no need to expose this

**Duplicate recordings**
- MB collections are sets — adding the same MBID twice is likely a no-op, so the collection won't reflect a playlist where one track appears multiple times
- Need to verify this behavior against the API
- If deduplication is unavoidable, surface it clearly: "X duplicate recordings were collapsed" so the user knows the collection won't be a 1:1 match of the playlist
- Consider writing duplicate info into the MB collection description (e.g. "Exported from Jellyfin playlist 'Road Trip'. Duplicates: 'I'm Gonna Be (500 Miles)' x30") — check whether the collection POST/PUT API accepts a description field

### MB API notes (from sync.py)
- Create: `POST /ws/2/collection` with `{ name, entity_type: "recording", public: bool }`
- Add recordings: `PUT /ws/2/collection/{mbid}/recordings/{mbid;mbid;...}` in batches of 400
- Delete recordings (for replace flow): `DELETE /ws/2/collection/{mbid}/recordings/{mbid;mbid;...}`
- List user collections: `GET /ws/2/collection?editor={username}&inc=user-collections&fmt=json`
- CORS on PUT/DELETE still unverified — may need a thin server function if blocked
