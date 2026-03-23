import type { JellyfinConfig, JellyfinPlaylist, JellyfinTrack } from "./types";

function headers(apiKey: string): Record<string, string> {
	return { "X-MediaBrowser-Token": apiKey };
}

function base(url: string): string {
	return url.replace(/\/$/, "");
}

export async function resolveUserId(cfg: JellyfinConfig): Promise<string> {
	if (cfg.userId) return cfg.userId;
	const resp = await fetch(`${base(cfg.url)}/Users`, {
		headers: headers(cfg.apiKey),
	});
	if (!resp.ok) {
		throw new Error(
			`Jellyfin /Users failed: ${resp.status} ${resp.statusText}`,
		);
	}
	const users: { Id: string }[] = await resp.json();
	if (!users.length) throw new Error("No users found in Jellyfin");
	return users[0].Id;
}

export async function fetchPlaylists(
	cfg: JellyfinConfig,
	userId: string,
): Promise<JellyfinPlaylist[]> {
	const url = new URL(`${base(cfg.url)}/Users/${userId}/Items`);
	url.searchParams.set("IncludeItemTypes", "Playlist");
	url.searchParams.set("Recursive", "true");
	const resp = await fetch(url.toString(), { headers: headers(cfg.apiKey) });
	if (!resp.ok) {
		throw new Error(
			`Failed to fetch playlists: ${resp.status} ${resp.statusText}`,
		);
	}
	const data: { Items: JellyfinPlaylist[] } = await resp.json();
	return data.Items ?? [];
}

export async function fetchPlaylistTracks(
	cfg: JellyfinConfig,
	userId: string,
	playlistId: string,
): Promise<JellyfinTrack[]> {
	const url = new URL(`${base(cfg.url)}/Playlists/${playlistId}/Items`);
	url.searchParams.set("UserId", userId);
	url.searchParams.set("Fields", "ProviderIds,RunTimeTicks");
	const resp = await fetch(url.toString(), { headers: headers(cfg.apiKey) });
	if (!resp.ok) {
		throw new Error(
			`Failed to fetch playlist tracks: ${resp.status} ${resp.statusText}`,
		);
	}
	const data: { Items: JellyfinTrack[] } = await resp.json();
	return data.Items ?? [];
}

export function extractMbRecordingId(track: JellyfinTrack): string | undefined {
	return (
		track.ProviderIds?.MusicBrainzTrack ??
		track.ProviderIds?.MusicBrainzRecording
	);
}

/** Convert Jellyfin RunTimeTicks (100ns units) to mm:ss string */
export function ticksToDisplay(ticks: number): string {
	const totalSeconds = Math.floor(ticks / 10_000_000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function thumbnailUrl(cfg: JellyfinConfig, itemId: string): string {
	return `${base(cfg.url)}/Items/${itemId}/Images/Primary`;
}
