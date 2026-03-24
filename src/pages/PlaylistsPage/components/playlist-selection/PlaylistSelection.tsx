import { useJellyfin } from "@src/contexts/JellyfinContext";
import { fetchPlaylists } from "@src/lib/jellyfin";
import type { JellyfinConfig, JellyfinPlaylist } from "@src/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { ConnectForm } from "./ConnectForm";
import { PlaylistCard } from "./PlaylistCard";
import { PlaylistRow } from "./PlaylistRow";
import { SkeletonCard } from "./SkeletonCard";

const PAGE_SIZE = 12;

export function PlaylistSelection({
  selectedId,
}: {
  selectedId: string | undefined;
}) {
  const { cfg, hydrated } = useJellyfin();
  const navigate = useNavigate({ from: "/" });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);

  const {
    data: playlists,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["playlists", cfg],
    queryFn: () => {
      if (!cfg?.userId) throw new Error("No config");
      return fetchPlaylists(cfg, cfg.userId);
    },
    enabled: !!cfg?.userId,
  });

  function selectPlaylist(playlist: JellyfinPlaylist) {
    navigate({
      search: (prev) => ({ ...prev, playlist: playlist.Id }),
      replace: true,
    });
  }

  const showConnect = hydrated && !cfg;
  const showSkeletons = !hydrated || (!!cfg && isPending);

  const sortedPlaylists = playlists?.slice().sort((a, b) => {
    const aEmpty = (a.ChildCount ?? 0) === 0;
    const bEmpty = (b.ChildCount ?? 0) === 0;
    return Number(aEmpty) - Number(bEmpty);
  });
  const totalPages = Math.ceil((sortedPlaylists?.length ?? 0) / PAGE_SIZE);
  const visiblePlaylists = sortedPlaylists?.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  if (showConnect) {
    return <ConnectForm />;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-app-text flex items-center gap-2">
          <img
            src="/jellyfin-icon.svg"
            width={22}
            height={22}
            alt=""
            aria-hidden="true"
          />
          Playlists
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            className={`p-2 rounded-lg border ${
              viewMode === "grid"
                ? "island-shell border-[var(--accent)] text-accent-text"
                : "border-transparent text-app-muted hover:text-app-text"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-label="List view"
            className={`p-2 rounded-lg border ${
              viewMode === "list"
                ? "island-shell border-[var(--accent)] text-accent-text"
                : "border-transparent text-app-muted hover:text-app-text"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {error instanceof Error ? error.message : "Failed to load playlists"}
        </p>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {showSkeletons
            ? Array.from({ length: 6 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                <SkeletonCard key={i} />
              ))
            : visiblePlaylists?.map((pl) => (
                <PlaylistCard
                  key={pl.Id}
                  playlist={pl}
                  cfg={cfg as JellyfinConfig}
                  selected={pl.Id === selectedId}
                  disabled={(pl.ChildCount ?? 0) === 0}
                  onClick={() => selectPlaylist(pl)}
                />
              ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {showSkeletons
            ? Array.from({ length: 6 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                <SkeletonCard key={i} />
              ))
            : visiblePlaylists?.map((pl) => (
                <PlaylistRow
                  key={pl.Id}
                  playlist={pl}
                  selected={pl.Id === selectedId}
                  disabled={(pl.ChildCount ?? 0) === 0}
                  onClick={() => selectPlaylist(pl)}
                />
              ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="island-shell rounded-lg border border-stroke px-3 py-1.5 text-sm text-app-muted enabled:hover:text-app-text disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-xs text-app-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="island-shell rounded-lg border border-stroke px-3 py-1.5 text-sm text-app-muted enabled:hover:text-app-text disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
