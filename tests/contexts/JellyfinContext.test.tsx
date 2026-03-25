import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { JellyfinProvider, useJellyfin } from "@src/contexts/JellyfinContext";
import type { JellyfinConfig } from "@src/lib/types";

beforeEach(() => localStorage.clear());

const cfg: JellyfinConfig = { url: "http://jellyfin.local", apiKey: "key", userId: "user-1" };

function wrapper({ children }: { children: React.ReactNode }) {
  return <JellyfinProvider>{children}</JellyfinProvider>;
}

describe("useJellyfin", () => {
  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useJellyfin())).toThrow("JellyfinProvider");
  });

  it("initial cfg is null before effects fire", () => {
    const { result } = renderHook(() => useJellyfin(), { wrapper });
    // Before act, hydration hasn't occurred
    expect(result.current.cfg).toBeNull();
  });

  it("after effect, cfg is populated from localStorage and hydrated is true", async () => {
    localStorage.setItem("jellybrainz-jellyfin", JSON.stringify(cfg));
    const { result } = renderHook(() => useJellyfin(), { wrapper });
    await act(async () => {});
    expect(result.current.cfg).toEqual(cfg);
    expect(result.current.hydrated).toBe(true);
  });

  it("hydrated is true even when localStorage is empty", async () => {
    const { result } = renderHook(() => useJellyfin(), { wrapper });
    await act(async () => {});
    expect(result.current.hydrated).toBe(true);
    expect(result.current.cfg).toBeNull();
  });

  it("setCfg updates context value", async () => {
    const { result } = renderHook(() => useJellyfin(), { wrapper });
    await act(async () => {});
    act(() => result.current.setCfg(cfg));
    expect(result.current.cfg).toEqual(cfg);
  });
});
