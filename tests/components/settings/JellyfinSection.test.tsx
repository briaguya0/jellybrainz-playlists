import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { JellyfinSection } from "@src/components/settings/JellyfinSection";
import type { JellyfinConfig } from "@src/lib/types";

const { mockSetCfg, mockUseJellyfin, mockResolveUserId } = vi.hoisted(() => {
  const mockSetCfg = vi.fn();
  const mockUseJellyfin = vi.fn();
  const mockResolveUserId = vi.fn();
  return { mockSetCfg, mockUseJellyfin, mockResolveUserId };
});

vi.mock("@src/contexts/JellyfinContext", () => ({
  useJellyfin: mockUseJellyfin,
  JellyfinProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@src/lib/jellyfin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/jellyfin")>();
  return { ...actual, resolveUserId: mockResolveUserId };
});

const defaultCtx = {
  cfg: null,
  hydrated: true,
  setCfg: mockSetCfg,
};

describe("JellyfinSection", () => {
  it("shows Connect button when cfg is null", () => {
    mockUseJellyfin.mockReturnValue(defaultCtx);
    render(<JellyfinSection />);
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("shows Save button when cfg is already set", () => {
    const cfg: JellyfinConfig = { url: "http://jellyfin.local", apiKey: "key", userId: "u1" };
    mockUseJellyfin.mockReturnValue({ cfg, hydrated: true, setCfg: mockSetCfg });
    render(<JellyfinSection />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("save button calls resolveUserId then setCfg with resolved userId", async () => {
    const user = userEvent.setup();
    mockUseJellyfin.mockReturnValue(defaultCtx);
    mockResolveUserId.mockResolvedValue("resolved-user-id");
    mockSetCfg.mockClear();
    render(<JellyfinSection />);

    await user.type(screen.getByPlaceholderText("http://localhost:8096"), "http://jellyfin.local");
    await user.type(screen.getByPlaceholderText("Paste your API key"), "my-key");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(mockSetCfg).toHaveBeenCalledWith({
        url: "http://jellyfin.local",
        apiKey: "my-key",
        userId: "resolved-user-id",
      }),
    );
  });

  it("shows error message when resolveUserId throws", async () => {
    const user = userEvent.setup();
    mockUseJellyfin.mockReturnValue(defaultCtx);
    mockResolveUserId.mockRejectedValue(new Error("Connection failed"));
    render(<JellyfinSection />);

    await user.type(screen.getByPlaceholderText("http://localhost:8096"), "http://jellyfin.local");
    await user.type(screen.getByPlaceholderText("Paste your API key"), "bad-key");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(screen.getByText("Connection failed")).toBeInTheDocument(),
    );
  });
});
