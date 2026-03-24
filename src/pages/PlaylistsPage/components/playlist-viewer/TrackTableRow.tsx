import { ticksToDisplay } from "@src/lib/jellyfin";
import type {
  JellyfinConfig,
  JellyfinTrack,
  TrackMatchState,
} from "@src/lib/types";
import { Search } from "lucide-react";
import { asset } from "@src/lib/utils";
import { MbBadge } from "./MbBadge";
import { RecordingInfo } from "./RecordingInfo";
import { ThumbnailTooltip } from "./ThumbnailTooltip";
import { UnresolvedCell } from "./UnresolvedCell";

export function TrackTableRow({
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
    <tr className="border-b border-stroke last:border-0 hover:bg-surface/40">
      {/* Jellyfin: thumbnail + title/artist/duration */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <ThumbnailTooltip track={track} cfg={cfg} />
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-medium text-app-text truncate">
              {track.Name}
            </p>
            <p className="text-xs text-app-muted truncate">
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
              <img src={asset("/mb-blank-icon.svg")} width={32} height={32} alt="" />
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
                  src={asset("/mb-recording-icon.svg")}
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
                  <img src={asset("/mb-blank-icon.svg")} width={32} height={32} alt="" />
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
