import { useJellyfin } from "@src/contexts/JellyfinContext";
import { useTrackMatching } from "@src/hooks/useTrackMatching";
import { fetchPlaylists } from "@src/lib/jellyfin";
import type { OverrideSource } from "@src/lib/types";
import {
  getErrorMessage,
  parseOverrides,
  serializeOverrides,
} from "@src/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LbExportButton } from "./LbExportButton";
import { SyncDropdown } from "./SyncDropdown";
import { TrackTable } from "./TrackTable";

export function PlaylistViewer({
  playlistId,
}: {
  playlistId: string | undefined;
}) {
  const { cfg } = useJellyfin();
  const navigate = useNavigate({ from: "/" });
  const { overrides: rawOverrides } = useSearch({ from: "/" });
  const overrides = parseOverrides(rawOverrides);

  // Look up the playlist name from the cached playlists query — no extra network request.
  const { data: playlists } = useQuery({
    queryKey: ["playlists", cfg],
    queryFn: () => {
      if (!cfg?.userId) throw new Error("No config");
      return fetchPlaylists(cfg, cfg.userId);
    },
    enabled: !!cfg?.userId,
  });
  const playlistName = playlists?.find((p) => p.Id === playlistId)?.Name;

  const {
    tracks,
    isPending,
    isError,
    error,
    matchStates,
    matchedMbids,
    totalPartialAuto,
  } = useTrackMatching(cfg, playlistId, overrides);

  function handleSetOverride(jellyfinId: string, mbid: string, source: OverrideSource) {
    navigate({
      search: (prev) => ({
        ...prev,
        overrides: serializeOverrides({
          ...parseOverrides(prev.overrides),
          [jellyfinId]: { mbid, source },
        }),
      }),
      replace: true,
      resetScroll: false,
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
      resetScroll: false,
    });
  }

  // Early return is intentionally placed after all hook calls — hooks must be
  // called unconditionally (Rules of React), so the guard can't move to the top.
  if (!cfg || !playlistId) return null;

  return (
    <section className="mt-10 rise-in">
      <div className="flex items-center justify-between mb-3 sm:flex-row flex-col sm:items-center items-start gap-2 sm:gap-0">
        <div>
          <h2 className="text-base font-semibold text-app-text">
            {playlistName}
          </h2>
          {tracks && (
            <p className="text-xs text-app-muted">
              {matchedMbids.length}/{tracks.length} matched
              {totalPartialAuto > 0 ? `, ${totalPartialAuto} unconfirmed` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LbExportButton
            playlistName={playlistName ?? ""}
            matchedMbids={matchedMbids}
            totalTracks={tracks?.length ?? matchedMbids.length}
          />
          <SyncDropdown
            matchedMbids={matchedMbids}
            totalTracks={tracks?.length ?? matchedMbids.length}
          />
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
          {getErrorMessage(error, "Failed to load tracks")}
        </p>
      )}

      <TrackTable
        isPending={isPending}
        tracks={tracks}
        cfg={cfg}
        matchStates={matchStates}
        onSetOverride={handleSetOverride}
        onClearOverride={handleClearOverride}
      />
    </section>
  );
}
