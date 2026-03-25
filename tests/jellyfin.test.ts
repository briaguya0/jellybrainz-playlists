import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractMbAlbumId,
  extractMbArtistId,
  extractMbRecordingId,
  fetchPlaylistTracks,
  fetchPlaylists,
  playlistThumbnailUrl,
  resolveUserId,
  thumbnailUrl,
  ticksToDisplay,
} from "@src/lib/jellyfin";
import type { JellyfinConfig, JellyfinPlaylist, JellyfinTrack } from "@src/lib/types";

describe("extractMbRecordingId", () => {
  it("returns MusicBrainzTrack when present", () => {
    const track: JellyfinTrack = {
      Id: "1",
      Name: "Test",
      ProviderIds: { MusicBrainzTrack: "abc-123" },
    };
    expect(extractMbRecordingId(track)).toBe("abc-123");
  });

  it("falls back to MusicBrainzRecording", () => {
    const track: JellyfinTrack = {
      Id: "1",
      Name: "Test",
      ProviderIds: { MusicBrainzRecording: "def-456" },
    };
    expect(extractMbRecordingId(track)).toBe("def-456");
  });

  it("prefers MusicBrainzTrack over MusicBrainzRecording", () => {
    const track: JellyfinTrack = {
      Id: "1",
      Name: "Test",
      ProviderIds: {
        MusicBrainzTrack: "track-id",
        MusicBrainzRecording: "recording-id",
      },
    };
    expect(extractMbRecordingId(track)).toBe("track-id");
  });

  it("returns undefined when no ProviderIds", () => {
    const track: JellyfinTrack = { Id: "1", Name: "Test" };
    expect(extractMbRecordingId(track)).toBeUndefined();
  });

  it("returns undefined when ProviderIds has no MB keys", () => {
    const track: JellyfinTrack = {
      Id: "1",
      Name: "Test",
      ProviderIds: { Spotify: "spotify-id" },
    };
    expect(extractMbRecordingId(track)).toBeUndefined();
  });
});

describe("ticksToDisplay", () => {
  it("converts ticks to mm:ss", () => {
    // 3 minutes 42 seconds = 222 seconds = 2,220,000,000 ticks
    expect(ticksToDisplay(2_220_000_000)).toBe("3:42");
  });

  it("zero-pads seconds", () => {
    // 1 minute 5 seconds = 65 seconds = 650,000,000 ticks
    expect(ticksToDisplay(650_000_000)).toBe("1:05");
  });

  it("handles zero", () => {
    expect(ticksToDisplay(0)).toBe("0:00");
  });

  it("handles sub-minute durations", () => {
    // 45 seconds = 450,000,000 ticks
    expect(ticksToDisplay(450_000_000)).toBe("0:45");
  });

  it("handles long tracks", () => {
    // 12 minutes 3 seconds = 723 seconds = 7,230,000,000 ticks
    expect(ticksToDisplay(7_230_000_000)).toBe("12:03");
  });
});

const cfg: JellyfinConfig = { url: "http://jellyfin.local", apiKey: "key" };

describe("extractMbArtistId", () => {
  it("returns MusicBrainzArtist when present", () => {
    const track: JellyfinTrack = {
      Id: "1",
      Name: "Test",
      ProviderIds: { MusicBrainzArtist: "artist-id" },
    };
    expect(extractMbArtistId(track)).toBe("artist-id");
  });

  it("returns undefined when absent", () => {
    const track: JellyfinTrack = { Id: "1", Name: "Test", ProviderIds: { Spotify: "x" } };
    expect(extractMbArtistId(track)).toBeUndefined();
  });

  it("returns undefined when no ProviderIds", () => {
    const track: JellyfinTrack = { Id: "1", Name: "Test" };
    expect(extractMbArtistId(track)).toBeUndefined();
  });
});

describe("extractMbAlbumId", () => {
  it("returns MusicBrainzAlbum when present", () => {
    const track: JellyfinTrack = {
      Id: "1",
      Name: "Test",
      ProviderIds: { MusicBrainzAlbum: "album-id" },
    };
    expect(extractMbAlbumId(track)).toBe("album-id");
  });

  it("returns undefined when absent", () => {
    const track: JellyfinTrack = { Id: "1", Name: "Test", ProviderIds: {} };
    expect(extractMbAlbumId(track)).toBeUndefined();
  });

  it("returns undefined when no ProviderIds", () => {
    const track: JellyfinTrack = { Id: "1", Name: "Test" };
    expect(extractMbAlbumId(track)).toBeUndefined();
  });
});

