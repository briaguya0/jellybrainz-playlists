import { useLbAuth } from "@src/contexts/LbAuthContext";
import {
  appendLbPlaylistTracks,
  createLbPlaylist,
  fetchLbPlaylistTracks,
  fetchLbPlaylists,
  replaceLbPlaylistTracks,
} from "@src/lib/listenbrainz";
import type { LbPlaylist } from "@src/lib/types";
import { getErrorMessage } from "@src/lib/utils";
import { useEffect, useRef, useState } from "react";

type ExportView =
  | { kind: "idle" }
  | { kind: "create-form" }
  | { kind: "picked"; playlist: LbPlaylist }
  | { kind: "append-confirm"; playlist: LbPlaylist }
  | { kind: "replace-confirm"; playlist: LbPlaylist; currentMbids: string[] }
  | { kind: "progress" }
  | { kind: "done"; playlistMbid: string }
  | { kind: "error"; message: string };

function downloadBackup(playlistTitle: string, mbids: string[]) {
  const blob = new Blob([mbids.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${playlistTitle}-backup.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 text-xs text-app-muted hover:text-app-text"
    >
      ← Back
    </button>
  );
}

function playlistUrl(mbid: string) {
  return `https://listenbrainz.org/playlist/${mbid}`;
}

function mbidFromIdentifier(identifier: string): string {
  return identifier.replace("https://listenbrainz.org/playlist/", "");
}

export function LbExportButton({
  playlistName,
  matchedMbids,
  totalTracks,
}: {
  playlistName: string;
  matchedMbids: string[];
  totalTracks: number;
}) {
  const { lbAuth } = useLbAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ExportView>({ kind: "idle" });
  const [playlists, setPlaylists] = useState<LbPlaylist[] | null>(null);
  const [newName, setNewName] = useState(playlistName);
  const [isPublic, setIsPublic] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
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
    if (open && lbAuth && !playlists) {
      fetchLbPlaylists(lbAuth.username, lbAuth.token).then(
        setPlaylists,
        (err) => console.error("Failed to fetch LB playlists:", err),
      );
    }
  }, [open, lbAuth, playlists]);

  async function runCreate() {
    if (!lbAuth) return;
    setView({ kind: "progress" });
    try {
      const mbid = await createLbPlaylist(newName, matchedMbids, lbAuth.token, isPublic);
      setPlaylists(null);
      setView({ kind: "done", playlistMbid: mbid });
    } catch (err) {
      setView({ kind: "error", message: getErrorMessage(err, "Export failed") });
    }
  }

  async function runAppend(playlist: LbPlaylist) {
    if (!lbAuth) return;
    setView({ kind: "progress" });
    try {
      const mbid = mbidFromIdentifier(playlist.identifier);
      await appendLbPlaylistTracks(mbid, matchedMbids, lbAuth.token);
      setPlaylists(null);
      setView({ kind: "done", playlistMbid: mbid });
    } catch (err) {
      setView({ kind: "error", message: getErrorMessage(err, "Export failed") });
    }
  }

  async function runReplace(playlist: LbPlaylist) {
    if (!lbAuth) return;
    setView({ kind: "progress" });
    try {
      const mbid = mbidFromIdentifier(playlist.identifier);
      await replaceLbPlaylistTracks(mbid, matchedMbids, lbAuth.token);
      setPlaylists(null);
      setView({ kind: "done", playlistMbid: mbid });
    } catch (err) {
      setView({ kind: "error", message: getErrorMessage(err, "Export failed") });
    }
  }

  async function goToReplace(playlist: LbPlaylist) {
    if (!lbAuth) return;
    setView({ kind: "progress" });
    try {
      const mbid = mbidFromIdentifier(playlist.identifier);
      const currentMbids = await fetchLbPlaylistTracks(mbid, lbAuth.token);
      setBackupDownloaded(false);
      setView({ kind: "replace-confirm", playlist, currentMbids });
    } catch (err) {
      setView({ kind: "error", message: getErrorMessage(err, "Failed to fetch playlist") });
    }
  }

  function renderContent() {
    if (!lbAuth) {
      return (
        <p className="text-sm text-app-muted">
          Add a ListenBrainz token in Settings to get started.
        </p>
      );
    }

    if (view.kind === "progress") {
      return <p className="text-sm text-app-muted">Exporting…</p>;
    }

    if (view.kind === "done") {
      return (
        <>
          <p className="text-sm font-semibold text-app-text mb-2">Export complete</p>
          <a
            href={playlistUrl(view.playlistMbid)}
            target="_blank"
            rel="noreferrer"
            className="text-sm"
          >
            View playlist on ListenBrainz →
          </a>
        </>
      );
    }

    if (view.kind === "error") {
      return (
        <>
          <BackButton onClick={() => setView({ kind: "idle" })} />
          <p className="text-sm text-red-600 dark:text-red-400">{view.message}</p>
        </>
      );
    }

    if (view.kind === "create-form") {
      return (
        <>
          <BackButton onClick={() => setView({ kind: "idle" })} />
          <p className="text-xs text-app-muted mb-1">
            {matchedMbids.length} recording{matchedMbids.length === 1 ? "" : "s"} ·{" "}
            {lbAuth.username}
          </p>
          {matchedMbids.length < totalTracks && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              {totalTracks - matchedMbids.length} track
              {totalTracks - matchedMbids.length === 1 ? "" : "s"} unmatched and will be skipped.
            </p>
          )}
          <label className="block text-xs text-app-muted mb-1">Playlist name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-surface px-3 py-1.5 text-sm text-app-text mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-app-muted">Visibility</span>
            <div className="flex rounded-md border border-stroke overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`px-2.5 py-1 ${!isPublic ? "bg-[var(--accent)] text-white" : "text-app-muted hover:text-app-text"}`}
              >
                Private
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`px-2.5 py-1 ${isPublic ? "bg-[var(--accent)] text-white" : "text-app-muted hover:text-app-text"}`}
              >
                Public
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={runCreate}
            disabled={!newName.trim()}
            className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white enabled:hover:opacity-90 disabled:opacity-50"
          >
            Create &amp; Export
          </button>
        </>
      );
    }

    if (view.kind === "picked") {
      const { playlist } = view;
      const mbid = mbidFromIdentifier(playlist.identifier);
      return (
        <>
          <BackButton onClick={() => setView({ kind: "idle" })} />
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-sm font-semibold text-app-text truncate">{playlist.title}</span>
            <a
              href={playlistUrl(mbid)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-app-muted hover:text-app-text"
              aria-label="View on ListenBrainz"
            >
              ↗
            </a>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView({ kind: "append-confirm", playlist })}
              className="flex-1 rounded-lg border border-stroke px-3 py-2 text-sm hover:bg-hover text-app-text"
            >
              Append
            </button>
            <button
              type="button"
              onClick={() => goToReplace(playlist)}
              className="flex-1 rounded-lg border border-stroke px-3 py-2 text-sm hover:bg-hover text-app-text"
            >
              Replace
            </button>
          </div>
        </>
      );
    }

    if (view.kind === "append-confirm") {
      const { playlist } = view;
      const mbid = mbidFromIdentifier(playlist.identifier);
      return (
        <>
          <BackButton onClick={() => setView({ kind: "picked", playlist })} />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-app-text truncate">{playlist.title}</span>
            <a
              href={playlistUrl(mbid)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-app-muted hover:text-app-text"
              aria-label="View on ListenBrainz"
            >
              ↗
            </a>
          </div>
          <p className="text-xs text-app-muted mb-3">
            Adding {matchedMbids.length} recording{matchedMbids.length === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={() => runAppend(playlist)}
            className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white enabled:hover:opacity-90"
          >
            Confirm
          </button>
        </>
      );
    }

    if (view.kind === "replace-confirm") {
      const { playlist, currentMbids } = view;
      const mbid = mbidFromIdentifier(playlist.identifier);
      return (
        <>
          <BackButton onClick={() => setView({ kind: "picked", playlist })} />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-app-text truncate">{playlist.title}</span>
            <a
              href={playlistUrl(mbid)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-app-muted hover:text-app-text"
              aria-label="View on ListenBrainz"
            >
              ↗
            </a>
          </div>
          <p className="text-xs text-app-muted mb-3">
            This will replace all {currentMbids.length} recording
            {currentMbids.length === 1 ? "" : "s"} with {matchedMbids.length} from this playlist.
          </p>
          <button
            type="button"
            onClick={() => {
              downloadBackup(playlist.title, currentMbids);
              setBackupDownloaded(true);
            }}
            className="w-full mb-2 rounded-lg border border-stroke px-3 py-2 text-sm hover:bg-hover text-app-text flex items-center justify-center gap-2"
          >
            {backupDownloaded ? (
              <span className="text-green-600 dark:text-green-400">✓ Backup downloaded</span>
            ) : (
              `Download backup (${currentMbids.length} recording${currentMbids.length === 1 ? "" : "s"})`
            )}
          </button>
          <button
            type="button"
            onClick={() => runReplace(playlist)}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white enabled:hover:opacity-90"
          >
            Replace
          </button>
        </>
      );
    }

    // idle
    return (
      <>
        <p className="text-xs text-app-muted mb-1">
          {matchedMbids.length} recording{matchedMbids.length === 1 ? "" : "s"} ·{" "}
          {lbAuth.username}
        </p>
        {matchedMbids.length < totalTracks && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {totalTracks - matchedMbids.length} track
            {totalTracks - matchedMbids.length === 1 ? "" : "s"} unmatched and will be skipped.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setNewName(playlistName);
            setIsPublic(false);
            setView({ kind: "create-form" });
          }}
          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-hover text-app-text"
        >
          Create new playlist
        </button>
        {playlists === null ? (
          <p className="text-xs text-app-muted px-3 py-2">Loading playlists…</p>
        ) : playlists.length > 0 ? (
          <>
            <hr className="border-stroke my-2" />
            <p className="text-xs text-app-muted mb-1 px-1">Export to existing playlist</p>
            <div className="max-h-48 overflow-y-auto">
              {playlists.map((p) => {
                const mbid = mbidFromIdentifier(p.identifier);
                return (
                  <button
                    key={p.identifier}
                    type="button"
                    onClick={() => setView({ kind: "picked", playlist: p })}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-hover text-app-text flex items-center gap-1.5"
                  >
                    <span className="truncate flex-1 flex items-center gap-1">
                      {p.title}
                      <a
                        href={playlistUrl(mbid)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-app-muted hover:text-app-text"
                        aria-label={`View ${p.title} on ListenBrainz`}
                      >
                        ↗
                      </a>
                    </span>
                    {p.track_count !== undefined && (
                      <span className="shrink-0 text-xs text-app-muted">{p.track_count}</span>
                    )}
                    <span className="shrink-0 text-app-muted">›</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (view.kind === "done" || view.kind === "error") {
            setView({ kind: "idle" });
          }
        }}
        className="glass-panel flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-sm font-semibold text-accent-text hover:text-app-text"
      >
        <img
          src="/listenbrainz-icon.svg"
          width={14}
          height={14}
          alt=""
          aria-hidden="true"
        />
        Export to ListenBrainz…
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 glass-panel rounded-xl border border-stroke p-4 w-80 rise-in">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
