import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { UnresolvedCell } from "@src/pages/PlaylistsPage/components/playlist-viewer/UnresolvedCell";
import type { MbRecording } from "@src/lib/types";

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

const candidates: MbRecording[] = [
  {
    id: "rec-1",
    title: "Candidate One",
    "artist-credit": [{ name: "Artist A", artist: { name: "Artist A" } }],
  },
  {
    id: "rec-2",
    title: "Candidate Two",
    "artist-credit": [{ name: "Artist B", artist: { name: "Artist B" } }],
  },
];

describe("UnresolvedCell", () => {
  it("renders the ? trigger button", () => {
    render(<UnresolvedCell candidates={[]} onOverride={vi.fn()} />);
    expect(screen.getByRole("button", { name: /No MusicBrainz match/ })).toBeInTheDocument();
  });

  it("lists candidate titles in the popover", () => {
    render(<UnresolvedCell candidates={candidates} onOverride={vi.fn()} />);
    expect(screen.getByText("Candidate One")).toBeInTheDocument();
    expect(screen.getByText("Candidate Two")).toBeInTheDocument();
  });

  it("clicking a candidate calls onOverride with its id", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    render(<UnresolvedCell candidates={candidates} onOverride={onOverride} />);
    await user.click(screen.getByText("Candidate One"));
    expect(onOverride).toHaveBeenCalledWith("rec-1");
  });

  it("entering manual MBID and submitting calls onOverride", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    render(<UnresolvedCell candidates={[]} onOverride={onOverride} />);
    await user.type(screen.getByPlaceholderText(/xxxx/), "manual-mbid-5678");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onOverride).toHaveBeenCalledWith("manual-mbid-5678");
  });

  it("shows manual input even with no candidates", () => {
    render(<UnresolvedCell candidates={[]} onOverride={vi.fn()} />);
    expect(screen.getByPlaceholderText(/xxxx/)).toBeInTheDocument();
  });
});
