import { PlaylistsPage } from "@src/pages/PlaylistsPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    playlist: typeof search.playlist === "string" ? search.playlist : undefined,
    overrides:
      typeof search.overrides === "string" ? search.overrides : undefined,
  }),
  component: PlaylistsPage,
});
