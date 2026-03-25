import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MbSection } from "@src/components/settings/MbSection";

const { mockSetMbAuth, mockUseMbAuth } = vi.hoisted(() => {
  const mockSetMbAuth = vi.fn();
  const mockUseMbAuth = vi.fn();
  return { mockSetMbAuth, mockUseMbAuth };
});

vi.mock("@src/contexts/MbAuthContext", () => ({
  useMbAuth: mockUseMbAuth,
  MbAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@src/lib/oauth", () => ({
  generatePkce: vi.fn().mockResolvedValue({
    codeVerifier: "verifier",
    codeChallenge: "challenge",
  }),
  buildAuthUrl: vi.fn().mockReturnValue("https://musicbrainz.org/oauth2/authorize?test=1"),
}));

const noAuthCtx = {
  mbAuth: null,
  setMbAuth: mockSetMbAuth,
  clientId: null,
  clientSecret: null,
  setClientId: vi.fn(),
  setClientSecret: vi.fn(),
  clearClientSecret: vi.fn(),
};

describe("MbSection", () => {
  it("shows message to enter Client ID when no clientId", () => {
    mockUseMbAuth.mockReturnValue(noAuthCtx);
    render(<MbSection />);
    expect(screen.getByText(/Enter a Client ID/)).toBeInTheDocument();
  });

  it("shows Connect button when clientId is set but no auth", () => {
    mockUseMbAuth.mockReturnValue({ ...noAuthCtx, clientId: "my-client-id" });
    render(<MbSection />);
    expect(screen.getByRole("button", { name: "Connect MusicBrainz" })).toBeInTheDocument();
  });

  it("shows connected username when auth present", () => {
    mockUseMbAuth.mockReturnValue({
      ...noAuthCtx,
      clientId: "my-client-id",
      mbAuth: { accessToken: "tok", username: "mbuser" },
    });
    render(<MbSection />);
    expect(screen.getByText("mbuser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });

  it("disconnect button calls setMbAuth(null)", async () => {
    const user = userEvent.setup();
    mockSetMbAuth.mockClear();
    mockUseMbAuth.mockReturnValue({
      ...noAuthCtx,
      clientId: "my-client-id",
      mbAuth: { accessToken: "tok", username: "mbuser" },
    });
    render(<MbSection />);
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(mockSetMbAuth).toHaveBeenCalledWith(null);
  });
});
