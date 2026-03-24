import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";

export function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "auto")
    return stored;
  return "auto";
}

export function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
  if (mode === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
  }
  document.documentElement.style.colorScheme = resolved;
}

export function useThemeMode(): {
  mode: ThemeMode;
  setAndApply: (next: ThemeMode) => void;
} {
  const [mode, setMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const initial = getStoredMode();
    setMode(initial);
    applyThemeMode(initial);
  }, []);

  useEffect(() => {
    if (mode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  function setAndApply(next: ThemeMode) {
    setMode(next);
    applyThemeMode(next);
    window.localStorage.setItem("theme", next);
  }

  return { mode, setAndApply };
}
