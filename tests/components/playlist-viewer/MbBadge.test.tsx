import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  MbBadge,
  MbBadgeEditContent,
} from "@src/pages/PlaylistsPage/components/playlist-viewer/MbBadge";
import type { MbRecording } from "@src/lib/types";

const recording: MbRecording = {
  id: "rec-1",
  title: "Test Song",
  "artist-credit": [{ name: "Test Artist", artist: { name: "Test Artist" } }],
};

describe("MbBadge", () => {
  it("partial-auto: renders amber dot indicator", () => {
    const { container } = render(<MbBadge kind="partial-auto" />);
    const dot = container.querySelector(".bg-amber-400");
    expect(dot).toBeInTheDocument();
  });

  it("override: renders green dot indicator", () => {
    const { container } = render(<MbBadge kind="override" />);
    const dot = container.querySelector(".bg-green-500");
    expect(dot).toBeInTheDocument();
  });
});

describe("MbBadgeEditContent", () => {
  it("partial-auto: shows Confirm and Change buttons", () => {
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={vi.fn()}
        onClear={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("override: shows Change button but no Confirm", () => {
    render(
      <MbBadgeEditContent
        kind="override"
        recording={recording}
        onOverride={vi.fn()}
        onClear={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("clicking Change shows MBID input and Clear button", async () => {
    const user = userEvent.setup();
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={vi.fn()}
        onClear={vi.fn()}
        onCollapse={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByPlaceholderText(/xxxx/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("entering MBID and applying calls onOverride and onCollapse", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    const onCollapse = vi.fn();
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={onOverride}
        onClear={vi.fn()}
        onCollapse={onCollapse}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.type(screen.getByPlaceholderText(/xxxx/), "new-mbid-1234");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onOverride).toHaveBeenCalledWith("new-mbid-1234");
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it("clicking Clear calls onClear and onCollapse", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onCollapse = vi.fn();
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={vi.fn()}
        onClear={onClear}
        onCollapse={onCollapse}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it("partial-auto: Confirm calls onConfirm and onCollapse", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCollapse = vi.fn();
    render(
      <MbBadgeEditContent
        kind="partial-auto"
        recording={recording}
        onConfirm={onConfirm}
        onOverride={vi.fn()}
        onClear={vi.fn()}
        onCollapse={onCollapse}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCollapse).toHaveBeenCalledOnce();
  });
});
