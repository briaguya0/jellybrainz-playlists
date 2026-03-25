import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistCard } from "@src/pages/PlaylistsPage/components/playlist-selection/PlaylistCard";
import type { JellyfinConfig, JellyfinPlaylist } from "@src/lib/types";

const { mockPlaylistThumbnailUrl } = vi.hoisted(() => {
  const mockPlaylistThumbnailUrl = vi.fn();
  return { mockPlaylistThumbnailUrl };
});

vi.mock("@src/lib/jellyfin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/jellyfin")>();
  return { ...actual, playlistThumbnailUrl: mockPlaylistThumbnailUrl };
});

const cfg: JellyfinConfig = { url: "http://jelly.local", apiKey: "key", userId: "u1" };
const playlist: JellyfinPlaylist = { Id: "p1", Name: "My Playlist", ChildCount: 5 };

describe("PlaylistCard", () => {
  it("renders playlist name and track count", () => {
    mockPlaylistThumbnailUrl.mockReturnValue(null);
    render(
      <PlaylistCard playlist={playlist} cfg={cfg} selected={false} disabled={false} onClick={vi.fn()} />,
    );
    expect(screen.getByText("My Playlist")).toBeInTheDocument();
    expect(screen.getByText("5 tracks")).toBeInTheDocument();
  });

  it("renders img when imageUrl is returned", () => {
    mockPlaylistThumbnailUrl.mockReturnValue("http://jelly.local/thumb.jpg");
    const { container } = render(
      <PlaylistCard playlist={playlist} cfg={cfg} selected={false} disabled={false} onClick={vi.fn()} />,
    );
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("renders placeholder div when no imageUrl", () => {
    mockPlaylistThumbnailUrl.mockReturnValue(null);
    const { container } = render(
      <PlaylistCard playlist={playlist} cfg={cfg} selected={false} disabled={false} onClick={vi.fn()} />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("div.w-12.h-12")).toBeInTheDocument();
  });

  it("applies disabled styling when disabled=true", () => {
    mockPlaylistThumbnailUrl.mockReturnValue(null);
    render(
      <PlaylistCard playlist={playlist} cfg={cfg} selected={false} disabled={true} onClick={vi.fn()} />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.style.filter).toContain("grayscale");
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    mockPlaylistThumbnailUrl.mockReturnValue(null);
    const onClick = vi.fn();
    render(
      <PlaylistCard playlist={playlist} cfg={cfg} selected={false} disabled={false} onClick={onClick} />,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
