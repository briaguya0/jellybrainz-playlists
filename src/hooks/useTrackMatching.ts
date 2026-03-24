import {
  extractMbArtistId,
  extractMbRecordingId,
  fetchPlaylistTracks,
} from "@src/lib/jellyfin";
import {
  fetchRecordingsByRecordingIds,
  fetchRecordingsByTrackIds,
  searchRecordingsByArtist,
} from "@src/lib/musicbrainz";
import type {
  JellyfinConfig,
  JellyfinTrack,
  MbRecording,
  TrackMatchState,
} from "@src/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function useTrackMatching(
  cfg: JellyfinConfig,
  playlistId: string,
  overrides: Record<string, string>,
): {
  tracks: JellyfinTrack[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  matchStates: Map<string, TrackMatchState>;
  matchedMbids: string[];
  totalPartialAuto: number;
} {
  const {
    data: tracks,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["playlist-tracks", playlistId, cfg],
    queryFn: () => {
      if (!cfg.userId) throw new Error("No userId");
      return fetchPlaylistTracks(cfg, cfg.userId, playlistId);
    },
    enabled: !!cfg.userId,
  });

  const trackMbids = (tracks ?? []).flatMap((t) => {
    const id = extractMbRecordingId(t);
    return id ? [id] : [];
  });

  const { data: recordingMap, isPending: mbPending } = useQuery({
    queryKey: ["playlist-recordings", playlistId, trackMbids],
    queryFn: () => fetchRecordingsByTrackIds(trackMbids),
    enabled: trackMbids.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const tracksForPartialSearch =
    !tracks || !recordingMap
      ? []
      : tracks.filter((t) => {
          if (extractMbRecordingId(t)) return false;
          if (overrides[t.Id]) return false;
          return !!extractMbArtistId(t);
        });

  const partialSearchKey = tracksForPartialSearch.map((t) => t.Id).join(",");

  const { data: partialCandidatesMap, isPending: partialPending } = useQuery({
    queryKey: ["partial-search", partialSearchKey],
    queryFn: async (): Promise<Map<string, MbRecording[]>> => {
      const result = new Map<string, MbRecording[]>();
      for (let i = 0; i < tracksForPartialSearch.length; i++) {
        const track = tracksForPartialSearch[i];
        const artistId = extractMbArtistId(track);
        if (!artistId) continue;
        const candidates = await searchRecordingsByArtist(artistId, track.Name);
        result.set(track.Id, candidates);
        if (i < tracksForPartialSearch.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      }
      return result;
    },
    enabled: tracksForPartialSearch.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: keepPreviousData,
  });

  const overrideMbids = Object.values(overrides);
  const overrideMbidsKey = overrideMbids.slice().sort().join(",");

  const { data: overrideRecordingsMap } = useQuery({
    queryKey: ["override-recordings", overrideMbidsKey],
    queryFn: () => fetchRecordingsByRecordingIds(overrideMbids),
    enabled: overrideMbids.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: keepPreviousData,
  });

  const matchStates = ((): Map<string, TrackMatchState> => {
    const map = new Map<string, TrackMatchState>();
    for (const track of tracks ?? []) {
      const mbid = extractMbRecordingId(track);

      if (mbid) {
        if (mbPending) {
          map.set(track.Id, { kind: "loading" });
        } else {
          const recording = recordingMap?.get(mbid);
          map.set(
            track.Id,
            recording
              ? { kind: "exact", recording }
              : { kind: "unresolved", candidates: [] },
          );
        }
        continue;
      }

      if (overrides[track.Id]) {
        const recording = overrideRecordingsMap?.get(overrides[track.Id]);
        map.set(track.Id, { kind: "override", recording });
        continue;
      }

      if (extractMbArtistId(track)) {
        if (partialPending && !partialCandidatesMap) {
          map.set(track.Id, { kind: "loading" });
        } else {
          const candidates = partialCandidatesMap?.get(track.Id) ?? [];
          map.set(
            track.Id,
            candidates.length === 1
              ? { kind: "partial-auto", recording: candidates[0] }
              : { kind: "unresolved", candidates },
          );
        }
        continue;
      }

      map.set(track.Id, { kind: "unresolved", candidates: [] });
    }
    return map;
  })();

  const matchedMbids = (() => {
    const ids: string[] = [];
    for (const track of tracks ?? []) {
      const state = matchStates.get(track.Id);
      if (!state) continue;
      if (state.kind === "exact") ids.push(state.recording.id);
      if (state.kind === "override" && state.recording)
        ids.push(state.recording.id);
    }
    return [...new Set(ids)];
  })();

  const totalPartialAuto = [...matchStates.values()].filter(
    (s) => s.kind === "partial-auto",
  ).length;

  return {
    tracks,
    isPending,
    isError,
    error,
    matchStates,
    matchedMbids,
    totalPartialAuto,
  };
}
