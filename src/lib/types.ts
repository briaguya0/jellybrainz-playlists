export interface JellyfinConfig {
  url: string;
  apiKey: string;
  userId?: string;
}

export interface MbAuth {
  accessToken: string;
  username: string;
}

export interface LbAuth {
  token: string;
  username: string;
}

export interface LbPlaylist {
  identifier: string;
  title: string;
  "track_count"?: number;
}

export interface JellyfinPlaylist {
  Id: string;
  Name: string;
  ChildCount?: number;
  ImageTags?: Record<string, string>;
}

export interface JellyfinTrack {
  Id: string;
  Name: string;
  Artists?: string[];
  Album?: string;
  AlbumId?: string;
  AlbumPrimaryImageTag?: string;
  RunTimeTicks?: number;
  ProviderIds?: Record<string, string>;
}

export interface MbCollection {
  id: string;
  name: string;
  "entity-type": string;
  "recording-count"?: number;
}

export interface MbArtistCredit {
  name: string;
  artist: { name: string };
  joinphrase?: string;
}

export interface MbRecording {
  id: string;
  title: string;
  length?: number;
  score?: number;
  "artist-credit"?: MbArtistCredit[];
  releases?: Array<{
    id: string;
    title?: string;
    date?: string;
    media?: Array<{ track?: Array<{ id: string }> }>;
  }>;
}

export type OverrideSource =
  | "confirmed-album"
  | "confirmed-artist"
  | "manual"
  | "selected";

export type OverrideEntry = { mbid: string; source: OverrideSource };

export type TrackMatchState =
  | { kind: "loading" }
  | { kind: "exact"; recording: MbRecording }
  | { kind: "partial-auto"; recording: MbRecording; matchSource: "album" | "artist" }
  | { kind: "override"; recording: MbRecording | undefined; source: OverrideSource; candidates?: MbRecording[] }
  | { kind: "unresolved"; candidates: MbRecording[] };
