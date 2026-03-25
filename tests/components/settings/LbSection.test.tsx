import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    mockUseLbAuth.mockReturnValue({ lbAuth: null, setLbAuth: mockSetLbAuth });
    mockFetchLbUsername.mockResolvedValue("lbuser");
    mockSetLbAuth.mockClear();
    render(<LbSection />);

    const passwordInput = document.querySelector("input[type=password]") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "my-token" } });
    fireEvent.click(screen.getByRole("button", { name: "Connect ListenBrainz" }));

    await waitFor(() =>
      expect(mockSetLbAuth).toHaveBeenCalledWith({ token: "my-token", username: "lbuser" }),
    );
  });

  it("shows error message on fetch failure", async () => {
    mockUseLbAuth.mockReturnValue({ lbAuth: null, setLbAuth: mockSetLbAuth });
    mockFetchLbUsername.mockRejectedValue(new Error("Invalid token"));
    render(<LbSection />);

    const passwordInput = document.querySelector("input[type=password]") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "bad-token" } });
    fireEvent.click(screen.getByRole("button", { name: "Connect ListenBrainz" }));

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

  it("disconnect button calls setLbAuth(null)", () => {
    mockSetLbAuth.mockClear();
    mockUseLbAuth.mockReturnValue({
      lbAuth: { token: "tok", username: "lbuser" },
      setLbAuth: mockSetLbAuth,
    });
    render(<LbSection />);
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(mockSetLbAuth).toHaveBeenCalledWith(null);
  });
});
