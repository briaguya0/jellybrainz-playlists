import { asset } from "@src/lib/utils";
import { formatArtistCredits } from "@src/lib/musicbrainz";
import type { MbRecording } from "@src/lib/types";
import { useState } from "react";

export function MbBadgeEditContent({
  kind,
  recording,
  onConfirm,
  onOverride,
  onClear,
  onCollapse,
}: {
  kind: "partial-auto" | "override";
  recording: MbRecording | undefined;
  onConfirm?: () => void;
  onOverride: (mbid: string) => void;
  onClear: () => void;
  onCollapse: () => void;
}) {
  const [showChange, setShowChange] = useState(false);
  const [manualMbid, setManualMbid] = useState("");

  if (!showChange) {
    return (
      <>
        <p className="text-xs text-app-muted mb-2">
          {kind === "partial-auto"
            ? "Matched via artist + title search"
            : "Manually confirmed"}
        </p>
        {recording && (
          <>
            <p className="text-sm font-medium text-app-text">
              {recording.title}
            </p>
            <p className="text-xs text-app-muted mb-3">
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
                onCollapse();
              }}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
            >
              Confirm
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowChange(true)}
            className="flex-1 rounded-lg glass-panel border border-stroke px-3 py-1.5 text-sm text-app-muted hover:text-app-text"
          >
            Change
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="text-xs text-app-muted mb-2">
        Enter MusicBrainz recording ID
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualMbid) {
            onOverride(manualMbid.trim());
            onCollapse();
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
          className="w-full rounded-lg border-2 border-stroke bg-hover px-3 py-2 text-xs text-app-text outline-none placeholder:text-app-muted focus:border-[var(--accent)]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowChange(false)}
            className="rounded-lg glass-panel border border-stroke px-3 py-1.5 text-sm text-app-muted hover:text-app-text"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              onClear();
              onCollapse();
            }}
            className="rounded-lg glass-panel border border-stroke px-3 py-1.5 text-sm text-red-500 hover:text-red-400"
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
}

export function MbBadge({
  kind,
}: {
  kind: "partial-auto" | "override";
}) {
  return (
    <div className="relative w-8 h-8">
      <img
        src={asset("/mb-recording-icon.svg")}
        width={32}
        height={32}
        alt="MusicBrainz recording"
      />
      <span
        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)] pointer-events-none ${
          kind === "partial-auto" ? "bg-amber-400" : "bg-green-500"
        }`}
      />
    </div>
  );
}
