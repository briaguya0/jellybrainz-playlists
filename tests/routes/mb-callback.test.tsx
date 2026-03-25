import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const {
  mockSetMbAuth,
  mockUseMbAuth,
  mockNavigate,
  mockRouteUseSearch,
  mockExchangeCode,
  mockFetchMbUsername,
  mockGetMbClientId,
  mockGetMbClientSecret,
} = vi.hoisted(() => ({
  mockSetMbAuth: vi.fn(),
  mockUseMbAuth: vi.fn(),
  mockNavigate: vi.fn(),
  mockRouteUseSearch: vi.fn(),
  mockExchangeCode: vi.fn(),
  mockFetchMbUsername: vi.fn(),
  mockGetMbClientId: vi.fn(),
  mockGetMbClientSecret: vi.fn(),
}));

vi.mock("@src/contexts/MbAuthContext", () => ({
  useMbAuth: mockUseMbAuth,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    (_path: string) =>
    (opts: { component: React.ComponentType; validateSearch: unknown }) => ({
      useSearch: mockRouteUseSearch,
      component: opts.component,
    }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@src/lib/oauth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/oauth")>();
  return { ...actual, exchangeCode: mockExchangeCode, fetchMbUsername: mockFetchMbUsername };
});

vi.mock("@src/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/config")>();
  return { ...actual, getMbClientId: mockGetMbClientId, getMbClientSecret: mockGetMbClientSecret };
});

// Import after mocks are set up
const { Route } = await import("@src/routes/mb-callback");

function setup() {
  mockUseMbAuth.mockReturnValue({ setMbAuth: mockSetMbAuth });
  mockGetMbClientId.mockReturnValue("my-client-id");
  mockGetMbClientSecret.mockReturnValue(null);
}

describe("mb-callback route", () => {
  it("shows error when code param is missing", async () => {
    setup();
    mockRouteUseSearch.mockReturnValue({ code: undefined, error: undefined });
    render(<Route.component />);
    await waitFor(() =>
      expect(screen.getByText(/No authorization code/)).toBeInTheDocument(),
    );
  });

  it("shows error when PKCE verifier is missing from sessionStorage", async () => {
    setup();
    sessionStorage.clear();
    mockRouteUseSearch.mockReturnValue({ code: "auth-code", error: undefined });
    render(<Route.component />);
    await waitFor(() =>
      expect(screen.getByText(/PKCE verifier missing/)).toBeInTheDocument(),
    );
  });

  it("shows error when oauth error param is present", async () => {
    setup();
    mockRouteUseSearch.mockReturnValue({ code: undefined, error: "access_denied" });
    render(<Route.component />);
    await waitFor(() =>
      expect(screen.getByText(/Authorization denied/)).toBeInTheDocument(),
    );
  });

  it("shows error when exchangeCode throws", async () => {
    setup();
    sessionStorage.setItem("mb_pkce_verifier", "test-verifier");
    mockRouteUseSearch.mockReturnValue({ code: "auth-code", error: undefined });
    mockExchangeCode.mockRejectedValue(new Error("Token exchange failed"));
    render(<Route.component />);
    await waitFor(() =>
      expect(screen.getByText("Token exchange failed")).toBeInTheDocument(),
    );
    sessionStorage.clear();
  });

  it("success: calls exchangeCode, fetchMbUsername, setMbAuth, and navigates to /", async () => {
    setup();
    mockSetMbAuth.mockClear();
    mockNavigate.mockClear();
    sessionStorage.setItem("mb_pkce_verifier", "test-verifier");
    mockRouteUseSearch.mockReturnValue({ code: "auth-code", error: undefined });
    mockExchangeCode.mockResolvedValue("access-token-xyz");
    mockFetchMbUsername.mockResolvedValue("mbuser");
    render(<Route.component />);
    await waitFor(() =>
      expect(mockSetMbAuth).toHaveBeenCalledWith({
        accessToken: "access-token-xyz",
        username: "mbuser",
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/" }),
    );
    sessionStorage.clear();
  });
});
