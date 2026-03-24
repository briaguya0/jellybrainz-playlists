import { useSearch } from "@tanstack/react-router";
import { PlaylistSelection } from "./components/playlist-selection/PlaylistSelection";
import { PlaylistViewer } from "./components/playlist-viewer/PlaylistViewer";

export function PlaylistsPage() {
  const { playlist: selectedId } = useSearch({ from: "/" });

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <PlaylistSelection selectedId={selectedId} />
      <PlaylistViewer playlistId={selectedId} />
    </main>
  );
}
