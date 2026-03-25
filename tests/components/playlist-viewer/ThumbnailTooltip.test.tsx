import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ThumbnailTooltip } from "@src/pages/PlaylistsPage/components/playlist-viewer/ThumbnailTooltip";
import type { JellyfinConfig, JellyfinTrack } from "@src/lib/types";

const { mockThumbnailUrl } = vi.hoisted(() => ({
  mockThumbnailUrl: vi.fn().mockReturnValue("http://jelly.local/thumb.jpg"),
}));

vi.mock("@src/lib/jellyfin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/jellyfin")>();
  return { ...actual, thumbnailUrl: mockThumbnailUrl };
});

// Always render both trigger and content
vi.mock("@src/components/Popover", () => ({
  Popover: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: (close: () => void) => React.ReactNode;
  }) => (
    <div>
      {children}
      <div data-testid="popover-content">{content(() => {})}</div>
    </div>
  ),
}));

const cfg: JellyfinConfig = { url: "http://jelly.local", apiKey: "key", userId: "u1" };
const track: JellyfinTrack = {
  Id: "t1",
  Name: "My Track",
  Artists: ["Artist A", "Artist B"],
  RunTimeTicks: 2160000000, // 60s in ticks
};

describe("ThumbnailTooltip", () => {
  it("renders trigger button with track name as aria-label", () => {
    render(<ThumbnailTooltip track={track} cfg={cfg} />);
    expect(screen.getByRole("button", { name: "My Track" })).toBeInTheDocument();
  });

  it("shows track name in popover content", () => {
    render(<ThumbnailTooltip track={track} cfg={cfg} />);
    const content = screen.getByTestId("popover-content");
    expect(content).toHaveTextContent("My Track");
  });

  it("shows artist in popover content", () => {
    render(<ThumbnailTooltip track={track} cfg={cfg} />);
    const content = screen.getByTestId("popover-content");
    expect(content).toHaveTextContent("Artist A, Artist B");
  });
});
