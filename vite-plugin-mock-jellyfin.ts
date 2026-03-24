/**
 * Vite dev-only plugin that adds mock Jellyfin API endpoints.
 * Set Jellyfin URL to http://localhost:3000 to use it.
 */
import type { Plugin } from "vite";

const MOCK_USER_ID = "mock-dev-user";

const MOCK_PLAYLISTS = [
  {
    Id: "mock-playlist-dev",
    Name: "⚙ Dev: Match Scenarios",
    ChildCount: 5,
    ImageTags: { Primary: "mock-tag" },
  },
  { Id: "mock-playlist-empty", Name: "Empty Playlist", ChildCount: 0 },
];

const MOCK_TRACKS = [
  {
    // Exact match — has MusicBrainzRecording MBID
    Id: "dev-exact",
    Name: "Breakbeat Forest (OC ReMix)",
    Artists: ["Mazedude"],
    Album: "Test Album 1",
    AlbumId: "dev-album-1",
    AlbumPrimaryImageTag: "mock-tag",
    RunTimeTicks: 2174000000,
    ProviderIds: {
      MusicBrainzRecording: "63cffd29-87fc-4626-a498-e869772fd26c",
    },
  },
  {
    // Partial-auto — artist MBID only; title search returns single result
    Id: "dev-partial-auto",
    Name: "Breakbeat Forest (OC ReMix)",
    Artists: ["Mazedude"],
    Album: "Test Album 2",
    AlbumId: "dev-album-2",
    AlbumPrimaryImageTag: "mock-tag",
    RunTimeTicks: 2174000000,
    ProviderIds: {
      MusicBrainzArtist: "98ed5c6d-947f-45b6-9da0-fd537482dec9",
    },
  },
  {
    // Unresolved with candidates — artist has many recordings with this title
    Id: "dev-multiple-candidates",
    Name: "Yesterday",
    Artists: ["The Beatles"],
    Album: "Help!",
    AlbumId: "dev-album-3",
    AlbumPrimaryImageTag: "mock-tag",
    RunTimeTicks: 1250000000,
    ProviderIds: {
      MusicBrainzArtist: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
    },
  },
  {
    // Unresolved, no candidates — artist MBID present but title matches nothing
    Id: "dev-no-candidates",
    Name: "This Song Does Not Exist XYZ123",
    Artists: ["Mazedude"],
    Album: "Test Album 3",
    AlbumId: "dev-album-4",
    AlbumPrimaryImageTag: "mock-tag",
    RunTimeTicks: 1800000000,
    ProviderIds: {
      MusicBrainzArtist: "98ed5c6d-947f-45b6-9da0-fd537482dec9",
    },
  },
  {
    // Unresolved, no IDs — nothing to search on
    Id: "dev-no-ids",
    Name: "Track With No IDs",
    Artists: ["Unknown Artist"],
    Album: "Test Album 4",
    AlbumId: "dev-album-5",
    AlbumPrimaryImageTag: "mock-tag",
    RunTimeTicks: 1500000000,
    ProviderIds: {},
  },
];

export function mockJellyfinPlugin(): Plugin {
  return {
    name: "mock-jellyfin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";

        function json(data: unknown) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify(data));
        }

        // GET /Users
        if (req.method === "GET" && url === "/Users") {
          return json([{ Id: MOCK_USER_ID, Name: "Dev User" }]);
        }

        // GET /Users/:id/Items (playlists)
        const playlistsMatch = url.match(
          /^\/Users\/[^/]+\/Items(\?.*)?$/,
        );
        if (req.method === "GET" && playlistsMatch) {
          const qs = new URLSearchParams(playlistsMatch[1]?.slice(1) ?? "");
          if (qs.get("IncludeItemTypes") === "Playlist") {
            return json({ Items: MOCK_PLAYLISTS });
          }
        }

        // GET /Playlists/:id/Items (tracks)
        const tracksMatch = url.match(/^\/Playlists\/([^/?]+)\/Items/);
        if (req.method === "GET" && tracksMatch) {
          const playlistId = tracksMatch[1];
          if (playlistId === "mock-playlist-dev") {
            return json({ Items: MOCK_TRACKS });
          }
          return json({ Items: [] });
        }

        // GET /Items/:id/Images/Primary (thumbnails) — redirect to local mock art
        const imageMatch = url.match(/^\/Items\/([^/?]+)\/Images\/Primary/);
        if (req.method === "GET" && imageMatch) {
          const itemId = imageMatch[1];
          const art: Record<string, string> = {
            "mock-playlist-dev": "new-york-street.jpg",
            "dev-album-1": "water-lilies.jpg",
            "dev-album-2": "flower-clouds.jpg",
            "dev-album-3": "composition-no-1-gray-red.jpg",
            "dev-album-4": "improvisation-no-30-cannons.jpg",
            "dev-album-5": "movement.jpg",
          };
          const file = art[itemId] ?? "water-lilies.jpg";
          res.statusCode = 302;
          res.setHeader("Location", `/mock-art/${file}`);
          return res.end();
        }

        next();
      });
    },
  };
}
