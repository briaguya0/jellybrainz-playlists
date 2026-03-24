import type { JellyfinPlaylist } from "@src/lib/types";

export function PlaylistRow({
  playlist,
  selected,
  disabled,
  onClick,
}: {
  playlist: JellyfinPlaylist;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
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
      className={`glass-card rounded-lg border px-4 py-3 text-left w-full rise-in flex items-center gap-4 cursor-pointer ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
          : "border-stroke"
      }`}
    >
      <span className="font-semibold text-app-text flex-1 truncate">
        {playlist.Name}
      </span>
      {playlist.ChildCount != null && (
        <span className="text-xs text-app-muted shrink-0">
          {playlist.ChildCount} tracks
        </span>
      )}
    </button>
  );
}
