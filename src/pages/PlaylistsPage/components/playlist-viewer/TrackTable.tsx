import type {
  JellyfinConfig,
  JellyfinTrack,
  TrackMatchState,
} from "@src/lib/types";
import { asset } from "@src/lib/utils";
import { TrackTableRow } from "./TrackTableRow";

export function TrackTable({
  isPending,
  tracks,
  cfg,
  matchStates,
  onSetOverride,
  onClearOverride,
}: {
  isPending: boolean;
  tracks: JellyfinTrack[] | undefined;
  cfg: JellyfinConfig;
  matchStates: Map<string, TrackMatchState>;
  onSetOverride: (jellyfinId: string, mbid: string) => void;
  onClearOverride: (jellyfinId: string) => void;
}) {
  return (
    <div className="glass-panel rounded-xl border border-stroke">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-stroke">
            <th className="w-[72px] sm:w-1/2 px-4 py-3 text-center">
              <img
                src={asset("/jellyfin-icon.svg")}
                width={32}
                height={32}
                alt="Jellyfin"
                className="mx-auto"
              />
            </th>
            <th className="px-4 py-3 text-center">
              <img
                src={asset("/musicbrainz-icon.svg")}
                width={32}
                height={32}
                alt="MusicBrainz"
                className="mx-auto"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {isPending
            ? ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((k) => (
                <tr key={k} className="border-b border-stroke animate-pulse">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[var(--stroke)] shrink-0" />
                      <div className="hidden sm:block">
                        <div className="h-3 w-32 rounded bg-[var(--stroke)] mb-1.5" />
                        <div className="h-2.5 w-20 rounded bg-[var(--stroke)]" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            : tracks?.map((track) => (
                <TrackTableRow
                  key={track.Id}
                  track={track}
                  cfg={cfg}
                  matchState={matchStates.get(track.Id) ?? { kind: "loading" }}
                  onSetOverride={onSetOverride}
                  onClearOverride={onClearOverride}
                />
              ))}
        </tbody>
      </table>
    </div>
  );
}
