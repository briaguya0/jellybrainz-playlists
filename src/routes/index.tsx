import { createFileRoute } from "@tanstack/react-router";
import { PlaylistsPage } from "../pages/PlaylistsPage";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    playlist: typeof search.playlist === "string" ? search.playlist : undefined,
    overrides:
      typeof search.overrides === "string" ? search.overrides : undefined,
  }),
  component: PlaylistsPage,
});
