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
}

export interface JellyfinTrack {
	Id: string;
	Name: string;
	Artists?: string[];
	Album?: string;
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
	"artist-credit"?: MbArtistCredit[];
	releases?: { id: string }[];
}
