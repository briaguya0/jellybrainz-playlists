import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  UnresolvedCell,
  UnresolvedCandidates,
} from "@src/pages/PlaylistsPage/components/playlist-viewer/UnresolvedCell";
import type { MbRecording } from "@src/lib/types";

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
  it("renders the ? indicator", () => {
    const { container } = render(<UnresolvedCell />);
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

describe("UnresolvedCandidates", () => {
  it("returns null when candidates is empty", () => {
    const { container } = render(
      <UnresolvedCandidates candidates={[]} onSelect={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("lists candidate titles", () => {
    render(
      <UnresolvedCandidates candidates={candidates} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("Candidate One")).toBeInTheDocument();
    expect(screen.getByText("Candidate Two")).toBeInTheDocument();
  });

  it("clicking a candidate calls onSelect with its id", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<UnresolvedCandidates candidates={candidates} onSelect={onSelect} />);
    await user.click(screen.getByText("Candidate One"));
    expect(onSelect).toHaveBeenCalledWith("rec-1");
  });

  it("highlights the selected candidate", () => {
    const { container } = render(
      <UnresolvedCandidates
        candidates={candidates}
        selectedMbid="rec-2"
        onSelect={vi.fn()}
      />,
    );
    const rows = container.querySelectorAll("[class*='border-green']");
    expect(rows.length).toBeGreaterThan(0);
  });
});
