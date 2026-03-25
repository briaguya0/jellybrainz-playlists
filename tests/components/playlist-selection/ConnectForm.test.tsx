import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ConnectForm } from "@src/pages/PlaylistsPage/components/playlist-selection/ConnectForm";

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

describe("ConnectForm", () => {
  it("pre-fills URL with http://localhost:8096", () => {
    mockUseJellyfin.mockReturnValue({ setCfg: mockSetCfg });
    render(<ConnectForm />);
    const urlInput = screen.getByPlaceholderText("http://localhost:8096") as HTMLInputElement;
    expect(urlInput.value).toBe("http://localhost:8096");
  });

  it("renders API key password input", () => {
    mockUseJellyfin.mockReturnValue({ setCfg: mockSetCfg });
    render(<ConnectForm />);
    expect(screen.getByPlaceholderText("Paste your API key")).toBeInTheDocument();
    expect(document.querySelector("input[type=password]")).toBeInTheDocument();
  });

  it("submit calls resolveUserId then setCfg with resolved userId", async () => {
    const user = userEvent.setup();
    mockSetCfg.mockClear();
    mockUseJellyfin.mockReturnValue({ setCfg: mockSetCfg });
    mockResolveUserId.mockResolvedValue("resolved-user-id");
    render(<ConnectForm />);

    const urlInput = screen.getByPlaceholderText("http://localhost:8096");
    await user.clear(urlInput);
    await user.type(urlInput, "http://jelly.local");
    await user.type(screen.getByPlaceholderText("Paste your API key"), "my-api-key");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(mockSetCfg).toHaveBeenCalledWith({
        url: "http://jelly.local",
        apiKey: "my-api-key",
        userId: "resolved-user-id",
      }),
    );
  });

  it("shows error message when resolveUserId throws", async () => {
    const user = userEvent.setup();
    mockUseJellyfin.mockReturnValue({ setCfg: mockSetCfg });
    mockResolveUserId.mockRejectedValue(new Error("Connection refused"));
    render(<ConnectForm />);

    await user.type(screen.getByPlaceholderText("Paste your API key"), "bad-key");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() =>
      expect(screen.getByText("Connection refused")).toBeInTheDocument(),
    );
  });
});
