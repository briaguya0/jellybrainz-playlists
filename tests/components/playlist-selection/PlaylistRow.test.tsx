import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistRow } from "@src/pages/PlaylistsPage/components/playlist-selection/PlaylistRow";
import type { JellyfinPlaylist } from "@src/lib/types";

const playlist: JellyfinPlaylist = { Id: "p1", Name: "Row Playlist", ChildCount: 3 };

describe("PlaylistRow", () => {
  it("renders playlist name", () => {
    render(
      <PlaylistRow playlist={playlist} selected={false} disabled={false} onClick={vi.fn()} />,
    );
    expect(screen.getByText("Row Playlist")).toBeInTheDocument();
  });

  it("renders track count", () => {
    render(
      <PlaylistRow playlist={playlist} selected={false} disabled={false} onClick={vi.fn()} />,
    );
    expect(screen.getByText("3 tracks")).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PlaylistRow playlist={playlist} selected={false} disabled={false} onClick={onClick} />,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies selected styling when selected=true", () => {
    render(
      <PlaylistRow playlist={playlist} selected={true} disabled={false} onClick={vi.fn()} />,
    );
    expect(screen.getByRole("button").className).toContain("border-[var(--accent)]");
  });

  it("applies disabled styling when disabled=true", () => {
    render(
      <PlaylistRow playlist={playlist} selected={false} disabled={true} onClick={vi.fn()} />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.style.filter).toContain("grayscale");
  });
});
