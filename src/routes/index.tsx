import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ExternalLink,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getJellyfinConfig,
  getMbAuth,
  setJellyfinConfig as storeJellyfinConfig,
} from "../lib/config";
import {
  extractMbArtistId,
  extractMbRecordingId,
  fetchPlaylists,
  fetchPlaylistTracks,
  playlistThumbnailUrl,
  resolveUserId,
  thumbnailUrl,
  ticksToDisplay,
} from "../lib/jellyfin";
import {
  addRecordingsToCollection,
  createCollection,
  fetchCollections,
  fetchRecordingsByRecordingIds,
  fetchRecordingsByTrackIds,
  formatArtistCredits,
  msToDisplay,
  searchRecordingsByArtist,
} from "../lib/musicbrainz";
import { buildAuthUrl, generatePkce } from "../lib/oauth";
import type {
  JellyfinConfig,
  JellyfinPlaylist,
  JellyfinTrack,
  MbAuth,
  MbCollection,
  MbRecording,
} from "../lib/types";

// ─── url helpers ─────────────────────────────────────────────────────────────

function parseOverrides(raw: unknown): Record<string, string> {
  if (typeof raw !== "string" || !raw) return {};
  return Object.fromEntries(
    raw.split(",").flatMap((pair) => {
      const idx = pair.indexOf(":");
      if (idx === -1) return [];
      const k = pair.slice(0, idx);
      const v = pair.slice(idx + 1);
      return k && v ? [[k, v]] : [];
    }),
  );
}

function serializeOverrides(
  overrides: Record<string, string>,
): string | undefined {
  const entries = Object.entries(overrides);
  if (!entries.length) return undefined;
  return entries.map(([k, v]) => `${k}:${v}`).join(",");
}

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    playlist: typeof search.playlist === "string" ? search.playlist : undefined,
    overrides:
      typeof search.overrides === "string" ? search.overrides : undefined,
  }),
  component: PlaylistsPage,
});

// ─── match state ─────────────────────────────────────────────────────────────

type TrackMatchState =
  | { kind: "loading" }
  | { kind: "exact"; recording: MbRecording }
  | { kind: "partial-auto"; recording: MbRecording }
  | { kind: "override"; recording: MbRecording | undefined }
  | { kind: "unresolved"; candidates: MbRecording[] };

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="island-shell feature-card rounded-xl border p-5 animate-pulse">
      <div className="h-4 w-3/5 rounded-md bg-[var(--stroke)] mb-3" />
      <div className="h-3 w-2/5 rounded-md bg-[var(--stroke)]" />
    </div>
  );
}

// ─── connect form ─────────────────────────────────────────────────────────────

function ConnectForm({
  onConnected,
}: {
  onConnected: (cfg: JellyfinConfig) => void;
}) {
  const [url, setUrl] = useState("http://localhost:8096");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      const cfg: JellyfinConfig = { url, apiKey };
      const userId = await resolveUserId(cfg);
      const cfgWithUser: JellyfinConfig = { ...cfg, userId };
      storeJellyfinConfig(cfgWithUser);
      onConnected(cfgWithUser);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to Jellyfin",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="island-shell rounded-2xl p-8 w-full max-w-sm rise-in">
      <h2 className="text-lg font-semibold text-[var(--text)] mb-1">
        Connect to Jellyfin
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Enter your Jellyfin server URL and API key to browse your playlists.
      </p>
      <form onSubmit={handleConnect} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Server URL
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            placeholder="http://localhost:8096"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            API Key
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            placeholder="Paste your API key"
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={connecting}
          className="island-shell rounded-lg px-4 py-2 text-sm font-semibold text-[var(--accent-text)] enabled:hover:text-[var(--text)] disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      </form>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Find your API key in the Jellyfin admin dashboard under{" "}
        <strong>Administration → API Keys</strong>.
      </p>
    </div>
  );
}

// ─── playlist card / row ─────────────────────────────────────────────────────

