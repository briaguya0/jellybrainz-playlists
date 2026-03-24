# TODO

## Contexts for connected state (fixes a real bug)

### The problem
`jellyfinConfig` and `mbAuth` are each read independently from `localStorage` in multiple components, with no shared signal when one of them changes:

- `PlaylistsPage/index.tsx` hydrates `jellyfinConfig` from `localStorage` on mount and passes it down as props.
- `Header.tsx > SettingsPanel` independently reads `jellyfinConfig` from `localStorage` on open, and on save writes updated credentials back to `localStorage` via `setJellyfinConfig()` — but `PlaylistsPage`'s React state is never notified. Saving new server credentials in the settings panel leaves the playlists query running with the old config until a full page reload.
- `PlaylistViewer` reads `mbAuth` from `localStorage` on mount. Disconnecting MusicBrainz in the settings panel calls `clearMbAuth()` on `localStorage` but doesn't clear `PlaylistViewer`'s `mbAuth` state, so the sync button still appears logged-in.
- `SyncDropdown` also receives `mbAuth` as a prop; after an OAuth callback completes and writes a new token to `localStorage`, existing `PlaylistViewer` instances won't pick it up.

### The fix: two contexts in `__root.tsx`
Lift both pieces of state into React contexts that live at the root layout level, so all components in the tree share one source of truth:

```tsx
// src/contexts/JellyfinContext.tsx
const JellyfinContext = createContext<{
  cfg: JellyfinConfig | null;
  setCfg: (cfg: JellyfinConfig | null) => void;
}>(...)

// src/contexts/MbAuthContext.tsx
const MbAuthContext = createContext<{
  mbAuth: MbAuth | null;
  setMbAuth: (auth: MbAuth | null) => void;
}>(...)
```

Both contexts hydrate from `localStorage` on mount (same `useEffect` pattern currently in `PlaylistsPage`). `__root.tsx` wraps the outlet with both providers. `SettingsPanel`, `PlaylistsPage`, `PlaylistViewer`, `SyncDropdown`, and `mb-callback.tsx` all call `useContext(JellyfinContext)` / `useContext(MbAuthContext)` instead of reading `localStorage` directly.

Benefits beyond correctness:
- `PlaylistsPage` no longer needs to pass `cfg` as a prop to `PlaylistSelection` and `PlaylistViewer` — they read from context directly, reducing prop drilling
- `ConnectForm` can write to context on success without needing the `onConnect` callback prop
- The `mb-callback` route can update `MbAuthContext` after OAuth completes so `PlaylistViewer` picks it up without a reload

## styles.css cleanup

### Remove shadcn variable baggage
The lower half of `:root` and `.dark` (lines 30–113) — `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1` through `--chart-5`, `--radius`, and all `--sidebar-*` — are shadcn defaults that were never replaced with brand values. The entire `@theme inline` block (lines 116–154) that maps them into Tailwind tokens, and the `@layer base` block at the bottom (lines 387–395) that applies `border-border` and `outline-ring/50` globally, are also shadcn leftovers. None of this is referenced in our components. Remove it all and replace `@layer base` with whatever global resets we actually want (probably just `* { box-sizing: border-box; }`).

**Watch out:** `@layer base` currently sets `body { background-color: var(--background) }`, which conflicts with the earlier hand-written `body` rule. The hand-written rule wins due to cascade order, but the conflict is confusing.

### Rename `island-shell` and `feature-card` to something semantic
- `island-shell` — used for any glassmorphism panel: cards, popovers, dropdowns, the header, the footer chip, buttons. A more descriptive name would be `glass-panel` or `glass-surface`. "Island" doesn't communicate what the class does to a new reader.
- `feature-card` — always applied *on top of* `island-shell` as a modifier that adjusts the shadow and adds a hover-lift. It's exclusively used on playlist cards. A clearer name would be `card-hover` or `interactive-card`, and the relationship to `glass-panel` should be visible (maybe `glass-panel--card` or just merged).

### Register custom CSS variables as Tailwind tokens
Components use `text-[var(--text)]`, `border-[var(--stroke)]`, `bg-[var(--surface)]`, `bg-[var(--hover-bg)]`, etc. throughout. These arbitrary-value references could become real Tailwind utilities (`text-app-text`, `border-stroke`, `bg-surface`) by adding entries in `@theme inline`:
```css
--color-app-text: var(--text);
--color-app-muted: var(--text-muted);
--color-accent: var(--accent);
--color-accent-text: var(--accent-text);
--color-surface: var(--surface);
--color-surface-strong: var(--surface-strong);
--color-stroke: var(--stroke);
--color-hover: var(--hover-bg);
```
Then `text-[var(--text)]` → `text-app-text`, `border-[var(--stroke)]` → `border-stroke`, etc. This also means the design tokens have a single source of truth in `:root` / `.dark`, not scattered as inline CSS variable references across every component.