describe("playlistThumbnailUrl", () => {
  it("returns null when no Primary image tag", () => {
    const playlist: JellyfinPlaylist = { Id: "pl-1", Name: "My Playlist" };
    expect(playlistThumbnailUrl(cfg, playlist)).toBeNull();
  });

  it("returns null when ImageTags has no Primary", () => {
    const playlist: JellyfinPlaylist = {
      Id: "pl-1",
      Name: "My Playlist",
      ImageTags: { Backdrop: "some-tag" },
    };
    expect(playlistThumbnailUrl(cfg, playlist)).toBeNull();
  });

  it("returns URL with correct params when Primary tag present", () => {
    const playlist: JellyfinPlaylist = {
      Id: "pl-1",
      Name: "My Playlist",
      ImageTags: { Primary: "tag-abc" },
    };
    const url = new URL(playlistThumbnailUrl(cfg, playlist)!);
    expect(url.pathname).toContain("pl-1");
    expect(url.searchParams.get("fillWidth")).toBe("96");
    expect(url.searchParams.get("fillHeight")).toBe("96");
    expect(url.searchParams.get("quality")).toBe("80");
    expect(url.searchParams.get("tag")).toBe("tag-abc");
  });
});

describe("thumbnailUrl", () => {
  it("uses AlbumId when present", () => {
    const track: JellyfinTrack = { Id: "track-1", Name: "T", AlbumId: "album-1" };
    const url = new URL(thumbnailUrl(cfg, track));
    expect(url.pathname).toContain("album-1");
    expect(url.pathname).not.toContain("track-1");
  });

  it("falls back to track.Id when no AlbumId", () => {
    const track: JellyfinTrack = { Id: "track-1", Name: "T" };
    const url = new URL(thumbnailUrl(cfg, track));
    expect(url.pathname).toContain("track-1");
  });

  it("uses fillWidth=80, fillHeight=80, quality=80", () => {
    const track: JellyfinTrack = { Id: "track-1", Name: "T" };
    const url = new URL(thumbnailUrl(cfg, track));
    expect(url.searchParams.get("fillWidth")).toBe("80");
    expect(url.searchParams.get("fillHeight")).toBe("80");
    expect(url.searchParams.get("quality")).toBe("80");
  });

  it("includes tag when AlbumPrimaryImageTag is set", () => {
    const track: JellyfinTrack = {
      Id: "track-1",
      Name: "T",
      AlbumId: "album-1",
      AlbumPrimaryImageTag: "tag-xyz",
    };
    const url = new URL(thumbnailUrl(cfg, track));
    expect(url.searchParams.get("tag")).toBe("tag-xyz");
  });

  it("omits tag when AlbumPrimaryImageTag is not set", () => {
    const track: JellyfinTrack = { Id: "track-1", Name: "T" };
    const url = new URL(thumbnailUrl(cfg, track));
    expect(url.searchParams.has("tag")).toBe(false);
  });
});

function mockFetch(response: { ok: boolean; status?: number; statusText?: string; json?: () => Promise<unknown>; text?: () => Promise<string> }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    statusText: response.statusText ?? "OK",
    json: response.json ?? (() => Promise.resolve({})),
    text: response.text ?? (() => Promise.resolve("")),
  });
}

describe("resolveUserId", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns cfg.userId directly when already set", async () => {
    const cfgWithUser: JellyfinConfig = { ...cfg, userId: "existing-user" };
    await expect(resolveUserId(cfgWithUser)).resolves.toBe("existing-user");
  });

  it("fetches /Users and returns first Id when userId not set", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve([{ Id: "fetched-user" }, { Id: "other-user" }]),
    }));
    await expect(resolveUserId(cfg)).resolves.toBe("fetched-user");
    vi.unstubAllGlobals();
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 401, statusText: "Unauthorized" }));
    await expect(resolveUserId(cfg)).rejects.toThrow("401");
    vi.unstubAllGlobals();
  });

  it("throws when /Users returns empty array", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve([]),
    }));
    await expect(resolveUserId(cfg)).rejects.toThrow("No users");
    vi.unstubAllGlobals();
  });
});

describe("fetchPlaylists", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends IncludeItemTypes=Playlist and Recursive=true", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ Items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchPlaylists(cfg, "user-1");
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("IncludeItemTypes")).toBe("Playlist");
    expect(calledUrl.searchParams.get("Recursive")).toBe("true");
    vi.unstubAllGlobals();
  });

  it("returns Items array", async () => {
    const items = [{ Id: "pl-1", Name: "Playlist 1" }];
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ Items: items }),
    }));
    await expect(fetchPlaylists(cfg, "user-1")).resolves.toEqual(items);
    vi.unstubAllGlobals();
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 500, statusText: "Server Error" }));
    await expect(fetchPlaylists(cfg, "user-1")).rejects.toThrow("500");
    vi.unstubAllGlobals();
  });
});

describe("fetchPlaylistTracks", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends UserId and Fields=ProviderIds,RunTimeTicks", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ Items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchPlaylistTracks(cfg, "user-1", "pl-1");
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("UserId")).toBe("user-1");
    expect(calledUrl.searchParams.get("Fields")).toBe("ProviderIds,RunTimeTicks");
    vi.unstubAllGlobals();
  });

  it("returns Items array", async () => {
    const items = [{ Id: "t-1", Name: "Track 1" }];
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ Items: items }),
    }));
    await expect(fetchPlaylistTracks(cfg, "user-1", "pl-1")).resolves.toEqual(items);
    vi.unstubAllGlobals();
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 403, statusText: "Forbidden" }));
    await expect(fetchPlaylistTracks(cfg, "user-1", "pl-1")).rejects.toThrow("403");
    vi.unstubAllGlobals();
  });
});
