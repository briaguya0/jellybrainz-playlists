import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTrackMatching } from "@src/hooks/useTrackMatching";
import type { JellyfinConfig, JellyfinTrack, MbRecording } from "@src/lib/types";

vi.mock("@src/lib/jellyfin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/jellyfin")>();
  return { ...actual, fetchPlaylistTracks: vi.fn() };
});

vi.mock("@src/lib/musicbrainz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/musicbrainz")>();
  return {
    ...actual,
    fetchRecordingsByTrackIds: vi.fn(),
    fetchRecordingsByRecordingIds: vi.fn(),
    searchRecordingsByRelease: vi.fn(),
    searchRecordingsByArtist: vi.fn(),
  };
});

import { fetchPlaylistTracks } from "@src/lib/jellyfin";
import {
  fetchRecordingsByRecordingIds,
  fetchRecordingsByTrackIds,
  searchRecordingsByArtist,
  searchRecordingsByRelease,
} from "@src/lib/musicbrainz";

const mockFetchPlaylistTracks = vi.mocked(fetchPlaylistTracks);
const mockFetchRecordingsByTrackIds = vi.mocked(fetchRecordingsByTrackIds);
const mockFetchRecordingsByRecordingIds = vi.mocked(fetchRecordingsByRecordingIds);
const mockSearchRecordingsByRelease = vi.mocked(searchRecordingsByRelease);
const mockSearchRecordingsByArtist = vi.mocked(searchRecordingsByArtist);

const cfg: JellyfinConfig = { url: "http://jellyfin.local", apiKey: "key", userId: "user-1" };

function makeRec(id: string): MbRecording {
  return { id, title: `Recording ${id}` };
}

function makeTrack(overrides: Partial<JellyfinTrack> & { Id: string; Name: string }): JellyfinTrack {
  return overrides;
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchRecordingsByRecordingIds.mockResolvedValue(new Map());
});

