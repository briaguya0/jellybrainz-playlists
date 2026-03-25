import {
  extractMbAlbumId,
  extractMbArtistId,
  extractMbRecordingId,
  fetchPlaylistTracks,
} from "@src/lib/jellyfin";
import {
  fetchRecordingsByRecordingIds,
  fetchRecordingsByTrackIds,
  searchRecordingsByArtist,
  searchRecordingsByRelease,
} from "@src/lib/musicbrainz";
import type {
  JellyfinConfig,
  JellyfinTrack,
  MbRecording,
  OverrideEntry,
  TrackMatchState,
} from "@src/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function useTrackMatching(
  cfg: JellyfinConfig | null,
  playlistId: string | undefined,
  overrides: Record<string, OverrideEntry>,
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
      if (!cfg?.userId || !playlistId) throw new Error("No config");
      return fetchPlaylistTracks(cfg, cfg.userId, playlistId);
    },
    enabled: !!cfg?.userId && !!playlistId,
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
          const mbid = extractMbRecordingId(t);
          if (mbid && recordingMap.get(mbid)) return false;
          if (overrides[t.Id]) return false;
          return !!extractMbArtistId(t);
        });

  const tracksForAlbumSearch = tracksForPartialSearch.filter((t) =>
    !!extractMbAlbumId(t),
  );
  const albumSearchKey = tracksForAlbumSearch.map((t) => t.Id).join(",");

  const { data: albumCandidatesMap, isPending: albumPending } = useQuery({
    queryKey: ["album-search", albumSearchKey],
    queryFn: async (): Promise<Map<string, MbRecording[]>> => {
      const result = new Map<string, MbRecording[]>();
      for (let i = 0; i < tracksForAlbumSearch.length; i++) {
        const track = tracksForAlbumSearch[i];
        const albumId = extractMbAlbumId(track)!;
        const candidates = await searchRecordingsByRelease(albumId, track.Name);
        result.set(track.Id, candidates);
        if (i < tracksForAlbumSearch.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      }
      return result;
    },
    enabled: tracksForAlbumSearch.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: keepPreviousData,
  });

  const tracksForArtistSearch = tracksForPartialSearch.filter((t) => {
    const albumId = extractMbAlbumId(t);
    if (!albumId) return true;
    if (!albumCandidatesMap) return false;
    const candidates = albumCandidatesMap.get(t.Id) ?? [];
    return candidates.length !== 1;
  });
  const artistSearchKey = tracksForArtistSearch.map((t) => t.Id).join(",");

  const { data: artistCandidatesMap, isPending: artistPending } = useQuery({
    queryKey: ["artist-search", artistSearchKey],
    queryFn: async (): Promise<Map<string, MbRecording[]>> => {
      const result = new Map<string, MbRecording[]>();
      for (let i = 0; i < tracksForArtistSearch.length; i++) {
        const track = tracksForArtistSearch[i];
        const artistId = extractMbArtistId(track);
        if (!artistId) continue;
        const candidates = await searchRecordingsByArtist(artistId, track.Name);
        result.set(track.Id, candidates);
        if (i < tracksForArtistSearch.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      }
      return result;
    },
    enabled:
      tracksForArtistSearch.length > 0 &&
      (tracksForAlbumSearch.length === 0 || !!albumCandidatesMap),
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: keepPreviousData,
  });

  const overrideMbids = Object.values(overrides).map((e) => e.mbid);
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
      // User overrides take precedence over all automatic matching.
      if (overrides[track.Id]) {
        const { mbid: overrideMbid, source } = overrides[track.Id];
        // If the override MBID is already in our candidate results (i.e. the
        // user confirmed a partial-auto match), use it directly — no fetch needed.
        const knownCandidates = [
          ...(albumCandidatesMap?.get(track.Id) ?? []),
          ...(artistCandidatesMap?.get(track.Id) ?? []),
        ];
        const recording =
          knownCandidates.find((r) => r.id === overrideMbid) ??
          overrideRecordingsMap?.get(overrideMbid);
        map.set(track.Id, { kind: "override", recording, source });
        continue;
      }

      const mbid = extractMbRecordingId(track);

      if (mbid) {
        if (mbPending) {
          map.set(track.Id, { kind: "loading" });
          continue;
        }
        const recording = recordingMap?.get(mbid);
        if (recording) {
          map.set(track.Id, { kind: "exact", recording });
          continue;
        }
        // MBT ID exists but didn't resolve — fall through to partial search.
      }

      if (extractMbArtistId(track)) {
        const albumId = extractMbAlbumId(track);
        if (albumId) {
          // Waiting for album search to complete.
          if (albumPending && !albumCandidatesMap) {
            map.set(track.Id, { kind: "loading" });
            continue;
          }
          const albumCandidates = albumCandidatesMap?.get(track.Id) ?? [];
          if (albumCandidates.length === 1) {
            map.set(track.Id, { kind: "partial-auto", recording: albumCandidates[0], matchSource: "album" });
            continue;
          }
          // Album search didn't resolve uniquely — fall through to artist search.
        }

        const artistDone = artistCandidatesMap?.has(track.Id);
        if (!artistDone && (artistPending || !artistCandidatesMap)) {
          map.set(track.Id, { kind: "loading" });
        } else {
          const candidates = artistCandidatesMap?.get(track.Id) ?? [];
          map.set(
            track.Id,
            candidates.length === 1
              ? { kind: "partial-auto", recording: candidates[0], matchSource: "artist" }
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
