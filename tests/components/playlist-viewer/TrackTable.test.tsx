import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { TrackTable } from "@src/pages/PlaylistsPage/components/playlist-viewer/TrackTable";
import type { JellyfinConfig, JellyfinTrack } from "@src/lib/types";

vi.mock(
  "@src/pages/PlaylistsPage/components/playlist-viewer/TrackTableRow",
  () => ({
    TrackTableRow: ({ track }: { track: JellyfinTrack }) => (
      <tr data-testid="track-row">
        <td>{track.Name}</td>
      </tr>
    ),
  }),
);

const cfg: JellyfinConfig = { url: "http://jelly.local", apiKey: "key", userId: "u1" };
const tracks: JellyfinTrack[] = [
  { Id: "t1", Name: "Track One" },
  { Id: "t2", Name: "Track Two" },
];

describe("TrackTable", () => {
  it("shows skeleton rows when isPending=true", () => {
    const { container } = render(
      <TrackTable
        isPending={true}
        tracks={undefined}
        cfg={cfg}
        matchStates={new Map()}
        onSetOverride={vi.fn()}
        onClearOverride={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("track-row")).not.toBeInTheDocument();
    // 5 skeleton rows via animate-pulse
    expect(container.querySelectorAll("tr.animate-pulse")).toHaveLength(5);
  });

  it("renders one row per track when not pending", () => {
    render(
      <TrackTable
        isPending={false}
        tracks={tracks}
        cfg={cfg}
        matchStates={new Map()}
        onSetOverride={vi.fn()}
        onClearOverride={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId("track-row")).toHaveLength(2);
    expect(screen.getByText("Track One")).toBeInTheDocument();
    expect(screen.getByText("Track Two")).toBeInTheDocument();
  });

  it("renders Jellyfin and MusicBrainz column header images", () => {
    const { container } = render(
      <TrackTable
        isPending={false}
        tracks={[]}
        cfg={cfg}
        matchStates={new Map()}
        onSetOverride={vi.fn()}
        onClearOverride={vi.fn()}
      />,
    );
    const headerImgs = container.querySelectorAll("thead img");
    expect(headerImgs).toHaveLength(2);
    expect(headerImgs[0]).toHaveAttribute("alt", "Jellyfin");
    expect(headerImgs[1]).toHaveAttribute("alt", "MusicBrainz");
  });
});