### Remove unused CSS variables
`--chip-bg` and `--chip-stroke` don't appear in any component. `--label` is only used in `.island-kicker`. Audit and prune.

### Replace `page-wrap` with a Tailwind `@utility`
`page-wrap` is two properties: `width: min(1080px, calc(100% - 2rem)); margin-inline: auto`. Tailwind 4 supports `@utility` blocks that register custom utilities usable alongside standard classes:
```css
@utility page-wrap {
  width: min(1080px, calc(100% - 2rem));
  margin-inline: auto;
}
```
This keeps it as a class (fine — it's used in one place) but makes it an official Tailwind utility rather than a free-floating rule, so it participates in Tailwind's tree-shaking.

### Inline `site-footer` and `island-kicker`
`site-footer` is two properties (border-top + background). `island-kicker` is a fixed typographic style used in one place (Header). Both could be inlined as Tailwind utilities directly in the component rather than maintained as named CSS classes.

### `rise-in` and `animate-slide-in-right` — register as Tailwind animate tokens
These are custom keyframe animations. They work fine as CSS classes, but Tailwind 4 lets you register them as theme tokens so they can be used as `animate-rise-in` alongside built-ins. Low priority — the current classes are clear enough.

### `nav-link` — keep in CSS
The animated underline uses `::after` with `scaleX` transition. This genuinely needs CSS and can't be done with Tailwind utilities alone. Keep it as-is, just rename it if `island-shell` gets renamed (for consistency).

## Popover cleanup

### The problem
Every popover component (`MbBadge`, `UnresolvedCell`, `ThumbnailTooltip`) manually wires up the same mechanical boilerplate: destructure six values from `usePopoverPosition`, attach `ref={buttonRef}` and `onClick={handleToggle}` to the trigger, write the `open && createPortal(isMobile ? <sheet> : <positioned div>)` branch, attach `ref={popoverRef}`, and apply `style={{...pos}}`. The caller has to know about and correctly wire all of it. `MbBadge` and `UnresolvedCell` additionally duplicate the entire mobile bottom-sheet JSX (backdrop div + `fixed inset-x-0 bottom-0` sheet container) identically. And because content needs to call `setOpen(false)` to close itself after an action, it's coupled to the hook's internals.

### The fix: a `Popover` component
Replace `usePopoverPosition` with a `Popover` component that owns all the mechanics. The hook becomes an implementation detail inside `Popover`, invisible to callers.

```tsx
<Popover
  placement="above-right"
  enableMobile
  className="w-72"
  content={(close) => <MbBadgeContent onConfirm={() => { onConfirm?.(); close(); }} ... />}
>
  <button ref={...} aria-label="...">  {/* trigger */}
    <img ... />
  </button>
</Popover>
```

`Popover` receives the trigger as `children`, injects the ref and click handler via `cloneElement` (or a `<Popover.Trigger>` slot), and renders the portal with the mobile/desktop branch internally. The `content` render prop receives a `close` callback so content can dismiss the popover without touching any hook internals.

After this change:
- `MbBadge` and `UnresolvedCell` become just their trigger markup + content JSX — no refs, no `createPortal`, no `isMobile` branching
- `ThumbnailTooltip` simplifies similarly
- `usePopoverPosition` either moves inside `Popover` entirely or is removed
- The biome-ignore comments for the backdrop div live in one place (`Popover`) instead of two

The `content` render-prop pattern also makes it easier to compose — `MbBadge` currently has two sub-views (`popoverContent` switches on `showChange`); those can become two separate components passed in without needing access to `setOpen`.

## Code cleanup

Possible follow-up cleanup after the index.tsx → component tree refactor.

### Remove manual `useMemo` calls — React Compiler handles this
All `useMemo` in the codebase is redundant with React Compiler active:
- `PlaylistViewer.tsx:21` — `parseOverrides(rawOverrides)`
- `useTrackMatching.ts` — `trackMbids`, `tracksForPartialSearch`, `overrideMbids`, `matchStates`, `matchedMbids`, `totalPartialAuto`

Remove them all. The compiler will memoize these automatically and do a better job than manual hints. Keeping them adds maintenance burden and implies the compiler can't be trusted.

### Shared popover pattern in MbBadge / UnresolvedCell
Both components still duplicate the mobile bottom-sheet JSX almost verbatim (the backdrop `div`, the `fixed inset-x-0 bottom-0` sheet container, and the `createPortal` call). A small `MobileSheet` or `PopoverPortal` component that accepts `open`, `isMobile`, `onClose`, and `children` could eliminate this. Low priority since the logic is simple, but worth it if a third component ever needs the same pattern.

### PlaylistsPage runs the playlists query twice
`PlaylistsPage/index.tsx` re-runs the `["playlists", cfg]` query only to look up the selected playlist name for `PlaylistViewer`. This is cached by React Query so there's no extra network request, but it's slightly inelegant. Alternatives:
- Move the name lookup into `PlaylistViewer` itself (pass just `playlistId`, look up name from the cached query)
- Have `PlaylistSelection` surface the selected playlist via a callback so `PlaylistsPage` doesn't need its own query

### `useTrackMatching` disabled-query edge case
When `PlaylistViewer` renders without a selected playlist, `useTrackMatching` is called with `cfg ?? { url: "", apiKey: "" }` and `playlistId ?? ""`. The queries are all gated on `enabled: !!cfg.userId` / `enabled: trackMbids.length > 0` etc. so nothing actually fires, but passing dummy values is a bit of a smell. Consider accepting `cfg: JellyfinConfig | null` and `playlistId: string | undefined` directly and handling the null checks inside the hook.

### `PlaylistViewer` null guard placement
The `if (!cfg || !playlistId) return null` is at the bottom of the component, after all hooks have been called. This is correct (hooks must not be called conditionally) but reads awkwardly — a reader expects early returns at the top. A comment explaining the constraint would make the intent clear.

### Review `biome-ignore` suppressions
Several lint rules are suppressed with `biome-ignore` comments — audit whether each is truly justified or can be fixed properly:

- `lint/suspicious/noArrayIndexKey` (×2 in `PlaylistSelection.tsx`) — skeleton placeholders use array index as key. Legitimate since skeletons have no identity, but worth confirming no better key exists.
- `lint/security/noDangerouslySetInnerHtml` (`__root.tsx:50`) — inline script for SSR-safe theme init. Likely unavoidable; verify the script content is static and not interpolating user data.
- `lint/a11y/noStaticElementInteractions` + `lint/a11y/useKeyWithClickEvents` (×2 each in `MbBadge.tsx` and `UnresolvedCell.tsx`) — modal backdrop `<div onClick={...}>`. These could be fixed by using `<button>` or `<dialog>` with proper keyboard handling, or by adding a `role="presentation"` with `onKeyDown`. Will be resolved naturally if the Popover component cleanup (above) centralizes the backdrop into one place.
- `lint/a11y/noAutofocus` (`MbBadge.tsx:91`) — intentional focus when user opens the change panel. Probably legitimate UX; document why.

### Split `SettingsPanel` into section components
`SettingsPanel.tsx` has three named sections — Theme, Jellyfin, and MusicBrainz — each with its own state and logic. They could become `ThemeSection.tsx`, `JellyfinSection.tsx`, and `MbSection.tsx` (or similar), with `SettingsPanel` reduced to layout + the `createPortal` wrapper. The theme helpers (`getStoredMode`, `applyThemeMode`, `useThemeMode`) would move into `src/hooks/useThemeMode.ts`. Low priority — the file is manageable at its current size — but worth doing before adding more settings.

### Constant for mobile breakpoint
`640` (the `window.innerWidth < 640` check in `usePopoverPosition`) and the `sm:` Tailwind breakpoint are the same value but defined in two places. A named constant or a shared breakpoint utility would make them easier to keep in sync if the breakpoint ever changes.

### `getErrorMessage` utility
The pattern `err instanceof Error ? err.message : "fallback string"` appears in at least `SettingsPanel.tsx`, `ConnectForm.tsx`, `mb-callback.tsx`, and `SyncDropdown.tsx`. Extract to `src/lib/utils.ts`:
```ts
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
```

### Silent error swallow in `SyncDropdown` collections fetch
`SyncDropdown.tsx` fetches the user's MB collections with `.then(setCollections, () => {})` — errors are silently discarded. If the fetch fails, the "Export to existing collection" flow will just show an empty list with no feedback. At minimum, log the error; ideally surface it in the UI.

### `onClose` re-registers keydown listener every render
`Header.tsx` passes `onClose={() => setPanelOpen(false)}` as an inline arrow to `SettingsPanel`. `SettingsPanel` has `[onClose]` in the dependency array of its Escape-key `useEffect`, so the listener is removed and re-added on every render of `Header`. In practice this is harmless since it's fast, but it's a smell. Fix by wrapping with `useCallback` in `Header` or removing `onClose` from the effect dependency (it's stable enough that `useRef` trick would work too).

### Modal backdrop opacity inconsistency
`SettingsPanel.tsx` uses `bg-black/30` for its backdrop; `MbBadge.tsx` and `UnresolvedCell.tsx` use `bg-black/40`. Pick one and standardize — this will be easier once the Popover cleanup centralizes the backdrop into one place.

### Hardcoded version in MB user-agent string
`src/lib/musicbrainz.ts` has `const MB_CLIENT = "jellybrainz-playlists-0.1.0"` with the version hardcoded. It won't stay in sync with `package.json`. Either import the version from `package.json` (Vite supports this with `import pkg from "../../package.json"`) or at least add a comment flagging it as needing manual updates.

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
