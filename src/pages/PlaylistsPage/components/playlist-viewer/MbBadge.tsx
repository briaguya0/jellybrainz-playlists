import { asset } from "@src/lib/utils";
import type { MbRecording } from "@src/lib/types";
import { useState } from "react";
import { ExternalLink, Save } from "lucide-react";

export function MbBadgeStatus({
  kind,
  matchLabel,
  overrideSource,
  recording,
  onClear,
  onCollapse,
}: {
  kind: "partial-auto" | "override";
  matchLabel: string;
  overrideSource?: "confirmed-album" | "confirmed-artist" | "manual" | "selected";
  recording: MbRecording | undefined;
  onClear?: () => void;
  onCollapse: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1 pl-1 group">
        <span className="text-[10px] sm:text-xs text-app-text font-mono font-bold truncate">
          {recording ? recording.id : "????????-????-????-????-????????????"}
        </span>
        {recording && (
          <a
            href={`https://musicbrainz.org/recording/${recording.id}`}
            target="_blank"
            rel="noreferrer"
            aria-label="View on MusicBrainz"
            className="shrink-0 text-app-muted sm:opacity-0 sm:group-hover:opacity-60 sm:hover:!opacity-100 transition-opacity"
          >
            <ExternalLink size={11} />
          </a>
        )}
      </div>
      <p className={`text-xs text-app-muted pl-1 ${kind === "override" ? "mb-1" : "mb-4"}`}>
        {matchLabel}
      </p>
      {kind === "override" && (
        <button
          type="button"
          onClick={() => {
            onClear?.();
            onCollapse();
          }}
          className="text-xs text-red-500 hover:text-red-400 transition-colors pl-1 mb-4"
        >
          {overrideSource === "confirmed-album" || overrideSource === "confirmed-artist"
            ? "Clear confirmation"
            : overrideSource === "selected"
              ? "Clear selection"
              : "Clear entry"}
        </button>
      )}
    </div>
  );
}

export function MbBadgeManualEntry({
  onOverride,
  onCollapse,
}: {
  onOverride: (mbid: string) => void;
  onCollapse: () => void;
}) {
  const [manualMbid, setManualMbid] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (manualMbid) {
          onOverride(manualMbid.trim());
          onCollapse();
        }
      }}
    >
      <p className="text-sm font-semibold text-app-text mb-1 pl-1">Manually enter recording ID</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={manualMbid}
          onChange={(e) => setManualMbid(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          // biome-ignore lint/a11y/noAutofocus: intentional focus when user opens change panel
          autoFocus
          className="flex-1 min-w-0 rounded-lg border-2 border-stroke bg-hover px-3 py-1.5 text-xs text-app-text outline-none placeholder:text-app-muted focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!manualMbid}
          aria-label="Save"
          className="shrink-0 text-app-muted enabled:hover:text-app-text disabled:opacity-30 transition-colors"
        >
          <Save size={16} />
        </button>
      </div>
    </form>
  );
}

export function MbBadgeEditContent({
  kind,
  matchLabel,
  overrideSource,
  recording,
  onOverride,
  onClear,
  onCollapse,
}: {
  kind: "partial-auto" | "override";
  matchLabel: string;
  overrideSource?: "confirmed-album" | "confirmed-artist" | "manual" | "selected";
  recording: MbRecording | undefined;
  onOverride: (mbid: string) => void;
  onClear?: () => void;
  onCollapse: () => void;
}) {
  return (
    <>
      <MbBadgeStatus
        kind={kind}
        matchLabel={matchLabel}
        overrideSource={overrideSource}
        recording={recording}
        onClear={onClear}
        onCollapse={onCollapse}
      />
      <MbBadgeManualEntry onOverride={onOverride} onCollapse={onCollapse} />
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
