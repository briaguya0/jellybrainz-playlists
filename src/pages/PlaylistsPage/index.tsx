import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getJellyfinConfig } from "../../lib/config";
import { fetchPlaylists } from "../../lib/jellyfin";
import type { JellyfinConfig } from "../../lib/types";
import { PlaylistSelection } from "./components/playlist-selection/PlaylistSelection";
import { PlaylistViewer } from "./components/playlist-viewer/PlaylistViewer";

export function PlaylistsPage() {
  const { playlist: selectedId } = useSearch({ from: "/" });
  const [jellyfinConfig, setJellyfinConfig] = useState<JellyfinConfig | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setJellyfinConfig(getJellyfinConfig());
    setHydrated(true);
  }, []);

  // Fetch playlists to look up the selected playlist name for PlaylistViewer.
  // React Query caches this — no extra network request beyond what PlaylistSelection already makes.
  const { data: playlists } = useQuery({
    queryKey: ["playlists", jellyfinConfig],
    queryFn: () => {
      if (!jellyfinConfig?.userId) throw new Error("No config");
      return fetchPlaylists(jellyfinConfig, jellyfinConfig.userId);
    },
    enabled: !!jellyfinConfig?.userId,
  });

  const selectedPlaylist = playlists?.find((p) => p.Id === selectedId);

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <PlaylistSelection
        cfg={jellyfinConfig}
        hydrated={hydrated}
        selectedId={selectedId}
        onConnect={setJellyfinConfig}
      />
      <PlaylistViewer
        cfg={jellyfinConfig}
        playlistId={selectedId}
        playlistName={selectedPlaylist?.Name}
      />
    </main>
  );
}
