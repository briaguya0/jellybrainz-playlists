import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { LbSection } from "@src/components/settings/LbSection";

const { mockSetLbAuth, mockUseLbAuth, mockFetchLbUsername } = vi.hoisted(() => {
  const mockSetLbAuth = vi.fn();
  const mockUseLbAuth = vi.fn();
  const mockFetchLbUsername = vi.fn();
  return { mockSetLbAuth, mockUseLbAuth, mockFetchLbUsername };
});

vi.mock("@src/contexts/LbAuthContext", () => ({
  useLbAuth: mockUseLbAuth,
  LbAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@src/lib/listenbrainz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@src/lib/listenbrainz")>();
  return { ...actual, fetchLbUsername: mockFetchLbUsername };
});

describe("LbSection", () => {
  it("shows token input and connect button when not connected", () => {
    mockUseLbAuth.mockReturnValue({ lbAuth: null, setLbAuth: mockSetLbAuth });
    render(<LbSection />);
    expect(screen.getByRole("button", { name: "Connect ListenBrainz" })).toBeInTheDocument();
  });

  it("save calls fetchLbUsername then setLbAuth", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth: null, setLbAuth: mockSetLbAuth });
    mockFetchLbUsername.mockResolvedValue("lbuser");
    mockSetLbAuth.mockClear();
    render(<LbSection />);

    await user.type(document.querySelector("input[type=password]") as HTMLElement, "my-token");
    await user.click(screen.getByRole("button", { name: "Connect ListenBrainz" }));

    await waitFor(() =>
      expect(mockSetLbAuth).toHaveBeenCalledWith({ token: "my-token", username: "lbuser" }),
    );
  });

  it("shows error message on fetch failure", async () => {
    const user = userEvent.setup();
    mockUseLbAuth.mockReturnValue({ lbAuth: null, setLbAuth: mockSetLbAuth });
    mockFetchLbUsername.mockRejectedValue(new Error("Invalid token"));
    render(<LbSection />);

    await user.type(document.querySelector("input[type=password]") as HTMLElement, "bad-token");
    await user.click(screen.getByRole("button", { name: "Connect ListenBrainz" }));

    await waitFor(() => expect(screen.getByText("Invalid token")).toBeInTheDocument());
  });

  it("shows connected username and disconnect button when auth present", () => {
    mockUseLbAuth.mockReturnValue({
      lbAuth: { token: "tok", username: "lbuser" },
      setLbAuth: mockSetLbAuth,
    });
    render(<LbSection />);
    expect(screen.getByText("lbuser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });

  it("disconnect button calls setLbAuth(null)", async () => {
    const user = userEvent.setup();
    mockSetLbAuth.mockClear();
    mockUseLbAuth.mockReturnValue({
      lbAuth: { token: "tok", username: "lbuser" },
      setLbAuth: mockSetLbAuth,
    });
    render(<LbSection />);
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(mockSetLbAuth).toHaveBeenCalledWith(null);
  });
});
