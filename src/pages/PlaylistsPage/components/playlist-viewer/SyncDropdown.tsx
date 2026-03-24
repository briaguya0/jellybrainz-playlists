import { useMbAuth } from "@src/contexts/MbAuthContext";
import {
  addRecordingsToCollection,
  deleteRecordingsFromCollection,
  fetchCollectionRecordings,
  fetchCollections,
} from "@src/lib/musicbrainz";
import { buildAuthUrl, generatePkce } from "@src/lib/oauth";
import type { MbCollection } from "@src/lib/types";
import { getErrorMessage } from "@src/lib/utils";
import { useEffect, useRef, useState } from "react";

type ExportView =
  | { kind: "idle" }
  | { kind: "picked"; collection: MbCollection }
  | { kind: "append-confirm"; collection: MbCollection }
  | {
      kind: "replace-confirm";
      collection: MbCollection;
      currentMbids: string[];
    }
  | { kind: "progress"; total: number }
  | { kind: "done"; collectionId: string }
  | { kind: "error"; message: string };

function downloadBackup(collectionName: string, mbids: string[]) {
  const blob = new Blob([mbids.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${collectionName}-backup.txt`;
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

function DupeWarning({ dupeCount }: { dupeCount: number }) {
  if (dupeCount === 0) return null;
  return (
    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
      {dupeCount} duplicate recording{dupeCount === 1 ? "" : "s"} will be
      collapsed — MB collections are sets.
    </p>
  );
}

export function SyncDropdown({
  matchedMbids,
  totalTracks,
}: {
  matchedMbids: string[];
  totalTracks: number;
}) {
  const { mbAuth, clientId } = useMbAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ExportView>({ kind: "idle" });
  const [collections, setCollections] = useState<MbCollection[] | null>(null);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const uniqueMbids = [...new Set(matchedMbids)];
  const dupeCount = matchedMbids.length - uniqueMbids.length;

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
        (err) => console.error("Failed to fetch MB collections:", err),
      );
    }
  }, [open, mbAuth, collections]);

  async function startOAuth() {
    if (!clientId) return;
    const { codeVerifier, codeChallenge } = await generatePkce();
    sessionStorage.setItem("mb_pkce_verifier", codeVerifier);
    const redirectUri = `${window.location.origin}/mb-callback`;
    window.location.href = buildAuthUrl(clientId, redirectUri, codeChallenge);
  }

  async function runAppend(collection: MbCollection) {
    if (!mbAuth) return;
    setView({ kind: "progress", total: uniqueMbids.length });
    try {
      await addRecordingsToCollection(
        collection.id,
        uniqueMbids,
        mbAuth.accessToken,
      );
      setView({ kind: "done", collectionId: collection.id });
    } catch (err) {
      setView({ kind: "error", message: getErrorMessage(err, "Export failed") });
    }
  }

  async function runReplace(collection: MbCollection, currentMbids: string[]) {
    if (!mbAuth) return;
    setView({ kind: "progress", total: uniqueMbids.length });
    try {
      await deleteRecordingsFromCollection(
        collection.id,
        currentMbids,
        mbAuth.accessToken,
      );
      await addRecordingsToCollection(
        collection.id,
        uniqueMbids,
        mbAuth.accessToken,
      );
      setView({ kind: "done", collectionId: collection.id });
    } catch (err) {
      setView({ kind: "error", message: getErrorMessage(err, "Export failed") });
    }
  }

  async function goToReplace(collection: MbCollection) {
    if (!mbAuth) return;
    setView({ kind: "progress", total: 0 });
    try {
      const currentMbids = await fetchCollectionRecordings(
        collection.id,
        mbAuth.accessToken,
      );
      setBackupDownloaded(false);
      setView({ kind: "replace-confirm", collection, currentMbids });
    } catch (err) {
      setView({
        kind: "error",
        message: getErrorMessage(err, "Failed to fetch collection"),
      });
    }
  }

  const recordingCollections = collections?.filter(
    (c) => c["entity-type"] === "recording",
  );

  function renderContent() {
    if (!clientId) {
      return (
        <p className="text-sm text-app-muted">
          Add a MusicBrainz client ID in Settings to get started.
        </p>
      );
    }

    if (!mbAuth) {
      return (
        <>
          <p className="text-sm text-app-muted mb-3">
            Log in to MusicBrainz to export this playlist.
          </p>
          <button
            type="button"
            onClick={startOAuth}
            className="w-full glass-panel rounded-lg border border-stroke px-3 py-2 text-sm font-semibold text-accent-text hover:text-[var(--accent)]"
          >
            Connect MusicBrainz
          </button>
        </>
      );
    }

    if (view.kind === "progress") {
      return (
        <p className="text-sm text-app-muted">
          {view.total > 0
            ? `Adding ${view.total} recording${view.total === 1 ? "" : "s"}…`
            : "Fetching collection…"}
        </p>
      );
    }

    if (view.kind === "done") {
      return (
        <>
          <p className="text-sm font-semibold text-app-text mb-2">
            Export complete
          </p>
          <a
            href={`https://musicbrainz.org/collection/${view.collectionId}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm"
          >
            View collection on MusicBrainz →
          </a>
        </>
      );
    }

    if (view.kind === "error") {
      return (
        <>
          <BackButton onClick={() => setView({ kind: "idle" })} />
          <p className="text-sm text-red-600 dark:text-red-400">
            {view.message}
          </p>
        </>
      );
    }

    if (view.kind === "picked") {
      const { collection } = view;
      return (
        <>
          <BackButton onClick={() => setView({ kind: "idle" })} />
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-sm font-semibold text-app-text truncate">
              {collection.name}
            </span>
            <a
              href={`https://musicbrainz.org/collection/${collection.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-app-muted hover:text-app-text"
              aria-label="View on MusicBrainz"
            >
              ↗
            </a>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setView({ kind: "append-confirm", collection })
              }
              className="flex-1 rounded-lg border border-stroke px-3 py-2 text-sm hover:bg-hover text-app-text"
            >
              Append
            </button>
            <button
              type="button"
              onClick={() => goToReplace(collection)}
              className="flex-1 rounded-lg border border-stroke px-3 py-2 text-sm hover:bg-hover text-app-text"
            >
              Replace
            </button>
          </div>
        </>
      );
    }

    if (view.kind === "append-confirm") {
      const { collection } = view;
      return (
        <>
          <BackButton
            onClick={() => setView({ kind: "picked", collection })}
          />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-app-text truncate">
              {collection.name}
            </span>
            <a
              href={`https://musicbrainz.org/collection/${collection.id}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-app-muted hover:text-app-text"
              aria-label="View on MusicBrainz"
            >
              ↗
            </a>
          </div>
          <p className="text-xs text-app-muted mb-3">
            Adding {uniqueMbids.length} recording
            {uniqueMbids.length === 1 ? "" : "s"}
          </p>
          <DupeWarning dupeCount={dupeCount} />
          <button
            type="button"
            onClick={() => runAppend(collection)}
            className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white enabled:hover:opacity-90"
          >
            Confirm
          </button>
        </>
      );
    }

    if (view.kind === "replace-confirm") {
      const { collection, currentMbids } = view;
      return (
        <>
          <BackButton
            onClick={() => setView({ kind: "picked", collection })}
          />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-app-text truncate">
              {collection.name}
            </span>
            <a
              href={`https://musicbrainz.org/collection/${collection.id}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-app-muted hover:text-app-text"
              aria-label="View on MusicBrainz"
            >
              ↗
            </a>
          </div>
          <p className="text-xs text-app-muted mb-3">
            This will replace all {currentMbids.length} recording
            {currentMbids.length === 1 ? "" : "s"} in the collection with{" "}
            {uniqueMbids.length} from this playlist.
          </p>
          <button
            type="button"
            onClick={() => {
              downloadBackup(collection.name, currentMbids);
              setBackupDownloaded(true);
            }}
            className="w-full mb-2 rounded-lg border border-stroke px-3 py-2 text-sm hover:bg-hover text-app-text flex items-center justify-center gap-2"
          >
            {backupDownloaded ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ Backup downloaded
              </span>
            ) : (
              `Download backup (${currentMbids.length} recording${currentMbids.length === 1 ? "" : "s"})`
            )}
          </button>
          <DupeWarning dupeCount={dupeCount} />
          <button
            type="button"
            onClick={() => runReplace(collection, currentMbids)}
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
          {uniqueMbids.length} recording{uniqueMbids.length === 1 ? "" : "s"} ·{" "}
          {mbAuth.username}
        </p>
        {uniqueMbids.length < totalTracks && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {totalTracks - uniqueMbids.length} track
            {totalTracks - uniqueMbids.length === 1 ? "" : "s"} unmatched and will be skipped.
          </p>
        )}
        {collections === null ? (
          <p className="text-xs text-app-muted">Loading collections…</p>
        ) : recordingCollections && recordingCollections.length > 0 ? (
          <div className="max-h-48 overflow-y-auto">
            {recordingCollections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setView({ kind: "picked", collection: c })}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-hover text-app-text flex items-center gap-1.5"
              >
                <span className="truncate flex-1">{c.name}</span>
                {c["recording-count"] !== undefined && (
                  <span className="shrink-0 text-xs text-app-muted">
                    {c["recording-count"]}
                  </span>
                )}
                <a
                  href={`https://musicbrainz.org/collection/${c.id}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-app-muted hover:text-app-text"
                  aria-label={`View ${c.name} on MusicBrainz`}
                >
                  ↗
                </a>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-app-muted">No recording collections yet.</p>
        )}
        <div className="mt-3 pt-3 border-t border-stroke flex items-center justify-between">
          <a
            href="https://musicbrainz.org/collection/create?recording=1"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-app-muted hover:text-app-text"
          >
            New collection ↗
          </a>
          <button
            type="button"
            onClick={() => setCollections(null)}
            className="text-xs text-app-muted hover:text-app-text"
          >
            Refresh
          </button>
        </div>
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
          src="/musicbrainz-icon.svg"
          width={14}
          height={14}
          alt=""
          aria-hidden="true"
        />
        Export to MusicBrainz…
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 glass-panel rounded-xl border border-stroke p-4 w-80 rise-in">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
