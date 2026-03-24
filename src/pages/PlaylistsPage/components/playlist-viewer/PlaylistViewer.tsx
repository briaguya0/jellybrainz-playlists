import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTrackMatching } from "../../../../hooks/useTrackMatching";
import { getMbAuth } from "../../../../lib/config";
import type { JellyfinConfig, MbAuth } from "../../../../lib/types";
import { parseOverrides, serializeOverrides } from "../../../../lib/utils";
import { SyncDropdown } from "./SyncDropdown";
import { TrackTable } from "./TrackTable";

export function PlaylistViewer({
  cfg,
  playlistId,
  playlistName,
}: {
  cfg: JellyfinConfig | null;
  playlistId: string | undefined;
  playlistName: string | undefined;
}) {
  const navigate = useNavigate({ from: "/" });
  const { overrides: rawOverrides } = useSearch({ from: "/" });
  const overrides = useMemo(() => parseOverrides(rawOverrides), [rawOverrides]);
  const [mbAuth, setMbAuth] = useState<MbAuth | null>(null);

  useEffect(() => {
    setMbAuth(getMbAuth());
  }, []);

  const {
    tracks,
    isPending,
    isError,
    error,
    matchStates,
    matchedMbids,
    totalPartialAuto,
  } = useTrackMatching(
    cfg ?? { url: "", apiKey: "" },
    playlistId ?? "",
    overrides,
  );

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

  if (!cfg || !playlistId) return null;

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
          playlistName={playlistName ?? ""}
          matchedMbids={matchedMbids}
        />
      </div>

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
          {error instanceof Error ? error.message : "Failed to load tracks"}
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
