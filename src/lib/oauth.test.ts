import { describe, expect, it } from "vitest";
import { buildAuthUrl, generatePkce } from "./oauth";

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
			buildAuthUrl("my-client-id", "http://localhost:3000/mb-callback", "abc123"),
		);
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("client_id")).toBe("my-client-id");
		expect(url.searchParams.get("redirect_uri")).toBe(
			"http://localhost:3000/mb-callback",
		);
		expect(url.searchParams.get("scope")).toBe("collection");
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
