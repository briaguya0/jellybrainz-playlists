import { playlistThumbnailUrl } from "@src/lib/jellyfin";
import type { JellyfinConfig, JellyfinPlaylist } from "@src/lib/types";

export function PlaylistCard({
  playlist,
  cfg,
  selected,
  disabled,
  onClick,
}: {
  playlist: JellyfinPlaylist;
  cfg: JellyfinConfig;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const imgUrl = playlistThumbnailUrl(cfg, playlist);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={
        disabled
          ? { filter: "grayscale(1) opacity(0.45)", cursor: "not-allowed" }
          : undefined
      }
      className={`island-shell feature-card rounded-xl border p-4 text-left w-full rise-in flex items-center gap-3 cursor-pointer ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
          : "border-[var(--stroke)]"
      }`}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt=""
          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[var(--stroke)]"
          loading="lazy"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg shrink-0 bg-[var(--stroke)]" />
      )}
      <div className="min-w-0">
        <p className="font-semibold text-[var(--text)] truncate">
          {playlist.Name}
        </p>
        {playlist.ChildCount != null && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {playlist.ChildCount} tracks
          </p>
        )}
      </div>
    </button>
  );
}
