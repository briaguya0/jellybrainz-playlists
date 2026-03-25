import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { LbAuthProvider, useLbAuth } from "@src/contexts/LbAuthContext";
import type { LbAuth } from "@src/lib/types";

beforeEach(() => localStorage.clear());

const auth: LbAuth = { token: "lbtoken", username: "lbuser" };

function wrapper({ children }: { children: React.ReactNode }) {
  return <LbAuthProvider>{children}</LbAuthProvider>;
}

describe("useLbAuth", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useLbAuth())).toThrow("LbAuthProvider");
  });

  it("initial auth is read from localStorage after mount", async () => {
    localStorage.setItem("jellybrainz-lb-auth", JSON.stringify(auth));
    const { result } = renderHook(() => useLbAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.lbAuth).toEqual(auth);
  });

  it("setLbAuth writes to localStorage and updates context", async () => {
    const { result } = renderHook(() => useLbAuth(), { wrapper });
    await act(async () => {});
    act(() => result.current.setLbAuth(auth));
    expect(result.current.lbAuth).toEqual(auth);
    expect(JSON.parse(localStorage.getItem("jellybrainz-lb-auth")!)).toEqual(auth);
  });

  it("setLbAuth(null) removes from localStorage and sets context to null", async () => {
    localStorage.setItem("jellybrainz-lb-auth", JSON.stringify(auth));
    const { result } = renderHook(() => useLbAuth(), { wrapper });
    await act(async () => {});
    act(() => result.current.setLbAuth(null));
    expect(result.current.lbAuth).toBeNull();
    expect(localStorage.getItem("jellybrainz-lb-auth")).toBeNull();
  });
});