function PlaylistCard({
  playlist,
  cfg,
  selected,
  disabled,
  onClick,
}: {
  playlist: JellyfinPlaylist;
  cfg: JellyfinConfig;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const imgUrl = playlistThumbnailUrl(cfg, playlist);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={
        disabled
          ? { filter: "grayscale(1) opacity(0.45)", cursor: "not-allowed" }
          : undefined
      }
      className={`island-shell feature-card rounded-xl border p-4 text-left w-full rise-in flex items-center gap-3 cursor-pointer ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
          : "border-[var(--stroke)]"
      }`}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt=""
          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[var(--stroke)]"
          loading="lazy"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg shrink-0 bg-[var(--stroke)]" />
      )}
      <div className="min-w-0">
        <p className="font-semibold text-[var(--text)] truncate">
          {playlist.Name}
        </p>
        {playlist.ChildCount != null && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {playlist.ChildCount} tracks
          </p>
        )}
      </div>
    </button>
  );
}

function PlaylistRow({
  playlist,
  selected,
  disabled,
  onClick,
}: {
  playlist: JellyfinPlaylist;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={
        disabled
          ? { filter: "grayscale(1) opacity(0.45)", cursor: "not-allowed" }
          : undefined
      }
      className={`island-shell feature-card rounded-lg border px-4 py-3 text-left w-full rise-in flex items-center gap-4 cursor-pointer ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
          : "border-[var(--stroke)]"
      }`}
    >
      <span className="font-semibold text-[var(--text)] flex-1 truncate">
        {playlist.Name}
      </span>
      {playlist.ChildCount != null && (
        <span className="text-xs text-[var(--text-muted)] shrink-0">
          {playlist.ChildCount} tracks
        </span>
      )}
    </button>
  );
}

// ─── recording info ───────────────────────────────────────────────────────────

