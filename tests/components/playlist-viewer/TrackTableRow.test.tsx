import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { TrackTableRow } from "@src/pages/PlaylistsPage/components/playlist-viewer/TrackTableRow";
import type { JellyfinConfig, JellyfinTrack, TrackMatchState } from "@src/lib/types";

vi.mock("@src/pages/PlaylistsPage/components/playlist-viewer/ThumbnailTooltip", () => ({
  ThumbnailTooltip: () => <div data-testid="thumbnail-tooltip" />,
}));
vi.mock("@src/pages/PlaylistsPage/components/playlist-viewer/MbBadge", () => ({
  MbBadge: ({ kind }: { kind: string }) => <div data-testid={`mb-badge-${kind}`} />,
  MbBadgeEditContent: () => <div data-testid="mb-badge-edit-content" />,
}));
vi.mock("@src/pages/PlaylistsPage/components/playlist-viewer/RecordingInfo", () => ({
  RecordingInfo: ({ recording }: { recording: { title: string } }) => (
    <div data-testid="recording-info">{recording.title}</div>
  ),
}));
vi.mock("@src/pages/PlaylistsPage/components/playlist-viewer/UnresolvedCell", () => ({
  UnresolvedCell: () => <div data-testid="unresolved-cell" />,
  UnresolvedEditContent: () => <div data-testid="unresolved-edit-content" />,
}));

const cfg: JellyfinConfig = { url: "http://jelly.local", apiKey: "key", userId: "u1" };
const track: JellyfinTrack = { Id: "t1", Name: "Track One", Artists: ["Artist"] };
const recording = { id: "rec-1", title: "MB Title", "artist-credit": [] };

function renderRow(matchState: TrackMatchState) {
  return render(
    <table>
      <tbody>
        <TrackTableRow
          track={track}
          cfg={cfg}
          matchState={matchState}
          onSetOverride={vi.fn()}
          onClearOverride={vi.fn()}
        />
      </tbody>
    </table>,
  );
}

describe("TrackTableRow", () => {
  it("loading state: renders thumbnail tooltip, no recording info", () => {
    renderRow({ kind: "loading" });
    expect(screen.getByTestId("thumbnail-tooltip")).toBeInTheDocument();
    expect(screen.queryByTestId("recording-info")).not.toBeInTheDocument();
  });

  it("exact state: renders recording info, no MbBadge", () => {
    renderRow({ kind: "exact", recording });
    expect(screen.getByTestId("recording-info")).toBeInTheDocument();
    expect(screen.queryByTestId("mb-badge-partial-auto")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mb-badge-override")).not.toBeInTheDocument();
  });

  it("partial-auto state: renders MbBadge with kind=partial-auto and recording info", () => {
    renderRow({ kind: "partial-auto", recording });
    expect(screen.getByTestId("mb-badge-partial-auto")).toBeInTheDocument();
    expect(screen.getByTestId("recording-info")).toBeInTheDocument();
  });

  it("override state with recording: renders MbBadge with kind=override and recording info", () => {
    renderRow({ kind: "override", recording });
    expect(screen.getByTestId("mb-badge-override")).toBeInTheDocument();
    expect(screen.getByTestId("recording-info")).toBeInTheDocument();
  });

  it("unresolved state: renders UnresolvedCell", () => {
    renderRow({ kind: "unresolved", candidates: [] });
    expect(screen.getByTestId("unresolved-cell")).toBeInTheDocument();
  });
});
