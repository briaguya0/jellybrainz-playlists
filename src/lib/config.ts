import type { JellyfinConfig, MbAuth } from "./types";

const JELLYFIN_KEY = "jellybrainz-jellyfin";
const MB_AUTH_KEY = "jellybrainz-mb-auth";
const MB_CLIENT_ID_KEY = "jellybrainz-mb-client-id";
const MB_CLIENT_SECRET_KEY = "jellybrainz-mb-client-secret";

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

export function getMbClientId(): string | null {
  return read<string>(MB_CLIENT_ID_KEY);
}

export function setMbClientId(id: string): void {
  write(MB_CLIENT_ID_KEY, id);
}

export function getMbClientSecret(): string | null {
  return read<string>(MB_CLIENT_SECRET_KEY);
}

export function setMbClientSecret(secret: string): void {
  write(MB_CLIENT_SECRET_KEY, secret);
}

export function clearMbClientSecret(): void {
  remove(MB_CLIENT_SECRET_KEY);
}
