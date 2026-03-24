import { Popover } from "@src/components/Popover";
import { asset } from "@src/lib/utils";
import { formatArtistCredits, msToDisplay } from "@src/lib/musicbrainz";
import type { MbRecording } from "@src/lib/types";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

function UnresolvedContent({
  candidates,
  onOverride,
  close,
}: {
  candidates: MbRecording[];
  onOverride: (mbid: string) => void;
  close: () => void;
}) {
  const [manualMbid, setManualMbid] = useState("");

  return (
    <>
      {candidates.length > 0 && (
        <>
          <p className="text-xs text-app-muted mb-2">Possible matches</p>
          <div className="space-y-1 mb-3">
            {candidates.map((rec) => (
              <div key={rec.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onOverride(rec.id);
                    close();
                  }}
                  className="flex-1 min-w-0 text-left rounded-lg px-3 py-2 hover:bg-surface text-sm"
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
          <hr className="border-stroke mb-3" />
        </>
      )}
      <p className="text-xs text-app-muted mb-2">
        Enter MusicBrainz recording ID
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualMbid) {
            onOverride(manualMbid.trim());
            close();
          }
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          value={manualMbid}
          onChange={(e) => setManualMbid(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full rounded-lg border-2 border-stroke bg-hover px-3 py-2 text-xs text-app-text outline-none placeholder:text-app-muted focus:border-[var(--accent)]"
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
}

export function UnresolvedCell({
  candidates,
  onOverride,
}: {
  candidates: MbRecording[];
  onOverride: (mbid: string) => void;
}) {
  return (
    <Popover
      placement="below-left"
      enableMobile
      className="w-80"
      content={(close) => (
        <UnresolvedContent
          candidates={candidates}
          onOverride={onOverride}
          close={close}
        />
      )}
    >
      <button
        type="button"
        aria-label="No MusicBrainz match — click to search or enter MBID"
        className="relative w-8 h-8 cursor-pointer"
      >
        <img
          src={asset("/mb-blank-icon.svg")}
          width={32}
          height={32}
          alt="No MusicBrainz match"
        />
        <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold leading-none">
          ?
        </span>
      </button>
    </Popover>
  );
}
