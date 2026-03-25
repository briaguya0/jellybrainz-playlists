import { describe, expect, it } from "vitest";
import { chunkArray, formatArtistCredits, msToDisplay } from "@src/lib/musicbrainz";
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
