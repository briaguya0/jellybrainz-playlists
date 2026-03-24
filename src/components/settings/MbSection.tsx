import { useMbAuth } from "@src/contexts/MbAuthContext";
import { buildAuthUrl, generatePkce } from "@src/lib/oauth";

export function MbSection() {
  const { mbAuth, setMbAuth } = useMbAuth();
  const clientId = import.meta.env.VITE_MB_CLIENT_ID as string | undefined;

  async function connectMb() {
    if (!clientId) return;
    const { codeVerifier, codeChallenge } = await generatePkce();
    sessionStorage.setItem("mb_pkce_verifier", codeVerifier);
    const redirectUri = `${window.location.origin}/mb-callback`;
    window.location.href = buildAuthUrl(clientId, redirectUri, codeChallenge);
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
        MusicBrainz
      </p>
      {!clientId ? (
        <p className="text-xs text-[var(--text-muted)]">
          <code>VITE_MB_CLIENT_ID</code> is not set. See{" "}
          <code>.env.example</code> for setup instructions.
        </p>
      ) : mbAuth ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-[var(--text)] truncate">
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
            className="shrink-0 text-sm text-[var(--text-muted)] hover:text-[var(--text)] underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Not connected.
          </p>
          <button
            type="button"
            onClick={connectMb}
            className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Connect MusicBrainz
          </button>
        </>
      )}
    </section>
  );
}