describe("useTrackMatching", () => {
  it("exact match: TID in recordingMap → { kind: 'exact', recording }", async () => {
    const track = makeTrack({ Id: "t1", Name: "Song", ProviderIds: { MusicBrainzTrack: "tid-1" } });
    const rec = makeRec("rec-1");
    mockFetchPlaylistTracks.mockResolvedValue([track]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map([["tid-1", rec]]));

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.matchStates.get("t1")?.kind).toBe("exact"));
    const state = result.current.matchStates.get("t1");
    if (state?.kind === "exact") expect(state.recording).toEqual(rec);
  });

  it("no TID + artist ID, single result → partial-auto", async () => {
    // Need a TID-bearing track so recordingMap query runs (enabling partial search)
    const tidTrack = makeTrack({ Id: "t0", Name: "TID Song", ProviderIds: { MusicBrainzTrack: "tid-0" } });
    const track = makeTrack({
      Id: "t1",
      Name: "Song",
      ProviderIds: { MusicBrainzArtist: "artist-1" },
    });
    const rec = makeRec("rec-1");
    mockFetchPlaylistTracks.mockResolvedValue([tidTrack, track]);
    // tid-0 not in recordingMap (stale), t1 has no TID → falls through to artist search
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map());
    mockSearchRecordingsByArtist.mockResolvedValue([rec]);

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.matchStates.get("t1")?.kind).toBe("partial-auto"), { timeout: 5000 });
  });

  it("no TID + artist ID, multiple results → unresolved with candidates", async () => {
    // Need a TID-bearing track so recordingMap query runs (enabling partial search)
    const tidTrack = makeTrack({ Id: "t0", Name: "TID Song", ProviderIds: { MusicBrainzTrack: "tid-0" } });
    const track = makeTrack({
      Id: "t1",
      Name: "Song",
      ProviderIds: { MusicBrainzArtist: "artist-1" },
    });
    const candidates = [makeRec("r1"), makeRec("r2")];
    mockFetchPlaylistTracks.mockResolvedValue([tidTrack, track]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map());
    mockSearchRecordingsByArtist.mockResolvedValue(candidates);

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.matchStates.get("t1")?.kind).toBe("unresolved"), { timeout: 5000 });
    const state = result.current.matchStates.get("t1");
    if (state?.kind === "unresolved") expect(state.candidates).toEqual(candidates);
  });

  it("override takes precedence over TID → { kind: 'override' }", async () => {
    const track = makeTrack({
      Id: "t1",
      Name: "Song",
      ProviderIds: { MusicBrainzTrack: "tid-1" },
    });
    const rec = makeRec("override-rec");
    mockFetchPlaylistTracks.mockResolvedValue([track]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map([["tid-1", makeRec("rec-1")]]));
    mockFetchRecordingsByRecordingIds.mockResolvedValue(new Map([["override-rec", rec]]));

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", { t1: "override-rec" }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.matchStates.get("t1")?.kind).toBe("override"));
  });

  it("no artist ID, no TID → { kind: 'unresolved', candidates: [] }", async () => {
    const track = makeTrack({ Id: "t1", Name: "Song" });
    mockFetchPlaylistTracks.mockResolvedValue([track]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map());

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.tracks).toBeDefined());
    // No partial search triggered, state should settle immediately
    await waitFor(() => {
      const state = result.current.matchStates.get("t1");
      expect(state?.kind).toBe("unresolved");
      if (state?.kind === "unresolved") expect(state.candidates).toEqual([]);
    });
  });

  it("stale TID + valid album ID → partial-auto via album search", async () => {
    const track = makeTrack({
      Id: "t1",
      Name: "Song",
      ProviderIds: {
        MusicBrainzTrack: "tid-1",
        MusicBrainzArtist: "artist-1",
        MusicBrainzAlbum: "album-1",
      },
    });
    const rec = makeRec("rec-via-album");
    mockFetchPlaylistTracks.mockResolvedValue([track]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map());
    mockSearchRecordingsByRelease.mockResolvedValue([rec]);

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.matchStates.get("t1")?.kind).toBe("partial-auto"));
    const state = result.current.matchStates.get("t1");
    if (state?.kind === "partial-auto") expect(state.recording).toEqual(rec);
  });

  it("matchedMbids includes exact matches, deduplicates, excludes partial-auto", async () => {
    const track1 = makeTrack({
      Id: "t1",
      Name: "Song1",
      ProviderIds: { MusicBrainzTrack: "tid-1" },
    });
    const track2 = makeTrack({
      Id: "t2",
      Name: "Song2",
      ProviderIds: { MusicBrainzTrack: "tid-2" },
    });
    const rec = makeRec("shared-rec");
    mockFetchPlaylistTracks.mockResolvedValue([track1, track2]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(
      new Map([["tid-1", rec], ["tid-2", rec]]),
    );

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() =>
      expect(result.current.matchStates.get("t1")?.kind).toBe("exact"),
    );
    expect(result.current.matchedMbids).toEqual(["shared-rec"]);
  });

  it("totalPartialAuto counts only partial-auto states", async () => {
    const track1 = makeTrack({
      Id: "t1",
      Name: "Song1",
      ProviderIds: { MusicBrainzArtist: "artist-1" },
    });
    const track2 = makeTrack({
      Id: "t2",
      Name: "Song2",
      ProviderIds: { MusicBrainzTrack: "tid-2" },
    });
    const rec1 = makeRec("rec-1");
    const rec2 = makeRec("rec-2");
    mockFetchPlaylistTracks.mockResolvedValue([track1, track2]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map([["tid-2", rec2]]));
    mockSearchRecordingsByArtist.mockResolvedValue([rec1]);

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() =>
      expect(result.current.matchStates.get("t1")?.kind).toBe("partial-auto"),
    );
    expect(result.current.totalPartialAuto).toBe(1);
  });

  it("loading — recordingMap pending → TID tracks show { kind: 'loading' }", async () => {
    const track = makeTrack({ Id: "t1", Name: "Song", ProviderIds: { MusicBrainzTrack: "tid-1" } });
    let resolveTrackIds!: (v: Map<string, MbRecording>) => void;
    mockFetchPlaylistTracks.mockResolvedValue([track]);
    mockFetchRecordingsByTrackIds.mockReturnValue(
      new Promise<Map<string, MbRecording>>((r) => { resolveTrackIds = r; }),
    );

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.tracks).toBeDefined());
    // recordingMap not yet resolved
    expect(result.current.matchStates.get("t1")?.kind).toBe("loading");

    // Clean up
    await act(async () => resolveTrackIds(new Map()));
  });

  it("artist search not enabled until album search settles", async () => {
    // TID track needed so recordingMap query runs, enabling partial search
    const tidTrack = makeTrack({ Id: "t0", Name: "TID Song", ProviderIds: { MusicBrainzTrack: "tid-0" } });
    const track = makeTrack({
      Id: "t1",
      Name: "Song",
      ProviderIds: {
        MusicBrainzTrack: "tid-1", // stale — won't be in recordingMap
        MusicBrainzArtist: "artist-1",
        MusicBrainzAlbum: "album-1",
      },
    });
    let resolveAlbumSearch!: (value: MbRecording[]) => void;
    const albumSearchPromise = new Promise<MbRecording[]>((r) => { resolveAlbumSearch = r; });

    mockFetchPlaylistTracks.mockResolvedValue([tidTrack, track]);
    mockFetchRecordingsByTrackIds.mockResolvedValue(new Map());
    mockSearchRecordingsByRelease.mockReturnValue(albumSearchPromise);
    mockSearchRecordingsByArtist.mockResolvedValue([]);

    const { result } = renderHook(
      () => useTrackMatching(cfg, "pl-1", {}),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.tracks).toBeDefined());

    // Album search hasn't settled — artist search should not be called yet
    expect(mockSearchRecordingsByArtist).not.toHaveBeenCalled();

    // Settle album search with no results (→ falls through to artist search)
    await act(async () => resolveAlbumSearch([]));
    await waitFor(() => expect(mockSearchRecordingsByArtist).toHaveBeenCalled(), { timeout: 5000 });
  });
});
