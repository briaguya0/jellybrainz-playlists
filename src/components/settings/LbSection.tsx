import { useLbAuth } from "@src/contexts/LbAuthContext";
import { fetchLbUsername } from "@src/lib/listenbrainz";
import { getErrorMessage } from "@src/lib/utils";
import { useState } from "react";

export function LbSection() {
  const { lbAuth, setLbAuth } = useLbAuth();
  const [tokenDraft, setTokenDraft] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!tokenDraft.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const username = await fetchLbUsername(tokenDraft.trim());
      setLbAuth({ token: tokenDraft.trim(), username });
      setTokenDraft("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to connect"));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-3">
        ListenBrainz
      </p>
      {lbAuth ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-app-text truncate">
            Connected as{" "}
            <a
              href={`https://listenbrainz.org/user/${lbAuth.username}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold"
            >
              {lbAuth.username}
            </a>
          </p>
          <button
            type="button"
            onClick={() => setLbAuth(null)}
            className="shrink-0 text-sm text-app-muted hover:text-app-text underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <label className="block text-xs text-app-muted mb-1">
            User token{" "}
            <a
              href="https://listenbrainz.org/profile/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-app-text"
            >
              ↗
            </a>
          </label>
          <input
            type="password"
            value={tokenDraft}
            onChange={(e) => setTokenDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            className="w-full rounded-lg border border-stroke bg-surface px-3 py-1.5 text-sm text-app-text mb-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>
          )}
          <button
            type="button"
            onClick={connect}
            disabled={!tokenDraft.trim() || connecting}
            className="w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white enabled:hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "Connect ListenBrainz"}
          </button>
        </>
      )}
    </section>
  );
}
