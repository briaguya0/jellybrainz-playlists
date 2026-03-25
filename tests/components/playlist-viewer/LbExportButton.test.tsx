import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { LbExportButton } from "@src/pages/PlaylistsPage/components/playlist-viewer/LbExportButton";

const {
  mockUseLbAuth,
  mockFetchLbPlaylists,
  mockCreateLbPlaylist,
  mockAppendLbPlaylistTracks,
  mockReplaceLbPlaylistTracks,
  mockFetchLbPlaylistTracks,
} = vi.hoisted(() => ({
  mockUseLbAuth: vi.fn(),
  mockFetchLbPlaylists: vi.fn(),
  mockCreateLbPlaylist: vi.fn(),
  mockAppendLbPlaylistTracks: vi.fn(),
  mockReplaceLbPlaylistTracks: vi.fn(),
  mockFetchLbPlaylistTracks: vi.fn(),
}));

vi.mock("@src/contexts/LbAuthContext", () => ({
  useLbAuth: mockUseLbAuth,
}));

vi.mock("@src/lib/listenbrainz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/listenbrainz")>();
  return {
    ...actual,
    fetchLbPlaylists: mockFetchLbPlaylists,
    createLbPlaylist: mockCreateLbPlaylist,
    appendLbPlaylistTracks: mockAppendLbPlaylistTracks,
    replaceLbPlaylistTracks: mockReplaceLbPlaylistTracks,
    fetchLbPlaylistTracks: mockFetchLbPlaylistTracks,
  };
});

const lbAuth = { token: "lb-token", username: "lbuser" };
const lbPlaylist = {
  identifier: "https://listenbrainz.org/playlist/pl-1",
  title: "My LB Playlist",
};

function renderButton(matchedMbids = ["m1", "m2"], totalTracks = 5) {
  return render(
    <LbExportButton
      playlistName="Test Playlist"
      matchedMbids={matchedMbids}
      totalTracks={totalTracks}
    />,
  );
}

describe("LbExportButton", () => {
  it("renders Export to ListenBrainz button", () => {
    mockUseLbAuth.mockReturnValue({ lbAuth: null });
    renderButton();
    expect(screen.getByRole("button", { name: /Export to ListenBrainz/ })).toBeInTheDocument();
  });

  it("shows prompt to add token when lbAuth is null", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth: null });
    renderButton();
    await user.click(screen.getByRole("button", { name: /Export to ListenBrainz/ }));
    expect(screen.getByText(/Add a ListenBrainz token/)).toBeInTheDocument();
  });

  it("idle: shows Create new playlist button", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth });
    mockFetchLbPlaylists.mockResolvedValue([]);
    renderButton();
    await user.click(screen.getByRole("button", { name: /Export to ListenBrainz/ }));
    expect(screen.getByRole("button", { name: "Create new playlist" })).toBeInTheDocument();
  });

  it("shows existing playlists after loading", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth });
    mockFetchLbPlaylists.mockResolvedValue([lbPlaylist]);
    renderButton();
    await user.click(screen.getByRole("button", { name: /Export to ListenBrainz/ }));
    await screen.findByText("My LB Playlist");
    expect(screen.getByText("My LB Playlist")).toBeInTheDocument();
  });

  it("create-form: shows name input and visibility toggle", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth });
    mockFetchLbPlaylists.mockResolvedValue([]);
    renderButton();
    await user.click(screen.getByRole("button", { name: /Export to ListenBrainz/ }));
    await user.click(screen.getByRole("button", { name: "Create new playlist" }));
    expect(screen.getByRole("button", { name: "Private" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Public" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create & Export" })).toBeInTheDocument();
  });

  it("create → done shows link to playlist", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth });
    mockFetchLbPlaylists.mockResolvedValue([]);
    mockCreateLbPlaylist.mockResolvedValue("new-pl-mbid");
    renderButton();
    await user.click(screen.getByRole("button", { name: /Export to ListenBrainz/ }));
    await user.click(screen.getByRole("button", { name: "Create new playlist" }));
    await user.click(screen.getByRole("button", { name: "Create & Export" }));
    await waitFor(() =>
      expect(screen.getByText("Export complete")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /View playlist/ })).toHaveAttribute(
      "href",
      "https://listenbrainz.org/playlist/new-pl-mbid",
    );
  });

  it("shows error state when create fails", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth });
    mockFetchLbPlaylists.mockResolvedValue([]);
    mockCreateLbPlaylist.mockRejectedValue(new Error("LB error"));
    renderButton();
    await user.click(screen.getByRole("button", { name: /Export to ListenBrainz/ }));
    await user.click(screen.getByRole("button", { name: "Create new playlist" }));
    await user.click(screen.getByRole("button", { name: "Create & Export" }));
    await waitFor(() => expect(screen.getByText("LB error")).toBeInTheDocument());
  });

  it("shows append/replace when existing playlist is selected", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth });
    mockFetchLbPlaylists.mockResolvedValue([lbPlaylist]);
    renderButton();
    await user.click(screen.getByRole("button", { name: /Export to ListenBrainz/ }));
    await screen.findByText("My LB Playlist");
    await user.click(screen.getByText("My LB Playlist"));
    expect(screen.getByRole("button", { name: "Append" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
  });
});
