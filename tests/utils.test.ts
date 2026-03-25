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

  it("parses valid k:v pairs", () => {
    expect(parseOverrides("k1:v1,k2:v2")).toEqual({ k1: "v1", k2: "v2" });
  });

  it("skips pair missing colon", () => {
    expect(parseOverrides("nocolon,k:v")).toEqual({ k: "v" });
  });

  it("skips pair with empty key", () => {
    expect(parseOverrides(":value,k:v")).toEqual({ k: "v" });
  });

  it("skips pair with empty value", () => {
    expect(parseOverrides("key:,k:v")).toEqual({ k: "v" });
  });

  it("uses everything after first colon as value", () => {
    expect(parseOverrides("k:v:with:colons")).toEqual({ k: "v:with:colons" });
  });
});

describe("serializeOverrides", () => {
  it("returns undefined for empty object", () => {
    expect(serializeOverrides({})).toBeUndefined();
  });

  it("serializes non-empty object", () => {
    expect(serializeOverrides({ k: "v" })).toBe("k:v");
  });

  it("joins multiple entries with comma", () => {
    const result = serializeOverrides({ k1: "v1", k2: "v2" });
    expect(result).toContain("k1:v1");
    expect(result).toContain("k2:v2");
    expect(result).toContain(",");
  });

  it("round-trips with parseOverrides", () => {
    const original = { abc: "def", xyz: "123" };
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
