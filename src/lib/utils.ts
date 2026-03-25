import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OverrideEntry } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseOverrides(raw: unknown): Record<string, OverrideEntry> {
  if (typeof raw !== "string" || !raw) return {};
  return Object.fromEntries(
    raw.split(",").flatMap((piece) => {
      const parts = piece.split(":");
      if (parts.length < 2) return [];
      const [k, mbid, source] = parts;
      if (!k || !mbid) return [];
      return [[k, { mbid, source: source ?? "manual" }]] as [string, OverrideEntry][];
    }),
  );
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function serializeOverrides(
  overrides: Record<string, OverrideEntry>,
): string | undefined {
  const entries = Object.entries(overrides);
  if (!entries.length) return undefined;
  return entries.map(([k, { mbid, source }]) => `${k}:${mbid}:${source}`).join(",");
}
