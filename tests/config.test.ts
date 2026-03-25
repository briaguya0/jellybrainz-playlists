import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLbAuth,
  clearMbAuth,
  clearMbClientSecret,
  getLbAuth,
  getMbAuth,
  getMbClientId,
  getMbClientSecret,
  getJellyfinConfig,
  setJellyfinConfig,
  setLbAuth,
  setMbAuth,
  setMbClientId,
  setMbClientSecret,
} from "@src/lib/config";
import type { JellyfinConfig, LbAuth, MbAuth } from "@src/lib/types";

beforeEach(() => localStorage.clear());

const jellyfinCfg: JellyfinConfig = {
  url: "http://localhost:8096",
  apiKey: "key123",
  userId: "user-1",
};

const mbAuth: MbAuth = {
  accessToken: "access",
  username: "mbuser",
};

const lbAuth: LbAuth = {
  token: "lbtoken",
  username: "lbuser",
};

describe("jellyfin config", () => {
  it("round-trips set/get", () => {
    setJellyfinConfig(jellyfinCfg);
    expect(getJellyfinConfig()).toEqual(jellyfinCfg);
  });

  it("returns null when absent", () => {
    expect(getJellyfinConfig()).toBeNull();
  });
});

describe("mb auth", () => {
  it("round-trips set/get", () => {
    setMbAuth(mbAuth);
    expect(getMbAuth()).toEqual(mbAuth);
  });

  it("returns null when absent", () => {
    expect(getMbAuth()).toBeNull();
  });

  it("clearMbAuth removes the key", () => {
    setMbAuth(mbAuth);
    clearMbAuth();
    expect(getMbAuth()).toBeNull();
  });
});

describe("mb client id", () => {
  it("round-trips set/get", () => {
    setMbClientId("my-client-id");
    expect(getMbClientId()).toBe("my-client-id");
  });

  it("returns null when absent", () => {
    expect(getMbClientId()).toBeNull();
  });
});

describe("mb client secret", () => {
  it("round-trips set/get", () => {
    setMbClientSecret("my-secret");
    expect(getMbClientSecret()).toBe("my-secret");
  });

  it("returns null when absent", () => {
    expect(getMbClientSecret()).toBeNull();
  });

  it("clearMbClientSecret removes the key", () => {
    setMbClientSecret("my-secret");
    clearMbClientSecret();
    expect(getMbClientSecret()).toBeNull();
  });
});

describe("lb auth", () => {
  it("round-trips set/get", () => {
    setLbAuth(lbAuth);
    expect(getLbAuth()).toEqual(lbAuth);
  });

  it("returns null when absent", () => {
    expect(getLbAuth()).toBeNull();
  });

  it("clearLbAuth removes the key", () => {
    setLbAuth(lbAuth);
    clearLbAuth();
    expect(getLbAuth()).toBeNull();
  });
});

describe("corrupted JSON", () => {
  it("returns null for corrupted jellyfin config", () => {
    localStorage.setItem("jellybrainz-jellyfin", "{invalid json}");
    expect(getJellyfinConfig()).toBeNull();
  });

  it("returns null for corrupted mb auth", () => {
    localStorage.setItem("jellybrainz-mb-auth", "not-json");
    expect(getMbAuth()).toBeNull();
  });
});

describe("SSR guard (window undefined)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("getJellyfinConfig returns null when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(getJellyfinConfig()).toBeNull();
  });

  it("setJellyfinConfig noops when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(() => setJellyfinConfig(jellyfinCfg)).not.toThrow();
  });

  it("getMbAuth returns null when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(getMbAuth()).toBeNull();
  });

  it("getLbAuth returns null when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(getLbAuth()).toBeNull();
  });
});
