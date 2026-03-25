import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  UnresolvedCell,
  UnresolvedEditContent,
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

describe("UnresolvedEditContent", () => {
  it("lists candidate titles", () => {
    render(
      <UnresolvedEditContent
        candidates={candidates}
        onOverride={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.getByText("Candidate One")).toBeInTheDocument();
    expect(screen.getByText("Candidate Two")).toBeInTheDocument();
  });

  it("clicking a candidate calls onOverride with its id and onCollapse", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    const onCollapse = vi.fn();
    render(
      <UnresolvedEditContent
        candidates={candidates}
        onOverride={onOverride}
        onCollapse={onCollapse}
      />,
    );
    await user.click(screen.getByText("Candidate One"));
    expect(onOverride).toHaveBeenCalledWith("rec-1");
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it("entering manual MBID and submitting calls onOverride and onCollapse", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    const onCollapse = vi.fn();
    render(
      <UnresolvedEditContent
        candidates={[]}
        onOverride={onOverride}
        onCollapse={onCollapse}
      />,
    );
    await user.type(screen.getByPlaceholderText(/xxxx/), "manual-mbid-5678");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onOverride).toHaveBeenCalledWith("manual-mbid-5678");
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it("shows manual input even with no candidates", () => {
    render(
      <UnresolvedEditContent
        candidates={[]}
        onOverride={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText(/xxxx/)).toBeInTheDocument();
  });
});
