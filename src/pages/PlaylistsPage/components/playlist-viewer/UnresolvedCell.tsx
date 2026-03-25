import { asset } from "@src/lib/utils";
import { formatArtistCredits, msToDisplay } from "@src/lib/musicbrainz";
import type { MbRecording } from "@src/lib/types";
import { ExternalLink } from "lucide-react";

export function UnresolvedCandidates({
  candidates,
  selectedMbid,
  onSelect,
}: {
  candidates: MbRecording[];
  selectedMbid?: string;
  onSelect: (mbid: string) => void;
}) {
  if (candidates.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-app-muted mb-2 pl-1">Possible matches</p>
      <div className="space-y-1">
        {candidates.map((rec) => (
          <div key={rec.id} className={`relative flex items-center gap-1 max-sm:-mx-3 max-sm:px-3 sm:-ml-2 sm:pl-2 ${rec.id === selectedMbid ? "bg-linear-to-r from-green-500/15 to-transparent rounded-sm border-l-3 border-r-0 border-green-500" : ""}`}>
            <button
              type="button"
              onClick={() => onSelect(rec.id)}
              className="flex-1 min-w-0 text-left pl-1 pr-3 py-2 text-sm"
            >
              <p className="font-medium text-app-text truncate">
                {rec.title}
                {rec.length ? (
                  <span className="ml-1 font-normal text-app-muted">
                    {msToDisplay(rec.length)}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-app-muted truncate">
                {formatArtistCredits(rec["artist-credit"])}
              </p>
              {rec.releases?.[0] && (
                <p className="text-xs text-app-muted truncate opacity-60">
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
              className="shrink-0 p-1.5 text-app-muted hover:text-app-text rounded-lg hover:bg-surface"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UnresolvedCell() {
  return (
    <div className="relative w-8 h-8">
      <img
        src={asset("/mb-blank-icon.svg")}
        width={32}
        height={32}
        alt="No MusicBrainz match"
      />
      <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold leading-none pointer-events-none">
        ?
      </span>
    </div>
  );
}
