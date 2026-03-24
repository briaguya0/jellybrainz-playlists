import type { LbPlaylist } from "./types";

const LB_BASE = "https://api.listenbrainz.org";

function lbHeaders(token: string): Record<string, string> {
  return { Authorization: `Token ${token}`, "Content-Type": "application/json" };
}

export async function fetchLbUsername(token: string): Promise<string> {
  const resp = await fetch(`${LB_BASE}/1/validate-token`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Invalid token: ${body}`);
  }
  const data: { user_name: string; valid: boolean } = await resp.json();
  if (!data.valid) throw new Error("Token is not valid");
  return data.user_name;
}

export async function fetchLbPlaylists(username: string, token: string): Promise<LbPlaylist[]> {
  const resp = await fetch(
    `${LB_BASE}/1/user/${encodeURIComponent(username)}/playlists?count=100&include_private=true`,
    { headers: { Authorization: `Token ${token}` } },
  );
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to fetch playlists: ${body}`);
  }
  const data: { playlists: Array<{ playlist: LbPlaylist }> } = await resp.json();
  return data.playlists.map((p) => p.playlist);
}

export async function fetchLbPlaylistTracks(playlistMbid: string, token: string): Promise<string[]> {
  const resp = await fetch(`${LB_BASE}/1/playlist/${playlistMbid}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to fetch playlist: ${body}`);
  }
  const data: {
    playlist: { track: Array<{ identifier: string[] }> };
  } = await resp.json();
  return data.playlist.track.flatMap((t) =>
    t.identifier
      .filter((id) => id.includes("musicbrainz.org/recording/"))
      .map((id) => id.split("/").pop() ?? "")
      .filter(Boolean),
  );
}

export async function createLbPlaylist(
  title: string,
  mbids: string[],
  token: string,
  isPublic: boolean,
): Promise<string> {
  const resp = await fetch(`${LB_BASE}/1/playlist/create`, {
    method: "POST",
    headers: lbHeaders(token),
    body: JSON.stringify({
      playlist: {
        title,
        public: isPublic,
        extension: {
          "https://musicbrainz.org/doc/jspf#playlist": {
            public: isPublic,
          },
        },
        track: mbids.map((mbid) => ({
          identifier: [`https://musicbrainz.org/recording/${mbid}`],
        })),
      },
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to create playlist: ${body}`);
  }
  const data: { playlist_mbid: string } = await resp.json();
  return data.playlist_mbid;
}

export async function replaceLbPlaylistTracks(
  playlistMbid: string,
  mbids: string[],
  token: string,
): Promise<void> {
  // Delete all existing tracks then add new ones
  const existing = await fetchLbPlaylistTracks(playlistMbid, token);

  if (existing.length > 0) {
    const delResp = await fetch(`${LB_BASE}/1/playlist/${playlistMbid}/item/delete`, {
      method: "POST",
      headers: lbHeaders(token),
      body: JSON.stringify({ index: 0, count: existing.length }),
    });
    if (!delResp.ok) {
      const body = await delResp.text();
      throw new Error(`Failed to delete tracks: ${body}`);
    }
  }

  if (mbids.length > 0) {
    const addResp = await fetch(`${LB_BASE}/1/playlist/${playlistMbid}/item/add/0`, {
      method: "POST",
      headers: lbHeaders(token),
      body: JSON.stringify({
        playlist: {
          track: mbids.map((mbid) => ({
            identifier: [`https://musicbrainz.org/recording/${mbid}`],
          })),
        },
      }),
    });
    if (!addResp.ok) {
      const body = await addResp.text();
      throw new Error(`Failed to add tracks: ${body}`);
    }
  }
}

export async function appendLbPlaylistTracks(
  playlistMbid: string,
  mbids: string[],
  token: string,
): Promise<void> {
  const resp = await fetch(`${LB_BASE}/1/playlist/${playlistMbid}/item/add`, {
    method: "POST",
    headers: lbHeaders(token),
    body: JSON.stringify({
      playlist: {
        track: mbids.map((mbid) => ({
          identifier: [`https://musicbrainz.org/recording/${mbid}`],
        })),
      },
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to append tracks: ${body}`);
  }
}
