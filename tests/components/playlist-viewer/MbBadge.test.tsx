import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  MbBadge,
  MbBadgeEditContent,
} from "@src/pages/PlaylistsPage/components/playlist-viewer/MbBadge";
import type { MbRecording } from "@src/lib/types";

const recording: MbRecording = {
  id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  title: "Test Song",
  "artist-credit": [{ name: "Test Artist", artist: { name: "Test Artist" } }],
};

describe("MbBadge", () => {
  it("partial-auto: renders amber dot indicator", () => {
    const { container } = render(<MbBadge kind="partial-auto" />);
    expect(container.querySelector(".bg-amber-400")).toBeInTheDocument();
  });

  it("override: renders green dot indicator", () => {
    const { container } = render(<MbBadge kind="override" />);
    expect(container.querySelector(".bg-green-500")).toBeInTheDocument();
  });
});

describe("MbBadgeEditContent", () => {
  it("partial-auto: shows label, recording id, input and save button", () => {
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        matchLabel="Matched via artist + title search"
        recording={recording}
        onOverride={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.getByText(recording.id)).toBeInTheDocument();
    expect(screen.getByText(/artist \+ title search/i)).toBeInTheDocument();
    expect(screen.getByText(/manually enter recording id/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/xxxx/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("partial-auto: no clear button", () => {
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        matchLabel="Matched via artist + title search"
        recording={recording}
        onOverride={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.queryByText(/clear/i)).not.toBeInTheDocument();
  });

  it("override with manual source: shows Clear entry button", () => {
    render(
      <MbBadgeEditContent
        kind="override"
        matchLabel="Manually entered"
        overrideSource="manual"
        recording={recording}
        onOverride={vi.fn()}
        onClear={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /clear entry/i })).toBeInTheDocument();
  });

  it("override with confirmed source: shows Clear confirmation button", () => {
    render(
      <MbBadgeEditContent
        kind="override"
        matchLabel="Matched via artist + title search (confirmed)"
        overrideSource="confirmed-artist"
        recording={recording}
        onOverride={vi.fn()}
        onClear={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /clear confirmation/i })).toBeInTheDocument();
  });

  it("entering MBID and saving calls onOverride and onCollapse", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    const onCollapse = vi.fn();
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        matchLabel="Matched via artist + title search"
        recording={recording}
        onOverride={onOverride}
        onCollapse={onCollapse}
      />,
    );
    await user.type(screen.getByPlaceholderText(/xxxx/), "new-mbid-1234");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onOverride).toHaveBeenCalledWith("new-mbid-1234");
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it("clicking clear button calls onClear and onCollapse", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onCollapse = vi.fn();
    render(
      <MbBadgeEditContent
        kind="override"
        matchLabel="Manually entered"
        overrideSource="manual"
        recording={recording}
        onOverride={vi.fn()}
        onClear={onClear}
        onCollapse={onCollapse}
      />,
    );
    await user.click(screen.getByRole("button", { name: /clear entry/i }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onCollapse).toHaveBeenCalledOnce();
  });
});
