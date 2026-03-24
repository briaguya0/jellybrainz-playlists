import { ExternalLink } from "lucide-react";
import { formatArtistCredits, msToDisplay } from "../../../../lib/musicbrainz";
import type { MbRecording } from "../../../../lib/types";

export function RecordingInfo({ recording }: { recording: MbRecording }) {
  return (
    <a
      href={`https://musicbrainz.org/recording/${recording.id}`}
      target="_blank"
      rel="noreferrer"
      className="group min-w-0 flex-1"
    >
      <p className="text-sm font-medium text-[var(--text)] truncate flex items-center gap-1">
        <span className="truncate">{recording.title}</span>
        <ExternalLink
          size={10}
          className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
        />
      </p>
      <p className="text-xs text-[var(--text-muted)] truncate">
        {[
          formatArtistCredits(recording["artist-credit"]),
          recording.length != null ? msToDisplay(recording.length) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </a>
  );
}
