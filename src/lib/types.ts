export interface JellyfinConfig {
  url: string;
  apiKey: string;
  userId?: string;
}

export interface MbAuth {
  accessToken: string;
  username: string;
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
    media?: Array<{ track?: Array<{ id: string }> }>;
  }>;
}
