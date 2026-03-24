import { usePopoverPosition } from "@src/hooks/usePopoverPosition";
import { formatArtistCredits } from "@src/lib/musicbrainz";
import type { MbRecording } from "@src/lib/types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MbBadge({
  kind,
  recording,
  onConfirm,
  onOverride,
  onClear,
}: {
  kind: "partial-auto" | "override";
  recording: MbRecording | undefined;
  onConfirm?: () => void;
  onOverride: (mbid: string) => void;
  onClear: () => void;
}) {
  const [showChange, setShowChange] = useState(false);
  const [manualMbid, setManualMbid] = useState("");
  const { open, setOpen, isMobile, pos, buttonRef, popoverRef, handleToggle } =
    usePopoverPosition({ placement: "above-right", enableMobile: true });

  useEffect(() => {
    if (!open) {
      setShowChange(false);
      setManualMbid("");
    }
  }, [open]);

  const popoverContent = !showChange ? (
    <>
      <p className="text-xs text-[var(--text-muted)] mb-2">
        {kind === "partial-auto"
          ? "Matched via artist + title search"
          : "Manually confirmed"}
      </p>
      {recording && (
        <>
          <p className="text-sm font-medium text-[var(--text)]">
            {recording.title}
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {formatArtistCredits(recording["artist-credit"])}
          </p>
        </>
      )}
      <div className="flex gap-2">
        {kind === "partial-auto" && (
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
              setOpen(false);
            }}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
          >
            Confirm
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowChange(true)}
          className="flex-1 rounded-lg island-shell border border-[var(--stroke)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Change
        </button>
      </div>
    </>
  ) : (
    <>
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
          // biome-ignore lint/a11y/noAutofocus: intentional focus when user opens change panel
          autoFocus
          className="w-full rounded-lg border-2 border-[var(--stroke)] bg-[var(--hover-bg)] px-3 py-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowChange(false)}
            className="rounded-lg island-shell border border-[var(--stroke)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="rounded-lg island-shell border border-[var(--stroke)] px-3 py-1.5 text-sm text-red-500 hover:text-red-400"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={!manualMbid}
            className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white enabled:hover:opacity-90 disabled:opacity-30"
          >
            Apply
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className="relative w-8 h-8">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={
          kind === "partial-auto"
            ? "Partial match — click to review"
            : "Confirmed match — click to change"
        }
        className="w-full h-full cursor-pointer"
      >
        <img
          src="/mb-recording-icon.svg"
          width={32}
          height={32}
          alt="MusicBrainz recording"
        />
      </button>
      <span
        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)] pointer-events-none ${
          kind === "partial-auto" ? "bg-amber-400" : "bg-green-500"
        }`}
      />
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
              style={{ bottom: pos.bottom, right: pos.right }}
              className="fixed z-50 island-shell rounded-xl border border-[var(--stroke)] p-4 w-72 rise-in"
            >
              {popoverContent}
            </div>
          ),
          document.body,
        )}
    </div>
  );
}
