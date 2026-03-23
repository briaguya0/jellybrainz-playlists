import type { MbCollection, MbRecording } from "./types";

const MB_HOST =
	(import.meta.env["VITE_MB_BASE_URL"] as string | undefined) ??
	"https://musicbrainz.org";
export const MB_BASE = `${MB_HOST}/ws/2`;
const MB_CLIENT = "jellybrainz-playlists-0.1.0";
const MB_BATCH = 400;
const USER_AGENT =
	"jellybrainz-playlists/0.1.0 ( https://github.com/briaguya/jellybrainz-playlists )";

function mbHeaders(accessToken?: string): Record<string, string> {
	const h: Record<string, string> = { "User-Agent": USER_AGENT };
	if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
	return h;
}

export async function fetchRecording(mbid: string): Promise<MbRecording> {
	const url = new URL(`${MB_BASE}/recording/${mbid}`);
	url.searchParams.set("inc", "artist-credits+releases");
	url.searchParams.set("fmt", "json");
	const resp = await fetch(url.toString(), { headers: mbHeaders() });
	if (!resp.ok) {
		throw new Error(
			`MB recording lookup failed: ${resp.status} ${resp.statusText}`,
		);
	}
	return resp.json() as Promise<MbRecording>;
}

export async function fetchCollections(
	username: string,
	accessToken: string,
): Promise<MbCollection[]> {
	const url = new URL(`${MB_BASE}/collection`);
	url.searchParams.set("editor", username);
	url.searchParams.set("inc", "user-collections");
	url.searchParams.set("fmt", "json");
	const resp = await fetch(url.toString(), { headers: mbHeaders(accessToken) });
	if (!resp.ok) {
		throw new Error(
			`Failed to fetch MB collections: ${resp.status} ${resp.statusText}`,
		);
	}
	const data: { collections: MbCollection[] } = await resp.json();
	return data.collections ?? [];
}

export async function createCollection(
	name: string,
	accessToken: string,
): Promise<string | null> {
	const url = new URL(`${MB_BASE}/collection`);
	url.searchParams.set("client", MB_CLIENT);
	url.searchParams.set("fmt", "json");
	try {
		const resp = await fetch(url.toString(), {
			method: "POST",
			headers: {
				...mbHeaders(accessToken),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name, entity_type: "recording" }),
		});
		if (resp.status === 404 || resp.status === 405) return null;
		if (!resp.ok) {
			throw new Error(
				`Failed to create collection: ${resp.status} ${resp.statusText}`,
			);
		}
		const data: { id?: string; mbid?: string } = await resp.json();
		return data.id ?? data.mbid ?? null;
	} catch (err) {
		if (err instanceof TypeError) return null; // network error on unsupported endpoint
		throw err;
	}
}

export async function addRecordingsToCollection(
	collectionMbid: string,
	recordingMbids: string[],
	accessToken: string,
): Promise<void> {
	const chunks = chunkArray(recordingMbids, MB_BATCH);
	for (const chunk of chunks) {
		const joined = chunk.join(";");
		const url = new URL(
			`${MB_BASE}/collection/${collectionMbid}/recordings/${joined}`,
		);
		url.searchParams.set("client", MB_CLIENT);
		const resp = await fetch(url.toString(), {
			method: "PUT",
			headers: mbHeaders(accessToken),
		});
		if (!resp.ok) {
			throw new Error(
				`Failed to add recordings: ${resp.status} ${resp.statusText}`,
			);
		}
	}
}

/** Convert MB recording length (ms) to mm:ss string */
export function msToDisplay(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Format artist credits into a display string */
export function formatArtistCredits(
	credits: MbRecording["artist-credit"],
): string {
	if (!credits?.length) return "";
	return credits.map((c) => c.name + (c.joinphrase ?? "")).join("");
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}
