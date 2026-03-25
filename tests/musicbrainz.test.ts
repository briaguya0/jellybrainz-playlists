import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addRecordingsToCollection,
  chunkArray,
  createCollection,
  deleteRecordingsFromCollection,
  fetchCollectionRecordings,
  fetchCollections,
  fetchRecordingsByRecordingIds,
  formatArtistCredits,
  msToDisplay,
} from "@src/lib/musicbrainz";
import type { MbRecording } from "@src/lib/types";

describe("msToDisplay", () => {
  it("converts ms to mm:ss", () => {
    // 3 minutes 41 seconds = 221,000 ms
    expect(msToDisplay(221_000)).toBe("3:41");
  });

  it("zero-pads seconds", () => {
    // 1 minute 5 seconds = 65,000 ms
    expect(msToDisplay(65_000)).toBe("1:05");
  });

  it("handles zero", () => {
    expect(msToDisplay(0)).toBe("0:00");
  });

  it("handles sub-minute durations", () => {
    expect(msToDisplay(45_000)).toBe("0:45");
  });
});

describe("chunkArray", () => {
  it("splits into chunks of given size", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when array smaller than size", () => {
    expect(chunkArray([1, 2], 400)).toEqual([[1, 2]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunkArray([], 400)).toEqual([]);
  });

  it("handles chunk size of 400 correctly", () => {
    const arr = Array.from({ length: 450 }, (_, i) => i);
    const chunks = chunkArray(arr, 400);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(400);
    expect(chunks[1]).toHaveLength(50);
  });
});

describe("formatArtistCredits", () => {
  it("formats a single artist", () => {
    const credits: MbRecording["artist-credit"] = [
      { name: "Nujabes", artist: { name: "Nujabes" } },
    ];
    expect(formatArtistCredits(credits)).toBe("Nujabes");
  });

  it("joins multiple artists with joinphrase", () => {
    const credits: MbRecording["artist-credit"] = [
      { name: "Jay-Z", artist: { name: "Jay-Z" }, joinphrase: " & " },
      { name: "Kanye West", artist: { name: "Kanye West" } },
    ];
    expect(formatArtistCredits(credits)).toBe("Jay-Z & Kanye West");
  });

  it("returns empty string for undefined credits", () => {
    expect(formatArtistCredits(undefined)).toBe("");
  });

  it("returns empty string for empty credits", () => {
    expect(formatArtistCredits([])).toBe("");
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

const recording = (id: string): MbRecording => ({ id, title: `Recording ${id}` });

describe("fetchRecordingsByRecordingIds", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns empty map for empty input", async () => {
    const result = await fetchRecordingsByRecordingIds([]);
    expect(result.size).toBe(0);
  });

  it("maps rid: search results by recording id", async () => {
    const rec = recording("rec-1");
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ recordings: [rec] }),
    }));
    const result = await fetchRecordingsByRecordingIds(["rec-1"]);
    expect(result.get("rec-1")).toEqual(rec);
  });

  it("sends query with rid: prefix", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ recordings: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchRecordingsByRecordingIds(["id-a", "id-b"]);
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("query")).toContain("rid:id-a");
    expect(calledUrl.searchParams.get("query")).toContain("rid:id-b");
  });

  it("makes 2 requests for 101 ids (chunk boundary at 100)", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ recordings: [] }),
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchRecordingsByRecordingIds(ids);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchCollections", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends editor and inc=user-collections params", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ collections: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchCollections("mb-user", "token");
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("editor")).toBe("mb-user");
    expect(calledUrl.searchParams.get("inc")).toBe("user-collections");
  });

  it("sends Authorization header when token provided", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ collections: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchCollections("mb-user", "my-token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer my-token");
  });

  it("returns collections array", async () => {
    const collections = [{ id: "col-1", name: "My Collection", "entity-type": "recording" }];
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ collections }),
    }));
    await expect(fetchCollections("user", "tok")).resolves.toEqual(collections);
  });
});

describe("fetchCollectionRecordings", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("paginates when recording-count exceeds 100", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          "recording-count": 150,
          recordings: Array.from({ length: 100 }, (_, i) => ({ id: `r${i}` })),
        }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          "recording-count": 150,
          recordings: Array.from({ length: 50 }, (_, i) => ({ id: `r${i + 100}` })),
        }),
        text: () => Promise.resolve(""),
      });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchCollectionRecordings("col-1", "tok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(150);
  });

  it("sends Authorization header", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ "recording-count": 0, recordings: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchCollectionRecordings("col-1", "my-token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer my-token");
  });
});

describe("deleteRecordingsFromCollection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends DELETE request", async () => {
    const fetchMock = mockFetch({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await deleteRecordingsFromCollection("col-1", ["r1"], "tok");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("sends client param", async () => {
    const fetchMock = mockFetch({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await deleteRecordingsFromCollection("col-1", ["r1"], "tok");
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("client")).toBeTruthy();
  });

  it("chunks at 400 — 401 items makes 2 requests", async () => {
    const ids = Array.from({ length: 401 }, (_, i) => `r${i}`);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);
    await deleteRecordingsFromCollection("col-1", ids, "tok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 401, statusText: "Unauthorized" }));
    await expect(deleteRecordingsFromCollection("col-1", ["r1"], "tok")).rejects.toThrow("401");
  });
});

describe("addRecordingsToCollection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends PUT request", async () => {
    const fetchMock = mockFetch({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await addRecordingsToCollection("col-1", ["r1"], "tok");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
  });

  it("chunks at 400 — 401 items makes 2 requests", async () => {
    const ids = Array.from({ length: 401 }, (_, i) => `r${i}`);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);
    await addRecordingsToCollection("col-1", ids, "tok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 500, statusText: "Error" }));
    await expect(addRecordingsToCollection("col-1", ["r1"], "tok")).rejects.toThrow("500");
  });
});

describe("createCollection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends correct JSON body", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ id: "new-col-id" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await createCollection("My Collection", "tok", true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.name).toBe("My Collection");
    expect(body.entity_type).toBe("recording");
    expect(body.public).toBe(true);
  });

  it("returns id from response", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ id: "col-abc" }),
    }));
    await expect(createCollection("Col", "tok")).resolves.toBe("col-abc");
  });

  it("returns null on 404", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 404 }));
    await expect(createCollection("Col", "tok")).resolves.toBeNull();
  });

  it("returns null on 405", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: false, status: 405 }));
    await expect(createCollection("Col", "tok")).resolves.toBeNull();
  });

  it("returns null on TypeError (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed to fetch")));
    await expect(createCollection("Col", "tok")).resolves.toBeNull();
  });
});
