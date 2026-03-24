import pkg from "@root/package.json";
import type { MbCollection, MbRecording } from "./types";

const MB_HOST =
  (import.meta.env.VITE_MB_BASE_URL as string | undefined) ??
  "https://musicbrainz.org";
export const MB_BASE = `${MB_HOST}/ws/2`;
const MB_CLIENT = `jellybrainz-playlists-${pkg.version}`;
const MB_BATCH = 400;
function mbHeaders(accessToken?: string): Record<string, string> {
  if (accessToken) return { Authorization: `Bearer ${accessToken}` };
  return {};
}

export async function fetchRecordingsByTrackIds(
  trackMbids: string[],
): Promise<Map<string, MbRecording>> {
  const result = new Map<string, MbRecording>();
  if (trackMbids.length === 0) return result;

  const trackMbidSet = new Set(trackMbids);
  const chunks = chunkArray(trackMbids, 100);

  for (const chunk of chunks) {
    const query = chunk.map((id) => `tid:${id}`).join(" OR ");
    const url = new URL(`${MB_BASE}/recording/`);
    url.searchParams.set("query", query);
    url.searchParams.set("limit", String(chunk.length));
    url.searchParams.set("fmt", "json");
    const resp = await fetch(url.toString(), { headers: mbHeaders() });
    if (!resp.ok) {
      throw new Error(
        `MB recording lookup failed: ${resp.status} ${resp.statusText}`,
      );
    }
    const data: { recordings: MbRecording[] } = await resp.json();
    for (const recording of data.recordings ?? []) {
      for (const release of recording.releases ?? []) {
        for (const medium of release.media ?? []) {
          for (const track of medium.track ?? []) {
            if (trackMbidSet.has(track.id)) {
              result.set(track.id, recording);
            }
          }
        }
      }
    }
  }

  return result;
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
  isPublic = false,
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
      body: JSON.stringify({ name, entity_type: "recording", public: isPublic }),
    });
    if (resp.status === 404 || resp.status === 405) return null;
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Failed to create collection: ${resp.status} ${body}`);
    }
    const data: { id?: string; mbid?: string } = await resp.json();
    return data.id ?? data.mbid ?? null;
  } catch (err) {
    if (err instanceof TypeError) return null; // network error on unsupported endpoint
    throw err;
  }
}

export async function fetchCollectionRecordings(
  collectionMbid: string,
  accessToken: string,
): Promise<string[]> {
  const mbids: string[] = [];
  const limit = 100;
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = new URL(`${MB_BASE}/recording`);
    url.searchParams.set("collection", collectionMbid);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("fmt", "json");
    const resp = await fetch(url.toString(), {
      headers: mbHeaders(accessToken),
    });
    if (!resp.ok) {
      throw new Error(
        `Failed to fetch collection recordings: ${resp.status} ${resp.statusText}`,
      );
    }
    const data: { "recording-count": number; recordings: { id: string }[] } =
      await resp.json();
    total = data["recording-count"];
    for (const r of data.recordings ?? []) mbids.push(r.id);
    offset += limit;
  }

  return mbids;
}

export async function deleteRecordingsFromCollection(
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
    url.searchParams.set("fmt", "json");
    const resp = await fetch(url.toString(), {
      method: "DELETE",
      headers: mbHeaders(accessToken),
    });
    if (!resp.ok) {
      throw new Error(
        `Failed to delete recordings: ${resp.status} ${resp.statusText}`,
      );
    }
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

export async function searchRecordingsByArtist(
  artistMbid: string,
  title: string,
  limit = 5,
): Promise<MbRecording[]> {
  const escapedTitle = title.replace(/"/g, '\\"');
  const url = new URL(`${MB_BASE}/recording/`);
  url.searchParams.set(
    "query",
    `arid:${artistMbid} AND recording:"${escapedTitle}"`,
  );
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fmt", "json");
  const resp = await fetch(url.toString(), { headers: mbHeaders() });
  if (!resp.ok) {
    throw new Error(
      `MB recording search failed: ${resp.status} ${resp.statusText}`,
    );
  }
  const data: { recordings: MbRecording[] } = await resp.json();
  return data.recordings ?? [];
}

export async function fetchRecordingsByRecordingIds(
  recordingMbids: string[],
): Promise<Map<string, MbRecording>> {
  const result = new Map<string, MbRecording>();
  if (recordingMbids.length === 0) return result;
  const chunks = chunkArray(recordingMbids, 100);
  for (const chunk of chunks) {
    const query = chunk.map((id) => `rid:${id}`).join(" OR ");
    const url = new URL(`${MB_BASE}/recording/`);
    url.searchParams.set("query", query);
    url.searchParams.set("limit", String(chunk.length));
    url.searchParams.set("fmt", "json");
    const resp = await fetch(url.toString(), { headers: mbHeaders() });
    if (!resp.ok) {
      throw new Error(
        `MB recording lookup failed: ${resp.status} ${resp.statusText}`,
      );
    }
    const data: { recordings: MbRecording[] } = await resp.json();
    for (const rec of data.recordings ?? []) {
      result.set(rec.id, rec);
    }
  }
  return result;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
