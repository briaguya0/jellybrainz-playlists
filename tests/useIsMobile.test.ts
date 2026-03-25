import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@src/hooks/useIsMobile";

type ChangeListener = (e: { matches: boolean }) => void;

function setupMatchMedia(matches: boolean) {
  const listeners: ChangeListener[] = [];
  const mq = {
    matches,
    addEventListener: vi.fn((_: string, cb: ChangeListener) => listeners.push(cb)),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mq));
  return { mq, listeners };
}

afterEach(() => vi.unstubAllGlobals());

describe("useIsMobile", () => {
  it("is initially true when window.innerWidth < 640 (matches = true)", () => {
    setupMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("is initially false when window.innerWidth >= 640 (matches = false)", () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates to true when matchMedia listener fires with matches: true", () => {
    const { listeners } = setupMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => listeners.forEach((l) => l({ matches: true })));
    expect(result.current).toBe(true);
  });

  it("updates to false when matchMedia listener fires with matches: false", () => {
    const { listeners } = setupMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    act(() => listeners.forEach((l) => l({ matches: false })));
    expect(result.current).toBe(false);
  });
});
