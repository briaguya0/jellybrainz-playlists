import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { MbAuthProvider, useMbAuth } from "@src/contexts/MbAuthContext";
import type { MbAuth } from "@src/lib/types";

beforeEach(() => localStorage.clear());

const auth: MbAuth = { accessToken: "tok", username: "mbuser" };

function wrapper({ children }: { children: React.ReactNode }) {
  return <MbAuthProvider>{children}</MbAuthProvider>;
}

describe("useMbAuth", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useMbAuth())).toThrow("MbAuthProvider");
  });

  it("initial auth is read from localStorage after mount", async () => {
    localStorage.setItem("jellybrainz-mb-auth", JSON.stringify(auth));
    localStorage.setItem("jellybrainz-mb-client-id", JSON.stringify("my-client-id"));
    localStorage.setItem("jellybrainz-mb-client-secret", JSON.stringify("my-secret"));
    const { result } = renderHook(() => useMbAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.mbAuth).toEqual(auth);
    expect(result.current.clientId).toBe("my-client-id");
    expect(result.current.clientSecret).toBe("my-secret");
  });

  it("setMbAuth writes to localStorage and updates context", async () => {
    const { result } = renderHook(() => useMbAuth(), { wrapper });
    await act(async () => {});
    act(() => result.current.setMbAuth(auth));
    expect(result.current.mbAuth).toEqual(auth);
    expect(JSON.parse(localStorage.getItem("jellybrainz-mb-auth")!)).toEqual(auth);
  });

  it("setMbAuth(null) calls clearMbAuth and sets context to null", async () => {
    localStorage.setItem("jellybrainz-mb-auth", JSON.stringify(auth));
    const { result } = renderHook(() => useMbAuth(), { wrapper });
    await act(async () => {});
    act(() => result.current.setMbAuth(null));
    expect(result.current.mbAuth).toBeNull();
    expect(localStorage.getItem("jellybrainz-mb-auth")).toBeNull();
  });

  it("setClientId writes to localStorage and updates context", async () => {
    const { result } = renderHook(() => useMbAuth(), { wrapper });
    await act(async () => {});
    act(() => result.current.setClientId("new-client-id"));
    expect(result.current.clientId).toBe("new-client-id");
    expect(JSON.parse(localStorage.getItem("jellybrainz-mb-client-id")!)).toBe("new-client-id");
  });

  it("setClientSecret writes to localStorage and updates context", async () => {
    const { result } = renderHook(() => useMbAuth(), { wrapper });
    await act(async () => {});
    act(() => result.current.setClientSecret("new-secret"));
    expect(result.current.clientSecret).toBe("new-secret");
    expect(JSON.parse(localStorage.getItem("jellybrainz-mb-client-secret")!)).toBe("new-secret");
  });

  it("clearClientSecret removes from localStorage and sets context to null", async () => {
    localStorage.setItem("jellybrainz-mb-client-secret", JSON.stringify("my-secret"));
    const { result } = renderHook(() => useMbAuth(), { wrapper });
    await act(async () => {});
    act(() => result.current.clearClientSecret());
    expect(result.current.clientSecret).toBeNull();
    expect(localStorage.getItem("jellybrainz-mb-client-secret")).toBeNull();
  });
});
