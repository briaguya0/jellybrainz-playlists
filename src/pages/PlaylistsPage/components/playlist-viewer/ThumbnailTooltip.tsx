import { usePopoverPosition } from "@src/hooks/usePopoverPosition";
import { thumbnailUrl, ticksToDisplay } from "@src/lib/jellyfin";
import type { JellyfinConfig, JellyfinTrack } from "@src/lib/types";
import { createPortal } from "react-dom";

export function ThumbnailTooltip({
  track,
  cfg,
}: {
  track: JellyfinTrack;
  cfg: JellyfinConfig;
}) {
  const { open, pos, buttonRef, popoverRef, handleToggle } = usePopoverPosition(
    { placement: "below-left", offset: 6 },
  );

  const subtitle = [
    track.Artists?.join(", "),
    track.RunTimeTicks != null ? ticksToDisplay(track.RunTimeTicks) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
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
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 island-shell rounded-lg border border-[var(--stroke)] px-3 py-2 w-48 rise-in shadow-lg"
          >
            <p className="text-xs font-medium text-[var(--text)] truncate">
              {track.Name}
            </p>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)] truncate">
                {subtitle}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
