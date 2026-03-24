import { useMbAuth } from "@src/contexts/MbAuthContext";
import { buildAuthUrl, generatePkce } from "@src/lib/oauth";
import { useState } from "react";

export function MbSection() {
  const { mbAuth, setMbAuth, clientId, clientSecret, setClientId, setClientSecret, clearClientSecret } =
    useMbAuth();

  const [idDraft, setIdDraft] = useState(clientId ?? "");
  const [secretDraft, setSecretDraft] = useState(clientSecret ?? "");

  function saveCredentials() {
    if (idDraft.trim()) setClientId(idDraft.trim());
    if (secretDraft.trim()) setClientSecret(secretDraft.trim());
    else clearClientSecret();
  }

  async function connectMb() {
    if (!clientId) return;
    const { codeVerifier, codeChallenge } = await generatePkce();
    sessionStorage.setItem("mb_pkce_verifier", codeVerifier);
    const redirectUri = `${window.location.origin}/mb-callback`;
    window.location.href = buildAuthUrl(clientId, redirectUri, codeChallenge);
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-3">
        MusicBrainz
      </p>

      <div className="flex flex-col gap-2 mb-3">
        <div>
          <label className="block text-xs text-app-muted mb-1">
            OAuth Client ID
          </label>
          <input
            type="text"
            value={idDraft}
            onChange={(e) => setIdDraft(e.target.value)}
            placeholder="your-client-id"
            className="w-full rounded-lg border border-stroke bg-surface px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs text-app-muted mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={secretDraft}
            onChange={(e) => setSecretDraft(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-surface px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <button
          type="button"
          onClick={saveCredentials}
          disabled={!idDraft.trim()}
          className="w-full rounded-lg border border-stroke px-3 py-1.5 text-sm text-app-text hover:bg-hover disabled:opacity-50"
        >
          Save
        </button>
      </div>

      {!clientId ? (
        <p className="text-xs text-app-muted">
          Enter a Client ID above to connect.
        </p>
      ) : mbAuth ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-app-text truncate">
            Connected as{" "}
            <a
              href={`https://musicbrainz.org/user/${mbAuth.username}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold"
            >
              {mbAuth.username}
            </a>
          </p>
          <button
            type="button"
            onClick={() => setMbAuth(null)}
            className="shrink-0 text-sm text-app-muted hover:text-app-text underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={connectMb}
          className="w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Connect MusicBrainz
        </button>
      )}
    </section>
  );
}