function RecordingInfo({ recording }: { recording: MbRecording }) {
  return (
    <a
      href={`https://musicbrainz.org/recording/${recording.id}`}
      target="_blank"
      rel="noreferrer"
      className="group min-w-0 flex-1"
    >
      <p className="text-sm font-medium text-[var(--text)] truncate flex items-center gap-1">
        <span className="truncate">{recording.title}</span>
        <ExternalLink
          size={10}
          className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
        />
      </p>
      <p className="text-xs text-[var(--text-muted)] truncate">
        {[
          formatArtistCredits(recording["artist-credit"]),
          recording.length != null ? msToDisplay(recording.length) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </a>
  );
}

// ─── mb badge (corner dot on matched/confirmed icons) ─────────────────────────

function MbBadge({
  kind,
  recording,
  onConfirm,
  onOverride,
  onClear,
}: {
  kind: "partial-auto" | "override";
  recording: MbRecording | undefined;
  onConfirm?: () => void;
  onOverride: (mbid: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [manualMbid, setManualMbid] = useState("");
  const [pos, setPos] = useState<{ bottom: number; right: number }>({
    bottom: 0,
    right: 0,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setShowChange(false);
      setManualMbid("");
      return;
    }
    function close(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - r.top + 8,
        right: window.innerWidth - r.right,
      });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative w-8 h-8">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={
          kind === "partial-auto"
            ? "Partial match — click to review"
            : "Confirmed match — click to change"
        }
        className="w-full h-full cursor-pointer"
      >
        <img
          src="/mb-recording-icon.svg"
          width={32}
          height={32}
          alt="MusicBrainz recording"
        />
      </button>
      <span
        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)] pointer-events-none ${
          kind === "partial-auto" ? "bg-amber-400" : "bg-green-500"
        }`}
      />
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ bottom: pos.bottom, right: pos.right }}
            className="fixed z-50 island-shell rounded-xl border border-[var(--stroke)] p-4 w-72 rise-in"
          >
            {!showChange ? (
              <>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  {kind === "partial-auto"
                    ? "Matched via artist + title search"
                    : "Manually confirmed"}
                </p>
                {recording && (
                  <>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {recording.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mb-3">
                      {formatArtistCredits(recording["artist-credit"])}
                    </p>
                  </>
                )}
                <div className="flex gap-2">
                  {kind === "partial-auto" && (
                    <button
                      type="button"
                      onClick={() => {
                        onConfirm?.();
                        setOpen(false);
                      }}
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowChange(true)}
                    className="flex-1 rounded-lg island-shell border border-[var(--stroke)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    Change
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Enter MusicBrainz recording ID
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualMbid) {
                      onOverride(manualMbid.trim());
                      setOpen(false);
                    }
                  }}
                  className="flex flex-col gap-2"
                >
                  <input
                    type="text"
                    value={manualMbid}
                    onChange={(e) => setManualMbid(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    // biome-ignore lint/a11y/noAutofocus: intentional focus when user opens change panel
                    autoFocus
                    className="w-full rounded-lg border-2 border-[var(--stroke)] bg-[var(--hover-bg)] px-3 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChange(false)}
                      className="rounded-lg island-shell border border-[var(--stroke)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClear();
                        setOpen(false);
                      }}
                      className="rounded-lg island-shell border border-[var(--stroke)] px-3 py-1.5 text-sm text-red-500 hover:text-red-400"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={!manualMbid}
                      className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white enabled:hover:opacity-90 disabled:opacity-30"
                    >
                      Apply
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── unresolved cell (? icon + picker popover) ────────────────────────────────

function UnresolvedCell({
  candidates,
  onOverride,
}: {
  candidates: MbRecording[];
  onOverride: (mbid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [manualMbid, setManualMbid] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setManualMbid("");
      return;
    }
    function close(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label="No MusicBrainz match — click to search or enter MBID"
        className="relative w-8 h-8 cursor-pointer"
      >
        <img
          src="/mb-blank-icon.svg"
          width={32}
          height={32}
          alt="No MusicBrainz match"
        />
        <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold leading-none">
          ?
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 island-shell rounded-xl border border-[var(--stroke)] p-4 w-80 rise-in"
          >
            {candidates.length > 0 && (
              <>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Possible matches
                </p>
                <div className="space-y-1 mb-3">
                  {candidates.map((rec) => (
                    <div key={rec.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onOverride(rec.id);
                          setOpen(false);
                        }}
                        className="flex-1 min-w-0 text-left rounded-lg px-3 py-2 hover:bg-[var(--surface)] text-sm"
                      >
                        <p className="font-medium text-[var(--text)] truncate">
                          {rec.title}
                          {rec.length ? (
                            <span className="ml-1 font-normal text-[var(--text-muted)]">
                              {msToDisplay(rec.length)}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {formatArtistCredits(rec["artist-credit"])}
                        </p>
                        {rec.releases?.[0] && (
                          <p className="text-xs text-[var(--text-muted)] truncate opacity-60">
                            {[
                              rec.releases[0].title,
                              rec.releases[0].date?.slice(0, 4),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </button>
                      <a
                        href={`https://musicbrainz.org/recording/${rec.id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="View on MusicBrainz"
                        className="shrink-0 p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface)]"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ))}
                </div>
                <hr className="border-[var(--stroke)] mb-3" />
              </>
            )}
            <p className="text-xs text-[var(--text-muted)] mb-2">
              Enter MusicBrainz recording ID
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualMbid) {
                  onOverride(manualMbid.trim());
                  setOpen(false);
                }
              }}
              className="flex flex-col gap-2"
            >
              <input
                type="text"
                value={manualMbid}
                onChange={(e) => setManualMbid(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-lg border-2 border-[var(--stroke)] bg-[var(--hover-bg)] px-3 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={!manualMbid}
                className="w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white enabled:hover:opacity-90 disabled:opacity-30"
              >
                Apply
              </button>
            </form>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── track table row ─────────────────────────────────────────────────────────

function TrackTableRow({
  track,
  cfg,
  matchState,
  onSetOverride,
  onClearOverride,
}: {
  track: JellyfinTrack;
  cfg: JellyfinConfig;
  matchState: TrackMatchState;
  onSetOverride: (jellyfinId: string, mbid: string) => void;
  onClearOverride: (jellyfinId: string) => void;
}) {
  const recording =
    matchState.kind === "exact" ||
    matchState.kind === "partial-auto" ||
    matchState.kind === "override"
      ? matchState.recording
      : undefined;

  return (
    <tr className="border-b border-[var(--stroke)] last:border-0 hover:bg-[var(--surface)]/40">
      {/* Jellyfin: thumbnail + title/artist/duration */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={thumbnailUrl(cfg, track)}
            alt=""
            className="w-10 h-10 rounded shrink-0 bg-[var(--stroke)] object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)] truncate">
              {track.Name}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {[
                track.Artists?.join(", "),
                track.RunTimeTicks != null
                  ? ticksToDisplay(track.RunTimeTicks)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </td>
      {/* MB */}
      <td className="px-4 py-3">
        {matchState.kind === "loading" && (
          <div className="flex items-center gap-2 min-w-0 animate-pulse">
            <div className="relative shrink-0 w-8 h-8">
              <img src="/mb-blank-icon.svg" width={32} height={32} alt="" />
              <span className="absolute inset-0 flex items-center justify-center">
                <Search size={16} className="text-white" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-3 w-32 rounded bg-[var(--stroke)] mb-1.5" />
              <div className="h-2.5 w-20 rounded bg-[var(--stroke)]" />
            </div>
          </div>
        )}
        {(matchState.kind === "exact" ||
          matchState.kind === "partial-auto" ||
          matchState.kind === "override") && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0">
              {matchState.kind === "exact" ? (
                <img
                  src="/mb-recording-icon.svg"
                  width={32}
                  height={32}
                  alt=""
                />
              ) : matchState.kind === "partial-auto" ? (
                <MbBadge
                  kind="partial-auto"
                  recording={matchState.recording}
                  onConfirm={() =>
                    onSetOverride(track.Id, matchState.recording.id)
                  }
                  onOverride={(mbid) => onSetOverride(track.Id, mbid)}
                  onClear={() => onClearOverride(track.Id)}
                />
              ) : matchState.recording ? (
                <MbBadge
                  kind="override"
                  recording={matchState.recording}
                  onOverride={(mbid) => onSetOverride(track.Id, mbid)}
                  onClear={() => onClearOverride(track.Id)}
                />
              ) : (
                // override recording still loading
                <div className="animate-pulse opacity-50 w-8 h-8">
                  <img src="/mb-blank-icon.svg" width={32} height={32} alt="" />
                </div>
              )}
            </div>
            {recording && <RecordingInfo recording={recording} />}
          </div>
        )}
        {matchState.kind === "unresolved" && (
          <UnresolvedCell
            candidates={matchState.candidates}
            onOverride={(mbid) => onSetOverride(track.Id, mbid)}
          />
        )}
      </td>
    </tr>
  );
}

// ─── sync dropdown ────────────────────────────────────────────────────────────

type SyncState =
  | { phase: "idle" }
  | { phase: "progress"; added: number; total: number }
  | { phase: "done"; collectionId: string }
  | { phase: "error"; message: string };

function SyncDropdown({
  mbAuth,
  playlistName,
  matchedMbids,
}: {
  mbAuth: MbAuth | null;
  playlistName: string;
  matchedMbids: string[];
}) {
  const [open, setOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>({ phase: "idle" });
  const [collections, setCollections] = useState<MbCollection[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open && mbAuth && !collections) {
      fetchCollections(mbAuth.username, mbAuth.accessToken).then(
        setCollections,
        () => {},
      );
    }
  }, [open, mbAuth, collections]);

  async function startOAuth() {
    const clientId = import.meta.env.VITE_MB_CLIENT_ID as string | undefined;
    if (!clientId) return;
    const { codeVerifier, codeChallenge } = await generatePkce();
    sessionStorage.setItem("mb_pkce_verifier", codeVerifier);
    const redirectUri = `${window.location.origin}/mb-callback`;
    window.location.href = buildAuthUrl(clientId, redirectUri, codeChallenge);
  }

  async function exportToNew() {
    if (!mbAuth || matchedMbids.length === 0) return;
    setSyncState({ phase: "progress", added: 0, total: matchedMbids.length });
    try {
      const collId = await createCollection(playlistName, mbAuth.accessToken);
      if (!collId) {
        setSyncState({
          phase: "error",
          message:
            "Collection creation is not supported by this MusicBrainz server (endpoint returned 404/405). Create a collection manually and use \u201cExport to existing collection\u201d.",
        });
        return;
      }
      await addRecordingsToCollection(collId, matchedMbids, mbAuth.accessToken);
      setSyncState({ phase: "done", collectionId: collId });
    } catch (err) {
      setSyncState({
        phase: "error",
        message: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  async function exportToExisting(collection: MbCollection) {
    if (!mbAuth || matchedMbids.length === 0) return;
    setSyncState({ phase: "progress", added: 0, total: matchedMbids.length });
    try {
      await addRecordingsToCollection(
        collection.id,
        matchedMbids,
        mbAuth.accessToken,
      );
      setSyncState({ phase: "done", collectionId: collection.id });
    } catch (err) {
      setSyncState({
        phase: "error",
        message: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (syncState.phase === "done" || syncState.phase === "error") {
            setSyncState({ phase: "idle" });
          }
        }}
        className="island-shell flex items-center gap-1.5 rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-text)] hover:text-[var(--text)]"
      >
        <img
          src="/musicbrainz-icon.svg"
          width={14}
          height={14}
          alt=""
          aria-hidden="true"
        />
        Sync
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 island-shell rounded-xl border border-[var(--stroke)] p-4 w-72 rise-in">
          {!mbAuth ? (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Log in to MusicBrainz to sync this playlist.
              </p>
              <button
                type="button"
                onClick={startOAuth}
                className="w-full island-shell rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)] hover:text-[var(--accent)]"
              >
                Connect MusicBrainz
              </button>
            </>
          ) : syncState.phase === "progress" ? (
            <p className="text-sm text-[var(--text-muted)]">
              Adding {syncState.total} recordings…
            </p>
          ) : syncState.phase === "done" ? (
            <>
              <p className="text-sm font-semibold text-[var(--text)] mb-2">
                Sync complete
              </p>
              <a
                href={`https://musicbrainz.org/collection/${syncState.collectionId}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm"
              >
                View collection on MusicBrainz →
              </a>
            </>
          ) : syncState.phase === "error" ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {syncState.message}
            </p>
          ) : (
            <>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Syncing {matchedMbids.length} matched recording
                {matchedMbids.length === 1 ? "" : "s"} as {mbAuth.username}
              </p>
              <button
                type="button"
                onClick={exportToNew}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--surface)] text-[var(--text)]"
              >
                Export to new collection
              </button>
              {collections && collections.length > 0 && (
                <>
                  <hr className="border-[var(--stroke)] my-2" />
                  <p className="text-xs text-[var(--text-muted)] mb-1 px-1">
                    Export to existing collection
                  </p>
                  <div className="max-h-48 overflow-y-auto">
                    {collections
                      .filter((c) => c["entity-type"] === "recording")
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => exportToExisting(c)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--surface)] text-[var(--text)] truncate"
                        >
                          {c.name}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── track section ────────────────────────────────────────────────────────────

function TrackSection({
  cfg,
  playlistId,
  playlistName,
}: {
  cfg: JellyfinConfig;
  playlistId: string;
  playlistName: string;
}) {
  const navigate = useNavigate({ from: "/" });
  const { overrides: rawOverrides } = Route.useSearch();
  const overrides = useMemo(() => parseOverrides(rawOverrides), [rawOverrides]);
  const [mbAuth, setMbAuth] = useState<MbAuth | null>(null);
  useEffect(() => {
    setMbAuth(getMbAuth());
  }, []);

  const {
    data: tracks,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["playlist-tracks", playlistId, cfg],
    queryFn: () => {
      if (!cfg.userId) throw new Error("No userId");
      return fetchPlaylistTracks(cfg, cfg.userId, playlistId);
    },
    enabled: !!cfg.userId,
  });

  const trackMbids = useMemo(
    () =>
      (tracks ?? []).flatMap((t) => {
        const id = extractMbRecordingId(t);
        return id ? [id] : [];
      }),
    [tracks],
  );

  const { data: recordingMap, isPending: mbPending } = useQuery({
    queryKey: ["playlist-recordings", playlistId, trackMbids],
    queryFn: () => fetchRecordingsByTrackIds(trackMbids),
    enabled: trackMbids.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // Tracks needing partial search: no recording MBID, not overridden, has artist MBID
  const tracksForPartialSearch = useMemo(
    () =>
      !tracks || !recordingMap
        ? []
        : tracks.filter((t) => {
            if (extractMbRecordingId(t)) return false;
            if (overrides[t.Id]) return false;
            return !!extractMbArtistId(t);
          }),
    [tracks, recordingMap, overrides],
  );

  const partialSearchKey = tracksForPartialSearch.map((t) => t.Id).join(",");

  const { data: partialCandidatesMap, isPending: partialPending } = useQuery({
    queryKey: ["partial-search", partialSearchKey],
    queryFn: async (): Promise<Map<string, MbRecording[]>> => {
      const result = new Map<string, MbRecording[]>();
      for (let i = 0; i < tracksForPartialSearch.length; i++) {
        const track = tracksForPartialSearch[i];
        const artistId = extractMbArtistId(track);
        if (!artistId) continue;
        const candidates = await searchRecordingsByArtist(artistId, track.Name);
        result.set(track.Id, candidates);
        if (i < tracksForPartialSearch.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      }
      return result;
    },
    enabled: tracksForPartialSearch.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: keepPreviousData,
  });

  // Fetch recording data for URL overrides (needed after page refresh)
  const overrideMbids = useMemo(() => Object.values(overrides), [overrides]);
  const overrideMbidsKey = overrideMbids.slice().sort().join(",");
  const { data: overrideRecordingsMap } = useQuery({
    queryKey: ["override-recordings", overrideMbidsKey],
    queryFn: () => fetchRecordingsByRecordingIds(overrideMbids),
    enabled: overrideMbids.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: keepPreviousData,
  });

  function handleSetOverride(jellyfinId: string, mbid: string) {
    navigate({
      search: (prev) => ({
        ...prev,
        overrides: serializeOverrides({
          ...parseOverrides(prev.overrides),
          [jellyfinId]: mbid,
        }),
      }),
      replace: true,
    });
  }

  function handleClearOverride(jellyfinId: string) {
    navigate({
      search: (prev) => {
        const next = { ...parseOverrides(prev.overrides) };
        delete next[jellyfinId];
        return { ...prev, overrides: serializeOverrides(next) };
      },
      replace: true,
    });
  }

  // Compute per-track match state
  const matchStates = useMemo((): Map<string, TrackMatchState> => {
    const map = new Map<string, TrackMatchState>();
    for (const track of tracks ?? []) {
      const mbid = extractMbRecordingId(track);

      if (mbid) {
        if (mbPending) {
          map.set(track.Id, { kind: "loading" });
        } else {
          const recording = recordingMap?.get(mbid);
          map.set(
            track.Id,
            recording
              ? { kind: "exact", recording }
              : { kind: "unresolved", candidates: [] },
          );
        }
        continue;
      }

      if (overrides[track.Id]) {
        const recording = overrideRecordingsMap?.get(overrides[track.Id]);
        map.set(track.Id, { kind: "override", recording });
        continue;
      }

      if (extractMbArtistId(track)) {
        if (partialPending && !partialCandidatesMap) {
          map.set(track.Id, { kind: "loading" });
        } else {
          const candidates = partialCandidatesMap?.get(track.Id) ?? [];
          map.set(
            track.Id,
            candidates.length === 1
              ? { kind: "partial-auto", recording: candidates[0] }
              : { kind: "unresolved", candidates },
          );
        }
        continue;
      }

      map.set(track.Id, { kind: "unresolved", candidates: [] });
    }
    return map;
  }, [
    tracks,
    mbPending,
    recordingMap,
    overrides,
    overrideRecordingsMap,
    partialPending,
    partialCandidatesMap,
  ]);

  // Recording MBIDs for sync: exact matches + confirmed overrides
  const matchedMbids = useMemo(() => {
    const ids: string[] = [];
    for (const track of tracks ?? []) {
      const state = matchStates.get(track.Id);
      if (!state) continue;
      if (state.kind === "exact") ids.push(state.recording.id);
      if (state.kind === "override" && state.recording)
        ids.push(state.recording.id);
    }
    return [...new Set(ids)];
  }, [tracks, matchStates]);

  const totalPartialAuto = useMemo(
    () =>
      [...matchStates.values()].filter((s) => s.kind === "partial-auto").length,
    [matchStates],
  );

  return (
    <section className="mt-10 rise-in">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">
            {playlistName}
          </h2>
          {tracks && (
            <p className="text-xs text-[var(--text-muted)]">
              {matchedMbids.length}/{tracks.length} matched
              {totalPartialAuto > 0 ? `, ${totalPartialAuto} unconfirmed` : ""}
            </p>
          )}
        </div>
        <SyncDropdown
          mbAuth={mbAuth}
          playlistName={playlistName}
          matchedMbids={matchedMbids}
        />
      </div>

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
          {error instanceof Error ? error.message : "Failed to load tracks"}
        </p>
      )}

      <div className="island-shell rounded-xl border border-[var(--stroke)] overflow-x-auto">
        <table className="w-full text-sm min-w-[640px] table-fixed">
          <thead>
            <tr className="border-b border-[var(--stroke)]">
              <th className="w-1/2 px-4 py-3 text-center">
                <img
                  src="/jellyfin-icon.svg"
                  width={32}
                  height={32}
                  alt="Jellyfin"
                  className="mx-auto"
                />
              </th>
              <th className="w-1/2 px-4 py-3 text-center">
                <img
                  src="/musicbrainz-icon.svg"
                  width={32}
                  height={32}
                  alt="MusicBrainz"
                  className="mx-auto"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {isPending
              ? ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((k) => (
                  <tr
                    key={k}
                    className="border-b border-[var(--stroke)] animate-pulse"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-[var(--stroke)]" />
                        <div>
                          <div className="h-3 w-32 rounded bg-[var(--stroke)] mb-1.5" />
                          <div className="h-2.5 w-20 rounded bg-[var(--stroke)]" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              : tracks?.map((track) => (
                  <TrackTableRow
                    key={track.Id}
                    track={track}
                    cfg={cfg}
                    matchState={
                      matchStates.get(track.Id) ?? { kind: "loading" }
                    }
                    onSetOverride={handleSetOverride}
                    onClearOverride={handleClearOverride}
                  />
                ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

function PlaylistsPage() {
  const navigate = useNavigate({ from: "/" });
  const { playlist: selectedId } = Route.useSearch();

  const [jellyfinConfig, setJellyfinConfig] = useState<JellyfinConfig | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  useEffect(() => {
    setJellyfinConfig(getJellyfinConfig());
    setHydrated(true);
  }, []);

  const {
    data: playlists,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["playlists", jellyfinConfig],
    queryFn: () => {
      if (!jellyfinConfig?.userId) throw new Error("No config");
      return fetchPlaylists(jellyfinConfig, jellyfinConfig.userId);
    },
    enabled: !!jellyfinConfig?.userId,
  });

  function selectPlaylist(id: string) {
    navigate({
      search: (prev) => ({ ...prev, playlist: id }),
      replace: true,
    });
  }

  const showConnect = hydrated && !jellyfinConfig;
  const showSkeletons = !hydrated || (!!jellyfinConfig && isPending);

  const sortedPlaylists = playlists?.slice().sort((a, b) => {
    const aEmpty = (a.ChildCount ?? 0) === 0;
    const bEmpty = (b.ChildCount ?? 0) === 0;
    return Number(aEmpty) - Number(bEmpty);
  });
  const totalPages = Math.ceil((sortedPlaylists?.length ?? 0) / PAGE_SIZE);
  const visiblePlaylists = sortedPlaylists?.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const selectedPlaylist = playlists?.find((p) => p.Id === selectedId);

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      {showConnect ? (
        <ConnectForm onConnected={(cfg) => setJellyfinConfig(cfg)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
              <img
                src="/jellyfin-icon.svg"
                width={22}
                height={22}
                alt=""
                aria-hidden="true"
              />
              Playlists
            </h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`p-2 rounded-lg border ${
                  viewMode === "grid"
                    ? "island-shell border-[var(--accent)] text-[var(--accent-text)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`p-2 rounded-lg border ${
                  viewMode === "list"
                    ? "island-shell border-[var(--accent)] text-[var(--accent-text)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {isError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {error instanceof Error
                ? error.message
                : "Failed to load playlists"}
            </p>
          )}

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {showSkeletons
                ? Array.from({ length: 6 }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                    <SkeletonCard key={i} />
                  ))
                : visiblePlaylists?.map((pl) => (
                    <PlaylistCard
                      key={pl.Id}
                      playlist={pl}
                      cfg={jellyfinConfig!}
                      selected={pl.Id === selectedId}
                      disabled={(pl.ChildCount ?? 0) === 0}
                      onClick={() => selectPlaylist(pl.Id)}
                    />
                  ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {showSkeletons
                ? Array.from({ length: 6 }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                    <SkeletonCard key={i} />
                  ))
                : visiblePlaylists?.map((pl) => (
                    <PlaylistRow
                      key={pl.Id}
                      playlist={pl}
                      selected={pl.Id === selectedId}
                      disabled={(pl.ChildCount ?? 0) === 0}
                      onClick={() => selectPlaylist(pl.Id)}
                    />
                  ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="island-shell rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-sm text-[var(--text-muted)] enabled:hover:text-[var(--text)] disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="island-shell rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-sm text-[var(--text-muted)] enabled:hover:text-[var(--text)] disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {jellyfinConfig && selectedId && selectedPlaylist && (
        <TrackSection
          cfg={jellyfinConfig}
          playlistId={selectedId}
          playlistName={selectedPlaylist.Name}
        />
      )}
    </main>
  );
}
