import { useState } from "react";
import { setJellyfinConfig as storeJellyfinConfig } from "../../../../lib/config";
import { resolveUserId } from "../../../../lib/jellyfin";
import type { JellyfinConfig } from "../../../../lib/types";

export function ConnectForm({
  onConnected,
}: {
  onConnected: (cfg: JellyfinConfig) => void;
}) {
  const [url, setUrl] = useState("http://localhost:8096");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      const cfg: JellyfinConfig = { url, apiKey };
      const userId = await resolveUserId(cfg);
      const cfgWithUser: JellyfinConfig = { ...cfg, userId };
      storeJellyfinConfig(cfgWithUser);
      onConnected(cfgWithUser);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to Jellyfin",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="island-shell rounded-2xl p-8 w-full max-w-sm rise-in">
      <h2 className="text-lg font-semibold text-[var(--text)] mb-1">
        Connect to Jellyfin
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Enter your Jellyfin server URL and API key to browse your playlists.
      </p>
      <form onSubmit={handleConnect} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Server URL
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            placeholder="http://localhost:8096"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            API Key
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            className="rounded-lg border border-[var(--stroke)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            placeholder="Paste your API key"
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={connecting}
          className="island-shell rounded-lg px-4 py-2 text-sm font-semibold text-[var(--accent-text)] enabled:hover:text-[var(--text)] disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      </form>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Find your API key in the Jellyfin admin dashboard under{" "}
        <strong>Administration → API Keys</strong>.
      </p>
    </div>
  );
}
