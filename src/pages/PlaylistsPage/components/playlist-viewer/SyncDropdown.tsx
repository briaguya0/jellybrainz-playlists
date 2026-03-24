import { useMbAuth } from "@src/contexts/MbAuthContext";
import {
  addRecordingsToCollection,
  createCollection,
  fetchCollections,
} from "@src/lib/musicbrainz";
import { buildAuthUrl, generatePkce } from "@src/lib/oauth";
import type { MbCollection } from "@src/lib/types";
import { getErrorMessage } from "@src/lib/utils";
import { useEffect, useRef, useState } from "react";

type SyncState =
  | { phase: "idle" }
  | { phase: "progress"; added: number; total: number }
  | { phase: "done"; collectionId: string }
  | { phase: "error"; message: string };

export function SyncDropdown({
  playlistName,
  matchedMbids,
}: {
  playlistName: string;
  matchedMbids: string[];
}) {
  const { mbAuth } = useMbAuth();
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
        (err) => console.error("Failed to fetch MB collections:", err),
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
        message: getErrorMessage(err, "Sync failed"),
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
        message: getErrorMessage(err, "Sync failed"),
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
        Export to MusicBrainz…
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 island-shell rounded-xl border border-[var(--stroke)] p-4 w-72 rise-in">
          {!mbAuth ? (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Log in to MusicBrainz to export this playlist.
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
