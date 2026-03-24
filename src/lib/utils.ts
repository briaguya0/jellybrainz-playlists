import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseOverrides(raw: unknown): Record<string, string> {
  if (typeof raw !== "string" || !raw) return {};
  return Object.fromEntries(
    raw.split(",").flatMap((pair) => {
      const idx = pair.indexOf(":");
      if (idx === -1) return [];
      const k = pair.slice(0, idx);
      const v = pair.slice(idx + 1);
      return k && v ? [[k, v]] : [];
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
  overrides: Record<string, string>,
): string | undefined {
  const entries = Object.entries(overrides);
  if (!entries.length) return undefined;
  return entries.map(([k, v]) => `${k}:${v}`).join(",");
}
