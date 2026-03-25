import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlaylistSelection } from "@src/pages/PlaylistsPage/components/playlist-selection/PlaylistSelection";

const { mockUseJellyfin, mockNavigate, mockFetchPlaylists } = vi.hoisted(() => {
  const mockUseJellyfin = vi.fn();
  const mockNavigate = vi.fn();
  const mockFetchPlaylists = vi.fn();
  return { mockUseJellyfin, mockNavigate, mockFetchPlaylists };
});

vi.mock("@src/contexts/JellyfinContext", () => ({
  useJellyfin: mockUseJellyfin,
  JellyfinProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@src/lib/jellyfin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/jellyfin")>();
  return { ...actual, fetchPlaylists: mockFetchPlaylists };
});

vi.mock("@src/pages/PlaylistsPage/components/playlist-selection/ConnectForm", () => ({
  ConnectForm: () => <div data-testid="connect-form">ConnectForm</div>,
}));

vi.mock("@src/pages/PlaylistsPage/components/playlist-selection/PlaylistCard", () => ({
  PlaylistCard: ({ playlist }: { playlist: { Name: string } }) => (
    <div data-testid="playlist-card">{playlist.Name}</div>
  ),
}));

vi.mock("@src/pages/PlaylistsPage/components/playlist-selection/PlaylistRow", () => ({
  PlaylistRow: ({ playlist }: { playlist: { Name: string } }) => (
    <div data-testid="playlist-row">{playlist.Name}</div>
  ),
}));

vi.mock("@src/pages/PlaylistsPage/components/playlist-selection/SkeletonCard", () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("PlaylistSelection", () => {
  it("renders ConnectForm when cfg is null (hydrated)", () => {
    mockUseJellyfin.mockReturnValue({ cfg: null, hydrated: true });
    render(<PlaylistSelection selectedId={undefined} />, { wrapper });
    expect(screen.getByTestId("connect-form")).toBeInTheDocument();
  });

  it("renders 6 skeleton cards while not hydrated", () => {
    mockUseJellyfin.mockReturnValue({ cfg: null, hydrated: false });
    render(<PlaylistSelection selectedId={undefined} />, { wrapper });
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(6);
  });

  it("renders 6 skeleton cards while playlists are loading", () => {
    mockFetchPlaylists.mockReturnValue(new Promise(() => {})); // never resolves
    mockUseJellyfin.mockReturnValue({
      cfg: { url: "http://jelly.local", apiKey: "k", userId: "u1" },
      hydrated: true,
    });
    render(<PlaylistSelection selectedId={undefined} />, { wrapper });
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(6);
  });

  it("renders PlaylistCards after playlists load (grid mode default)", async () => {
    const playlists = [
      { Id: "p1", Name: "Alpha", ChildCount: 2 },
      { Id: "p2", Name: "Beta", ChildCount: 0 },
    ];
    mockFetchPlaylists.mockResolvedValue(playlists);
    mockUseJellyfin.mockReturnValue({
      cfg: { url: "http://jelly.local", apiKey: "k", userId: "u1" },
      hydrated: true,
    });
    render(<PlaylistSelection selectedId={undefined} />, { wrapper });
    // Wait for cards to appear
    await screen.findAllByTestId("playlist-card");
    expect(screen.getAllByTestId("playlist-card")).toHaveLength(2);
  });

  it("switches to list view and renders PlaylistRows", async () => {
    const playlists = [{ Id: "p1", Name: "Alpha", ChildCount: 2 }];
    mockFetchPlaylists.mockResolvedValue(playlists);
    mockUseJellyfin.mockReturnValue({
      cfg: { url: "http://jelly.local", apiKey: "k", userId: "u1" },
      hydrated: true,
    });
    render(<PlaylistSelection selectedId={undefined} />, { wrapper });

    await screen.findAllByTestId("playlist-card");

    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getAllByTestId("playlist-row")).toHaveLength(1);
    expect(screen.queryByTestId("playlist-card")).not.toBeInTheDocument();
  });

  it("shows pagination when more than 12 playlists", async () => {
    const playlists = Array.from({ length: 13 }, (_, i) => ({
      Id: `p${i}`,
      Name: `Playlist ${i}`,
      ChildCount: 1,
    }));
    mockFetchPlaylists.mockResolvedValue(playlists);
    mockUseJellyfin.mockReturnValue({
      cfg: { url: "http://jelly.local", apiKey: "k", userId: "u1" },
      hydrated: true,
    });
    render(<PlaylistSelection selectedId={undefined} />, { wrapper });

    await screen.findAllByTestId("playlist-card");

    expect(screen.getAllByTestId("playlist-card")).toHaveLength(12);
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Prev/ })).toBeDisabled();
  });
});
