import { fireEvent, render, screen } from "@testing-library/react";
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

  it("clicking Change shows MBID input and Clear button", () => {
    render(
      <MbBadge
        kind="partial-auto"
        recording={recording}
        onConfirm={vi.fn()}
        onOverride={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByPlaceholderText(/xxxx/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("entering MBID and applying calls onOverride", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.change(screen.getByPlaceholderText(/xxxx/), {
      target: { value: "new-mbid-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onOverride).toHaveBeenCalledWith("new-mbid-1234");
  });

  it("clicking Clear calls onClear", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("partial-auto: Confirm calls onConfirm", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
