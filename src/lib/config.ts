import type { JellyfinConfig, MbAuth } from "./types";

const JELLYFIN_KEY = "jellybrainz-jellyfin";
const MB_AUTH_KEY = "jellybrainz-mb-auth";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function getJellyfinConfig(): JellyfinConfig | null {
  return read<JellyfinConfig>(JELLYFIN_KEY);
}

export function setJellyfinConfig(cfg: JellyfinConfig): void {
  write(JELLYFIN_KEY, cfg);
}

export function getMbAuth(): MbAuth | null {
  return read<MbAuth>(MB_AUTH_KEY);
}

export function setMbAuth(auth: MbAuth): void {
  write(MB_AUTH_KEY, auth);
}

export function clearMbAuth(): void {
  remove(MB_AUTH_KEY);
}
