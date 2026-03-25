import { ticksToDisplay } from "@src/lib/jellyfin";
import type {
  JellyfinConfig,
  JellyfinTrack,
  TrackMatchState,
} from "@src/lib/types";
import { Search, Pencil, ChevronDown, Save } from "lucide-react";
import { useState } from "react";
import { asset } from "@src/lib/utils";
import { MbBadge, MbBadgeEditContent } from "./MbBadge";
import { RecordingInfo } from "./RecordingInfo";
import { ThumbnailTooltip } from "./ThumbnailTooltip";
import { UnresolvedCell, UnresolvedEditContent } from "./UnresolvedCell";

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
  const [isExpanded, setIsExpanded] = useState(false);

  const recording =
    matchState.kind === "exact" ||
    matchState.kind === "partial-auto" ||
    matchState.kind === "override"
      ? matchState.recording
      : undefined;

  const isEditable =
    matchState.kind === "partial-auto" ||
    matchState.kind === "override" ||
    matchState.kind === "unresolved";

  return (
    <>
      <tr className={`${isExpanded ? "" : "border-b border-stroke last:border-0"} hover:bg-surface/40`}>
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {matchState.kind === "loading" && (
                <div className="flex items-center gap-2 min-w-0 animate-pulse flex-1">
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
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="shrink-0">
                    {matchState.kind === "exact" ? (
                      <img
                        src={asset("/mb-recording-icon.svg")}
                        width={32}
                        height={32}
                        alt=""
                      />
                    ) : matchState.kind === "partial-auto" ? (
                      <MbBadge kind="partial-auto" />
                    ) : matchState.recording ? (
                      <MbBadge kind="override" />
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
                <UnresolvedCell />
              )}
            </div>
            {matchState.kind === "partial-auto" && (
              <button
                type="button"
                onClick={() => onSetOverride(track.Id, matchState.recording.id)}
                aria-label="Confirm match"
                className="shrink-0 text-app-muted hover:text-green-500 transition-colors mr-1"
                style={{
                  opacity: isExpanded ? 0 : 1,
                  pointerEvents: isExpanded ? "none" : "auto",
                  transition: isExpanded ? "opacity 200ms" : "opacity 300ms 100ms",
                }}
              >
                <Save size={15} />
              </button>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? "Collapse" : "Edit match"}
                className="shrink-0 relative w-4 h-4 text-app-muted hover:text-app-text transition-colors mr-1"
              >
                <Pencil
                  size={15}
                  className="absolute inset-0"
                  style={{
                    opacity: isExpanded ? 0 : 1,
                    transition: isExpanded ? "opacity 300ms" : "opacity 500ms 300ms",
                  }}
                />
                <ChevronDown
                  size={15}
                  className="absolute inset-0"
                  style={{
                    opacity: isExpanded ? 1 : 0,
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: isExpanded
                      ? "opacity 300ms, transform 300ms"
                      : "transform 300ms, opacity 300ms 300ms",
                  }}
                />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-stroke last:border-0">
          <td colSpan={2} className="pb-4 pt-0 px-4">
            <div className="mx-[5%] border-t border-stroke/70 pt-3">
              <div className="max-w-xs">
                {(matchState.kind === "partial-auto" ||
                  matchState.kind === "override") && (
                  <MbBadgeEditContent
                    kind={matchState.kind}
                    recording={matchState.recording}
                    onConfirm={
                      matchState.kind === "partial-auto"
                        ? () => onSetOverride(track.Id, matchState.recording.id)
                        : undefined
                    }
                    onOverride={(mbid) => onSetOverride(track.Id, mbid)}
                    onClear={() => onClearOverride(track.Id)}
                    onCollapse={() => setIsExpanded(false)}
                  />
                )}
                {matchState.kind === "unresolved" && (
                  <UnresolvedEditContent
                    candidates={matchState.candidates}
                    onOverride={(mbid) => onSetOverride(track.Id, mbid)}
                    onCollapse={() => setIsExpanded(false)}
                  />
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
