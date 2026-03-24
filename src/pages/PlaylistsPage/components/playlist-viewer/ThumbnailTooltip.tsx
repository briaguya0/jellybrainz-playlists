import { Popover } from "@src/components/Popover";
import { thumbnailUrl, ticksToDisplay } from "@src/lib/jellyfin";
import type { JellyfinConfig, JellyfinTrack } from "@src/lib/types";

export function ThumbnailTooltip({
  track,
  cfg,
}: {
  track: JellyfinTrack;
  cfg: JellyfinConfig;
}) {
  const subtitle = [
    track.Artists?.join(", "),
    track.RunTimeTicks != null ? ticksToDisplay(track.RunTimeTicks) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Popover
      placement="below-left"
      offset={6}
      className="w-48"
      content={() => (
        <>
          <p className="text-xs font-medium text-[var(--text)] truncate">
            {track.Name}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] truncate">
              {subtitle}
            </p>
          )}
        </>
      )}
    >
      <button
        type="button"
        className="shrink-0 sm:cursor-default"
        aria-label={track.Name}
      >
        <img
          src={thumbnailUrl(cfg, track)}
          alt=""
          className="w-10 h-10 rounded bg-[var(--stroke)] object-cover"
          loading="lazy"
        />
      </button>
    </Popover>
  );
}
