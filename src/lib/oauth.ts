const MB_HOST =
	(import.meta.env["VITE_MB_BASE_URL"] as string | undefined) ??
	"https://musicbrainz.org";

export interface PkceParams {
	codeVerifier: string;
	codeChallenge: string;
}

function base64urlEncode(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function generatePkce(): Promise<PkceParams> {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	const codeVerifier = base64urlEncode(array.buffer);

	const encoded = new TextEncoder().encode(codeVerifier);
	const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
	const codeChallenge = base64urlEncode(hashBuffer);

	return { codeVerifier, codeChallenge };
}

export function buildAuthUrl(
	clientId: string,
	redirectUri: string,
	codeChallenge: string,
): string {
	const url = new URL(`${MB_HOST}/oauth2/authorize`);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("scope", "collection");
	url.searchParams.set("code_challenge_method", "S256");
	url.searchParams.set("code_challenge", codeChallenge);
	return url.toString();
}

export async function exchangeCode(
	code: string,
	codeVerifier: string,
	clientId: string,
	redirectUri: string,
): Promise<string> {
	const resp = await fetch(`${MB_HOST}/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			code_verifier: codeVerifier,
		}),
	});
	if (!resp.ok) {
		throw new Error(`Token exchange failed: ${resp.status} ${resp.statusText}`);
	}
	const data: { access_token: string } = await resp.json();
	return data.access_token;
}

export async function fetchMbUsername(accessToken: string): Promise<string> {
	const resp = await fetch(`${MB_HOST}/oauth2/userinfo`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!resp.ok) {
		throw new Error(
			`Failed to fetch MB username: ${resp.status} ${resp.statusText}`,
		);
	}
	const data: { sub: string } = await resp.json();
	return data.sub;
}
