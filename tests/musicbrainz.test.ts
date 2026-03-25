import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchRecordingsByTrackIds,
  searchRecordingsByArtist,
  searchRecordingsByRelease,
} from "../src/lib/musicbrainz";

// Fixtures — MB API responses
import exactMatchTidSearch from "./fixtures/exact-match/mb-tid-search.json";
import noTidMultipleResults from "./fixtures/no-tid-multiple-results/mb-arid-search.json";
import noTidSingleResult from "./fixtures/no-tid-single-result/mb-arid-search.json";
import noTidStaleArtistAridCurrent from "./fixtures/no-tid-stale-artist/mb-arid-search-current.json";
import noTidStaleArtistAridStale from "./fixtures/no-tid-stale-artist/mb-arid-search-stale.json";
import noTidStaleArtistLookup from "./fixtures/no-tid-stale-artist/mb-artist-lookup.json";
import staleTidStaleReleaseReidCurrent from "./fixtures/stale-tid-stale-release/mb-reid-search-current.json";
import staleTidStaleReleaseReidStale from "./fixtures/stale-tid-stale-release/mb-reid-search-stale.json";
import staleTidStaleReleaseLookup from "./fixtures/stale-tid-stale-release/mb-release-lookup.json";
import staleTidValidReleaseReidSearch from "./fixtures/stale-tid-valid-release/mb-reid-search.json";
import staleTidValidReleaseTidSearch from "./fixtures/stale-tid-valid-release/mb-tid-search.json";

// Fixtures — Jellyfin track objects
import exactMatchTrack from "./fixtures/exact-match/jellyfin-track.json";
import noTidMultipleResultsTrack from "./fixtures/no-tid-multiple-results/jellyfin-track.json";
import noTidSingleResultTrack from "./fixtures/no-tid-single-result/jellyfin-track.json";
import noTidStaleArtistTrack from "./fixtures/no-tid-stale-artist/jellyfin-track.json";
import staleTidStaleReleaseTrack from "./fixtures/stale-tid-stale-release/jellyfin-track.json";
import staleTidValidReleaseTrack from "./fixtures/stale-tid-valid-release/jellyfin-track.json";

function mockOk(data: unknown): Response {
  return { ok: true, json: () => Promise.resolve(data) } as Response;
}

describe("fetchRecordingsByTrackIds", () => {
  afterEach(() => vi.restoreAllMocks());

  it("exact match: maps track MBID to recording", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      mockOk(exactMatchTidSearch),
    );

    const trackMbid = exactMatchTrack.ProviderIds.MusicBrainzTrack;
    const result = await fetchRecordingsByTrackIds([trackMbid]);

    expect(result.size).toBe(1);
    expect(result.get(trackMbid)?.id).toBe(exactMatchTidSearch.recordings[0].id);
  });

  it("stale tid: returns empty map when tid search returns no results", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      mockOk(staleTidValidReleaseTidSearch),
    );

    const trackMbid = staleTidValidReleaseTrack.ProviderIds.MusicBrainzTrack;
    const result = await fetchRecordingsByTrackIds([trackMbid]);

    expect(result.size).toBe(0);
  });
});

describe("searchRecordingsByRelease", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("valid release: returns recording directly from reid search", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      mockOk(staleTidValidReleaseReidSearch),
    );

    const releaseMbid =
      staleTidValidReleaseTrack.ProviderIds.MusicBrainzAlbum;
    const result = await searchRecordingsByRelease(
      releaseMbid,
      staleTidValidReleaseTrack.Name,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4303da20-e041-409f-a58f-e170392252a6");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("stale release: resolves current MBID via lookup and retries", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(mockOk(staleTidStaleReleaseReidStale))
      .mockResolvedValueOnce(mockOk(staleTidStaleReleaseLookup))
      .mockResolvedValueOnce(mockOk(staleTidStaleReleaseReidCurrent));

    const releaseMbid =
      staleTidStaleReleaseTrack.ProviderIds.MusicBrainzAlbum;
    const resultPromise = searchRecordingsByRelease(
      releaseMbid,
      staleTidStaleReleaseTrack.Name,
    );
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fc8d08c7-85f4-4798-9243-dfab562bdd21");
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("stale release: returns empty when lookup confirms MBID is current", async () => {
    const selfLookup = { id: "403735a0-3901-4b19-b10a-d8d4b46132f5" };
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(mockOk(staleTidStaleReleaseReidStale))
      .mockResolvedValueOnce(mockOk(selfLookup));

    const resultPromise = searchRecordingsByRelease(
      "403735a0-3901-4b19-b10a-d8d4b46132f5",
      "Foreign Object",
    );
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toHaveLength(0);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("searchRecordingsByArtist", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("single result: returns one candidate", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      mockOk(noTidSingleResult),
    );

    const artistMbid = noTidSingleResultTrack.ProviderIds.MusicBrainzArtist;
    const result = await searchRecordingsByArtist(
      artistMbid,
      noTidSingleResultTrack.Name,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("63cffd29-87fc-4626-a498-e869772fd26c");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("multiple results: returns all candidates", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      mockOk(noTidMultipleResults),
    );

    const artistMbid =
      noTidMultipleResultsTrack.ProviderIds.MusicBrainzArtist;
    const result = await searchRecordingsByArtist(
      artistMbid,
      noTidMultipleResultsTrack.Name,
    );

    expect(result.length).toBeGreaterThan(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("stale artist: resolves current MBID via lookup and retries", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(mockOk(noTidStaleArtistAridStale))
      .mockResolvedValueOnce(mockOk(noTidStaleArtistLookup))
      .mockResolvedValueOnce(mockOk(noTidStaleArtistAridCurrent));

    const artistMbid = noTidStaleArtistTrack.ProviderIds.MusicBrainzArtist;
    const resultPromise = searchRecordingsByArtist(
      artistMbid,
      noTidStaleArtistTrack.Name,
    );
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(noTidStaleArtistAridCurrent.recordings[0].id);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("stale artist: returns empty when lookup confirms MBID is current", async () => {
    const selfLookup = { id: "e0ba3adc-206a-424c-97b1-09ff3a4a74a6" };
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(mockOk(noTidStaleArtistAridStale))
      .mockResolvedValueOnce(mockOk(selfLookup));

    const resultPromise = searchRecordingsByArtist(
      "e0ba3adc-206a-424c-97b1-09ff3a4a74a6",
      noTidStaleArtistTrack.Name,
    );
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toHaveLength(0);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
