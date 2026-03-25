import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "@src/components/SettingsPanel";

// Mock all section components to keep tests focused on SettingsPanel behavior
vi.mock("@src/components/settings/ThemeSection", () => ({
  ThemeSection: () => <div data-testid="theme-section">ThemeSection</div>,
}));
vi.mock("@src/components/settings/JellyfinSection", () => ({
  JellyfinSection: () => <div data-testid="jellyfin-section">JellyfinSection</div>,
}));
vi.mock("@src/components/settings/MbSection", () => ({
  MbSection: () => <div data-testid="mb-section">MbSection</div>,
}));
vi.mock("@src/components/settings/LbSection", () => ({
  LbSection: () => <div data-testid="lb-section">LbSection</div>,
}));

describe("SettingsPanel", () => {
  it("renders via createPortal to document.body", () => {
    const onClose = vi.fn();
    render(<SettingsPanel onClose={onClose} />);
    expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument();
  });

  it("Escape key calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsPanel onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("backdrop click calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsPanel onClose={onClose} />);
    const backdrop = document.body.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders all four settings sections", () => {
    render(<SettingsPanel onClose={vi.fn()} />);
    expect(screen.getByTestId("theme-section")).toBeInTheDocument();
    expect(screen.getByTestId("jellyfin-section")).toBeInTheDocument();
    expect(screen.getByTestId("mb-section")).toBeInTheDocument();
    expect(screen.getByTestId("lb-section")).toBeInTheDocument();
  });
});
