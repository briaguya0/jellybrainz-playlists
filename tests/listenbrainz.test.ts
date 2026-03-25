import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendLbPlaylistTracks,
  createLbPlaylist,
  fetchLbPlaylistTracks,
  fetchLbPlaylists,
  fetchLbUsername,
  replaceLbPlaylistTracks,
} from "@src/lib/listenbrainz";

function mockFetch(response: { ok: boolean; status?: number; json?: () => Promise<unknown>; text?: () => Promise<string> }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: response.json ?? (() => Promise.resolve({})),
    text: response.text ?? (() => Promise.resolve("")),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchLbUsername", () => {
  it("sends Authorization: Token header", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ user_name: "lbuser", valid: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchLbUsername("mytoken");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Token mytoken");
  });

  it("returns user_name", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ user_name: "lbuser", valid: true }),
    }));
    await expect(fetchLbUsername("tok")).resolves.toBe("lbuser");
  });

  it("throws when valid is false", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ user_name: "lbuser", valid: false }),
    }));
    await expect(fetchLbUsername("bad-tok")).rejects.toThrow("not valid");
  });

  it("throws on non-ok response with body", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: false,
      status: 401,
      text: () => Promise.resolve("unauthorized"),
    }));
    await expect(fetchLbUsername("bad")).rejects.toThrow("unauthorized");
  });
});

describe("fetchLbPlaylists", () => {
  it("sends include_private=true and count=100", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ playlists: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchLbPlaylists("user", "tok");
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("include_private")).toBe("true");
    expect(calledUrl.searchParams.get("count")).toBe("100");
  });

  it("unwraps playlists[].playlist", async () => {
    const playlist = { identifier: "mbid-1", title: "My Playlist" };
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ playlists: [{ playlist }] }),
    }));
    await expect(fetchLbPlaylists("user", "tok")).resolves.toEqual([playlist]);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 404 }));
    await expect(fetchLbPlaylists("user", "tok")).rejects.toThrow();
  });
});

describe("fetchLbPlaylistTracks", () => {
  it("extracts MBIDs from musicbrainz.org/recording/ URLs", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({
        playlist: {
          track: [
            { identifier: ["https://musicbrainz.org/recording/mbid-1"] },
            { identifier: ["https://musicbrainz.org/recording/mbid-2"] },
          ],
        },
      }),
    }));
    await expect(fetchLbPlaylistTracks("pl-1", "tok")).resolves.toEqual(["mbid-1", "mbid-2"]);
  });

  it("skips non-MB identifiers", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({
        playlist: {
          track: [
            { identifier: ["https://open.spotify.com/track/xyz"] },
            { identifier: ["https://musicbrainz.org/recording/mbid-1"] },
          ],
        },
      }),
    }));
    await expect(fetchLbPlaylistTracks("pl-1", "tok")).resolves.toEqual(["mbid-1"]);
  });

  it("handles tracks with multiple identifiers — takes only MB ones", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({
        playlist: {
          track: [
            {
              identifier: [
                "https://open.spotify.com/track/xyz",
                "https://musicbrainz.org/recording/mbid-1",
                "https://musicbrainz.org/recording/mbid-2",
              ],
            },
          ],
        },
      }),
    }));
    await expect(fetchLbPlaylistTracks("pl-1", "tok")).resolves.toEqual(["mbid-1", "mbid-2"]);
  });
});

describe("createLbPlaylist", () => {
  it("sends JSPF structure with title, public, extension block, and track identifiers", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ playlist_mbid: "new-pl-mbid" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await createLbPlaylist("My Playlist", ["mbid-1", "mbid-2"], "tok", true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.playlist.title).toBe("My Playlist");
    expect(body.playlist.public).toBe(true);
    expect(body.playlist.extension).toBeDefined();
    expect(body.playlist.track[0].identifier[0]).toBe("https://musicbrainz.org/recording/mbid-1");
    expect(body.playlist.track[1].identifier[0]).toBe("https://musicbrainz.org/recording/mbid-2");
  });

  it("returns playlist_mbid", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ playlist_mbid: "pl-mbid" }),
    }));
    await expect(createLbPlaylist("Title", [], "tok", false)).resolves.toBe("pl-mbid");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 400 }));
    await expect(createLbPlaylist("T", [], "tok", false)).rejects.toThrow();
  });
});

describe("replaceLbPlaylistTracks", () => {
  it("fetches existing tracks first, then deletes and adds", async () => {
    const fetchMock = vi.fn()
      // fetchLbPlaylistTracks call (GET existing)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          playlist: { track: [{ identifier: ["https://musicbrainz.org/recording/old-1"] }] },
        }),
        text: () => Promise.resolve(""),
      })
      // delete call
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") })
      // add call
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);
    await replaceLbPlaylistTracks("pl-1", ["new-1"], "tok");
    // 3 calls: GET, DELETE, ADD
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1].method).toBe("POST"); // delete
    expect(fetchMock.mock.calls[2][1].method).toBe("POST"); // add
  });

  it("skips DELETE when existing is empty", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ playlist: { track: [] } }),
        text: () => Promise.resolve(""),
      })
      // add call
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);
    await replaceLbPlaylistTracks("pl-1", ["new-1"], "tok");
    // GET + ADD only
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips ADD when mbids is empty", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          playlist: { track: [{ identifier: ["https://musicbrainz.org/recording/old-1"] }] },
        }),
        text: () => Promise.resolve(""),
      })
      // delete call
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);
    await replaceLbPlaylistTracks("pl-1", [], "tok");
    // GET + DELETE only
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws on delete failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          playlist: { track: [{ identifier: ["https://musicbrainz.org/recording/old-1"] }] },
        }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve("error") });
    vi.stubGlobal("fetch", fetchMock);
    await expect(replaceLbPlaylistTracks("pl-1", ["new-1"], "tok")).rejects.toThrow();
  });
});

describe("appendLbPlaylistTracks", () => {
  it("sends JSPF track array to .../item/add endpoint", async () => {
    const fetchMock = mockFetch({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await appendLbPlaylistTracks("pl-1", ["mbid-1"], "tok");
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("pl-1/item/add");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.playlist.track[0].identifier[0]).toBe("https://musicbrainz.org/recording/mbid-1");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 400 }));
    await expect(appendLbPlaylistTracks("pl-1", ["mbid-1"], "tok")).rejects.toThrow();
  });
});
