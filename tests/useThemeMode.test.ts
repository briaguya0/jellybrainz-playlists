import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyThemeMode, getStoredMode, useThemeMode } from "@src/hooks/useThemeMode";

function setupMatchMedia(prefersDark: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const mq = {
    matches: prefersDark,
    addEventListener: vi.fn((_: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mq));
  return { mq, listeners };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => vi.unstubAllGlobals());

describe("getStoredMode", () => {
  it("returns 'dark' from localStorage", () => {
    localStorage.setItem("theme", "dark");
    expect(getStoredMode()).toBe("dark");
  });

  it("returns 'light' from localStorage", () => {
    localStorage.setItem("theme", "light");
    expect(getStoredMode()).toBe("light");
  });

  it("returns 'auto' from localStorage", () => {
    localStorage.setItem("theme", "auto");
    expect(getStoredMode()).toBe("auto");
  });

  it("returns 'auto' as default when key absent", () => {
    expect(getStoredMode()).toBe("auto");
  });

  it("returns 'auto' for invalid value", () => {
    localStorage.setItem("theme", "invalid");
    expect(getStoredMode()).toBe("auto");
  });
});

describe("applyThemeMode", () => {
  it("'dark' adds dark class to documentElement", () => {
    setupMatchMedia(false);
    applyThemeMode("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("'light' adds light class to documentElement", () => {
    setupMatchMedia(false);
    applyThemeMode("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("'auto' with prefers-dark adds dark class", () => {
    setupMatchMedia(true);
    applyThemeMode("auto");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("'auto' without prefers-dark adds light class", () => {
    setupMatchMedia(false);
    applyThemeMode("auto");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});

describe("useThemeMode", () => {
  it("initial mode reads from localStorage", async () => {
    localStorage.setItem("theme", "dark");
    setupMatchMedia(false);
    const { result } = renderHook(() => useThemeMode());
    // after effects fire
    await act(async () => {});
    expect(result.current.mode).toBe("dark");
  });

  it("setAndApply updates state, writes to localStorage, updates DOM class", async () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useThemeMode());
    await act(async () => {});
    act(() => result.current.setAndApply("dark"));
    expect(result.current.mode).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switching to light updates DOM class", async () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useThemeMode());
    await act(async () => {});
    act(() => result.current.setAndApply("light"));
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
