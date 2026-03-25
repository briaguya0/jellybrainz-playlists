import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlaylistViewer } from "@src/pages/PlaylistsPage/components/playlist-viewer/PlaylistViewer";

const { mockUseJellyfin, mockNavigate, mockUseSearch, mockUseTrackMatching } =
  vi.hoisted(() => ({
    mockUseJellyfin: vi.fn(),
    mockNavigate: vi.fn(),
    mockUseSearch: vi.fn(),
    mockUseTrackMatching: vi.fn(),
  }));

vi.mock("@src/contexts/JellyfinContext", () => ({
  useJellyfin: mockUseJellyfin,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: mockUseSearch,
}));

vi.mock("@src/hooks/useTrackMatching", () => ({
  useTrackMatching: mockUseTrackMatching,
}));

vi.mock("@src/lib/jellyfin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/jellyfin")>();
  return { ...actual, fetchPlaylists: vi.fn().mockResolvedValue([]) };
});

vi.mock(
  "@src/pages/PlaylistsPage/components/playlist-viewer/TrackTable",
  () => ({
    TrackTable: () => <div data-testid="track-table" />,
  }),
);
vi.mock(
  "@src/pages/PlaylistsPage/components/playlist-viewer/SyncDropdown",
  () => ({
    SyncDropdown: () => <div data-testid="sync-dropdown" />,
  }),
);
vi.mock(
  "@src/pages/PlaylistsPage/components/playlist-viewer/LbExportButton",
  () => ({
    LbExportButton: () => <div data-testid="lb-export-button" />,
  }),
);

const cfg = { url: "http://jelly.local", apiKey: "key", userId: "u1" };

const defaultTrackMatching = {
  tracks: [{ Id: "t1", Name: "Track" }],
  isPending: false,
  isError: false,
  error: null,
  matchStates: new Map(),
  matchedMbids: ["mbid-1", "mbid-2"],
  totalPartialAuto: 0,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("PlaylistViewer", () => {
  it("returns null when cfg is null", () => {
    mockUseJellyfin.mockReturnValue({ cfg: null });
    mockUseSearch.mockReturnValue({ overrides: undefined });
    mockUseTrackMatching.mockReturnValue(defaultTrackMatching);
    const { container } = render(<PlaylistViewer playlistId="p1" />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("returns null when playlistId is undefined", () => {
    mockUseJellyfin.mockReturnValue({ cfg });
    mockUseSearch.mockReturnValue({ overrides: undefined });
    mockUseTrackMatching.mockReturnValue(defaultTrackMatching);
    const { container } = render(<PlaylistViewer playlistId={undefined} />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("renders match counts when tracks are loaded", () => {
    mockUseJellyfin.mockReturnValue({ cfg });
    mockUseSearch.mockReturnValue({ overrides: undefined });
    mockUseTrackMatching.mockReturnValue(defaultTrackMatching);
    render(<PlaylistViewer playlistId="p1" />, { wrapper });
    expect(screen.getByText(/2\/1 matched/)).toBeInTheDocument();
  });

  it("renders TrackTable, SyncDropdown, and LbExportButton", () => {
    mockUseJellyfin.mockReturnValue({ cfg });
    mockUseSearch.mockReturnValue({ overrides: undefined });
    mockUseTrackMatching.mockReturnValue(defaultTrackMatching);
    render(<PlaylistViewer playlistId="p1" />, { wrapper });
    expect(screen.getByTestId("track-table")).toBeInTheDocument();
    expect(screen.getByTestId("sync-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("lb-export-button")).toBeInTheDocument();
  });

  it("shows error message when isError is true", () => {
    mockUseJellyfin.mockReturnValue({ cfg });
    mockUseSearch.mockReturnValue({ overrides: undefined });
    mockUseTrackMatching.mockReturnValue({
      ...defaultTrackMatching,
      isError: true,
      error: new Error("Load failed"),
    });
    render(<PlaylistViewer playlistId="p1" />, { wrapper });
    expect(screen.getByText("Load failed")).toBeInTheDocument();
  });

  it("shows unconfirmed count when totalPartialAuto > 0", () => {
    mockUseJellyfin.mockReturnValue({ cfg });
    mockUseSearch.mockReturnValue({ overrides: undefined });
    mockUseTrackMatching.mockReturnValue({
      ...defaultTrackMatching,
      totalPartialAuto: 3,
    });
    render(<PlaylistViewer playlistId="p1" />, { wrapper });
    expect(screen.getByText(/3 unconfirmed/)).toBeInTheDocument();
  });
});
