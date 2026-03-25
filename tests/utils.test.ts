import { describe, expect, it } from "vitest";
import { cn, getErrorMessage, parseOverrides, serializeOverrides } from "@src/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});

describe("parseOverrides", () => {
  it("returns empty object for empty string", () => {
    expect(parseOverrides("")).toEqual({});
  });

  it("returns empty object for null", () => {
    expect(parseOverrides(null)).toEqual({});
  });

  it("returns empty object for non-string", () => {
    expect(parseOverrides(42)).toEqual({});
    expect(parseOverrides({})).toEqual({});
  });

  it("parses valid k:mbid:source triples", () => {
    expect(parseOverrides("k1:mbid-1:manual,k2:mbid-2:selected")).toEqual({
      k1: { mbid: "mbid-1", source: "manual" },
      k2: { mbid: "mbid-2", source: "selected" },
    });
  });

  it("defaults source to manual for legacy k:mbid pairs", () => {
    expect(parseOverrides("k1:mbid-1")).toEqual({
      k1: { mbid: "mbid-1", source: "manual" },
    });
  });

  it("skips pair missing colon", () => {
    expect(parseOverrides("nocolon,k:v")).toEqual({ k: { mbid: "v", source: "manual" } });
  });

  it("skips pair with empty key", () => {
    expect(parseOverrides(":value,k:v")).toEqual({ k: { mbid: "v", source: "manual" } });
  });

  it("skips pair with empty value", () => {
    expect(parseOverrides("key:,k:v")).toEqual({ k: { mbid: "v", source: "manual" } });
  });
});

describe("serializeOverrides", () => {
  it("returns undefined for empty object", () => {
    expect(serializeOverrides({})).toBeUndefined();
  });

  it("serializes non-empty object", () => {
    expect(serializeOverrides({ k: { mbid: "v", source: "manual" } })).toBe("k:v:manual");
  });

  it("joins multiple entries with comma", () => {
    const result = serializeOverrides({
      k1: { mbid: "v1", source: "manual" },
      k2: { mbid: "v2", source: "selected" },
    });
    expect(result).toContain("k1:v1:manual");
    expect(result).toContain("k2:v2:selected");
    expect(result).toContain(",");
  });

  it("round-trips with parseOverrides", () => {
    const original = {
      abc: { mbid: "def", source: "manual" as const },
      xyz: { mbid: "123", source: "confirmed-artist" as const },
    };
    const serialized = serializeOverrides(original);
    expect(parseOverrides(serialized)).toEqual(original);
  });
});

describe("getErrorMessage", () => {
  it("returns err.message for Error instances", () => {
    expect(getErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("returns fallback for string thrown", () => {
    expect(getErrorMessage("some string", "fallback")).toBe("fallback");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
