import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SyncDropdown } from "@src/pages/PlaylistsPage/components/playlist-viewer/SyncDropdown";

const {
  mockUseMbAuth,
  mockFetchCollections,
  mockAddRecordings,
  mockDeleteRecordings,
  mockFetchCollectionRecordings,
} = vi.hoisted(() => ({
  mockUseMbAuth: vi.fn(),
  mockFetchCollections: vi.fn(),
  mockAddRecordings: vi.fn(),
  mockDeleteRecordings: vi.fn(),
  mockFetchCollectionRecordings: vi.fn(),
}));

vi.mock("@src/contexts/MbAuthContext", () => ({
  useMbAuth: mockUseMbAuth,
}));

vi.mock("@src/lib/musicbrainz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/musicbrainz")>();
  return {
    ...actual,
    fetchCollections: mockFetchCollections,
    addRecordingsToCollection: mockAddRecordings,
    deleteRecordingsFromCollection: mockDeleteRecordings,
    fetchCollectionRecordings: mockFetchCollectionRecordings,
  };
});

vi.mock("@src/lib/oauth", () => ({
  generatePkce: vi.fn().mockResolvedValue({ codeVerifier: "v", codeChallenge: "c" }),
  buildAuthUrl: vi.fn().mockReturnValue("https://musicbrainz.org/oauth2/authorize?test=1"),
}));

const mbAuth = { accessToken: "tok", username: "mbuser" };
const collection = { id: "col-1", name: "My Collection", "entity-type": "recording" };

function renderDropdown(matchedMbids = ["mbid-1", "mbid-2"], totalTracks = 5) {
  return render(
    <SyncDropdown matchedMbids={matchedMbids} totalTracks={totalTracks} />,
  );
}

describe("SyncDropdown", () => {
  it("renders Export to MusicBrainz button", () => {
    mockUseMbAuth.mockReturnValue({ mbAuth: null, clientId: null });
    renderDropdown();
    expect(screen.getByRole("button", { name: /Export to MusicBrainz/ })).toBeInTheDocument();
  });

  it("shows prompt to add client ID when clientId is null", async () => {
    const user = userEvent.setup();
    mockUseMbAuth.mockReturnValue({ mbAuth: null, clientId: null });
    renderDropdown();
    await user.click(screen.getByRole("button", { name: /Export to MusicBrainz/ }));
    expect(screen.getByText(/Add a MusicBrainz client ID/)).toBeInTheDocument();
  });

  it("shows Connect button when clientId is set but no auth", async () => {
    const user = userEvent.setup();
    mockUseMbAuth.mockReturnValue({ mbAuth: null, clientId: "my-client-id" });
    renderDropdown();
    await user.click(screen.getByRole("button", { name: /Export to MusicBrainz/ }));
    expect(screen.getByRole("button", { name: "Connect MusicBrainz" })).toBeInTheDocument();
  });

  it("shows collections after opening when auth is present", async () => {
    const user = userEvent.setup();
    mockUseMbAuth.mockReturnValue({ mbAuth, clientId: "cid" });
    mockFetchCollections.mockResolvedValue([collection]);
    renderDropdown();
    await user.click(screen.getByRole("button", { name: /Export to MusicBrainz/ }));
    await screen.findByText("My Collection");
    expect(screen.getByText("My Collection")).toBeInTheDocument();
  });

  it("clicking a collection shows append/replace buttons", async () => {
    const user = userEvent.setup();
    mockUseMbAuth.mockReturnValue({ mbAuth, clientId: "cid" });
    mockFetchCollections.mockResolvedValue([collection]);
    renderDropdown();
    await user.click(screen.getByRole("button", { name: /Export to MusicBrainz/ }));
    await screen.findByText("My Collection");
    await user.click(screen.getByText("My Collection"));
    expect(screen.getByRole("button", { name: "Append" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
  });

  it("append flow: confirm → done", async () => {
    const user = userEvent.setup();
    mockUseMbAuth.mockReturnValue({ mbAuth, clientId: "cid" });
    mockFetchCollections.mockResolvedValue([collection]);
    mockAddRecordings.mockResolvedValue(undefined);
    renderDropdown();
    await user.click(screen.getByRole("button", { name: /Export to MusicBrainz/ }));
    await screen.findByText("My Collection");
    await user.click(screen.getByText("My Collection"));
    await user.click(screen.getByRole("button", { name: "Append" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(screen.getByText("Export complete")).toBeInTheDocument(),
    );
  });

  it("shows duplicate warning when matchedMbids has duplicates", async () => {
    const user = userEvent.setup();
    mockUseMbAuth.mockReturnValue({ mbAuth, clientId: "cid" });
    mockFetchCollections.mockResolvedValue([collection]);
    render(
      <SyncDropdown matchedMbids={["mbid-1", "mbid-1", "mbid-2"]} totalTracks={3} />,
    );
    await user.click(screen.getByRole("button", { name: /Export to MusicBrainz/ }));
    await screen.findByText("My Collection");
    await user.click(screen.getByText("My Collection"));
    await user.click(screen.getByRole("button", { name: "Append" }));
    expect(screen.getByText(/1 duplicate recording/)).toBeInTheDocument();
  });

  it("shows error state when append fails", async () => {
    const user = userEvent.setup();
    mockUseMbAuth.mockReturnValue({ mbAuth, clientId: "cid" });
    mockFetchCollections.mockResolvedValue([collection]);
    mockAddRecordings.mockRejectedValue(new Error("Network error"));
    renderDropdown();
    await user.click(screen.getByRole("button", { name: /Export to MusicBrainz/ }));
    await screen.findByText("My Collection");
    await user.click(screen.getByText("My Collection"));
    await user.click(screen.getByRole("button", { name: "Append" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
  });
});
