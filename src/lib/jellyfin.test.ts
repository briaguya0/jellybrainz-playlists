import { describe, expect, it } from "vitest";
import { extractMbRecordingId, ticksToDisplay } from "./jellyfin";
import type { JellyfinTrack } from "./types";

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
