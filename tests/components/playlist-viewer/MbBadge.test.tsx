import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MbBadge } from "@src/pages/PlaylistsPage/components/playlist-viewer/MbBadge";
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

const recording: MbRecording = {
  id: "rec-1",
  title: "Test Song",
  "artist-credit": [{ name: "Test Artist", artist: { name: "Test Artist" } }],
};

describe("MbBadge", () => {
  it("partial-auto: shows Confirm and Change buttons", () => {
    render(
      <MbBadge
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("override: shows Change button but no Confirm", () => {
    render(
      <MbBadge
        kind="override"
        recording={recording}
        onOverride={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });

  it("clicking Change shows MBID input and Clear button", async () => {
    const user = userEvent.setup();
    render(
      <MbBadge
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByPlaceholderText(/xxxx/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("entering MBID and applying calls onOverride", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    render(
      <MbBadge
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={onOverride}
        onClear={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.type(screen.getByPlaceholderText(/xxxx/), "new-mbid-1234");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onOverride).toHaveBeenCalledWith("new-mbid-1234");
  });

  it("clicking Clear calls onClear", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <MbBadge
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={vi.fn()}
        onClear={onClear}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("partial-auto: Confirm calls onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MbBadge
        kind="partial-auto"
        recording={recording}
        onConfirm={onConfirm}
        onOverride={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
