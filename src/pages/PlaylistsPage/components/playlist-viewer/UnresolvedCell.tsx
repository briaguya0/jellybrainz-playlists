import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { usePopoverPosition } from "../../../../hooks/usePopoverPosition";
import { formatArtistCredits, msToDisplay } from "../../../../lib/musicbrainz";
import type { MbRecording } from "../../../../lib/types";

export function UnresolvedCell({
  candidates,
  onOverride,
}: {
  candidates: MbRecording[];
  onOverride: (mbid: string) => void;
}) {
  const [manualMbid, setManualMbid] = useState("");
  const { open, setOpen, isMobile, pos, buttonRef, popoverRef, handleToggle } =
    usePopoverPosition({ placement: "below-left", enableMobile: true });

  const popoverContent = (
    <>
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
    </>
  );

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
          isMobile ? (
            <>
              {/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
              <div
                className="fixed inset-0 z-50 bg-black/40"
                onClick={() => setOpen(false)}
              />
              <div
                ref={popoverRef}
                className="fixed inset-x-0 bottom-0 z-50 island-shell rounded-t-2xl border-t border-[var(--stroke)] p-5 max-h-[80vh] overflow-y-auto rise-in"
              >
                {popoverContent}
              </div>
            </>
          ) : (
            <div
              ref={popoverRef}
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-50 island-shell rounded-xl border border-[var(--stroke)] p-4 w-80 rise-in"
            >
              {popoverContent}
            </div>
          ),
          document.body,
        )}
    </div>
  );
}
