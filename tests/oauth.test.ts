import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthUrl, exchangeCode, fetchMbUsername, generatePkce } from "@src/lib/oauth";

describe("generatePkce", () => {
  it("returns codeVerifier and codeChallenge strings", async () => {
    const { codeVerifier, codeChallenge } = await generatePkce();
    expect(typeof codeVerifier).toBe("string");
    expect(typeof codeChallenge).toBe("string");
  });

  it("codeVerifier is base64url (no +, /, or =)", async () => {
    const { codeVerifier } = await generatePkce();
    expect(codeVerifier).not.toMatch(/[+/=]/);
  });

  it("codeChallenge is base64url (no +, /, or =)", async () => {
    const { codeChallenge } = await generatePkce();
    expect(codeChallenge).not.toMatch(/[+/=]/);
  });

  it("generates different values each call", async () => {
    const a = await generatePkce();
    const b = await generatePkce();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });

  it("codeChallenge differs from codeVerifier", async () => {
    const { codeVerifier, codeChallenge } = await generatePkce();
    expect(codeChallenge).not.toBe(codeVerifier);
  });
});

describe("buildAuthUrl", () => {
  it("includes all required OAuth params", () => {
    const url = new URL(
      buildAuthUrl(
        "my-client-id",
        "http://localhost:3000/mb-callback",
        "abc123",
      ),
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("my-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/mb-callback",
    );
    expect(url.searchParams.get("scope")).toBe("collection profile");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("abc123");
  });

  it("points to the MB authorize endpoint", () => {
    const url = new URL(
      buildAuthUrl("cid", "http://localhost:3000/mb-callback", "ch"),
    );
    expect(url.pathname).toBe("/oauth2/authorize");
  });
});

function mockFetch(response: { ok: boolean; status?: number; json?: () => Promise<unknown>; text?: () => Promise<string> }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: response.json ?? (() => Promise.resolve({})),
    text: response.text ?? (() => Promise.resolve("")),
  });
}

describe("exchangeCode", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends correct params in POST body", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ access_token: "tok" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await exchangeCode("code123", "verifier456", "client-id", "http://localhost/cb");
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code123");
    expect(body.get("redirect_uri")).toBe("http://localhost/cb");
    expect(body.get("code_verifier")).toBe("verifier456");
    expect(body.get("client_id")).toBe("client-id");
  });

  it("returns access_token from response", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ access_token: "my-token" }),
    }));
    await expect(exchangeCode("code", "verifier", "cid", "http://localhost/cb")).resolves.toBe("my-token");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: false,
      status: 400,
      text: () => Promise.resolve("bad request"),
    }));
    await expect(exchangeCode("code", "verifier", "cid", "http://localhost/cb")).rejects.toThrow("bad request");
  });
});

describe("fetchMbUsername", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends Authorization: Bearer header", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve({ sub: "mb-user" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchMbUsername("my-access-token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer my-access-token");
  });

  it("returns sub field from response", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: true,
      json: () => Promise.resolve({ sub: "mb-user" }),
    }));
    await expect(fetchMbUsername("tok")).resolves.toBe("mb-user");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: false,
      status: 401,
      text: () => Promise.resolve("unauthorized"),
    }));
    await expect(fetchMbUsername("bad-tok")).rejects.toThrow("unauthorized");
  });
});
