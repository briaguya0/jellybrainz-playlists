import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  clearMbAuth,
  getJellyfinConfig,
  getMbAuth,
  setJellyfinConfig,
} from "../lib/config";
import { resolveUserId } from "../lib/jellyfin";
import { buildAuthUrl, generatePkce } from "../lib/oauth";
import type { JellyfinConfig, MbAuth } from "../lib/types";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [jellyfinConfig, setJellyfinConfigState] =
    useState<JellyfinConfig | null>(null);
  const [mbAuth, setMbAuthState] = useState<MbAuth | null>(null);

  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const cfg = getJellyfinConfig();
    const auth = getMbAuth();
    setJellyfinConfigState(cfg);
    setMbAuthState(auth);
    if (cfg) {
      setUrl(cfg.url);
      setApiKey(cfg.apiKey);
    }
  }, []);

  async function saveJellyfin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const cfg: JellyfinConfig = { url, apiKey };
      const userId = await resolveUserId(cfg);
      const updated: JellyfinConfig = { ...cfg, userId };
      setJellyfinConfig(updated);
      setJellyfinConfigState(updated);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to connect to Jellyfin",
      );
    } finally {
      setSaving(false);
    }
  }

  async function connectMb() {
    const clientId = import.meta.env.VITE_MB_CLIENT_ID as string | undefined;
    if (!clientId) return;
    const { codeVerifier, codeChallenge } = await generatePkce();
    sessionStorage.setItem("mb_pkce_verifier", codeVerifier);
    const redirectUri = `${window.location.origin}/mb-callback`;
    window.location.href = buildAuthUrl(clientId, redirectUri, codeChallenge);
  }

  function disconnectMb() {
    clearMbAuth();
    setMbAuthState(null);
  }

  const clientId = import.meta.env.VITE_MB_CLIENT_ID as string | undefined;

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <h1 className="text-xl font-semibold text-[var(--text)] mb-8">
        Settings
      </h1>

      {/* Jellyfin section */}
      <section className="island-shell rounded-xl border border-[var(--stroke)] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">
          Jellyfin
        </h2>
        {!jellyfinConfig && (
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Not connected. Go to{" "}
            <a href="/" className="underline">
              Playlists
            </a>{" "}
            to connect.
          </p>
        )}
        <form onSubmit={saveJellyfin} className="flex flex-col gap-4 max-w-sm">
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
          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-sm text-[var(--accent-text)]">Saved.</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="island-shell rounded-lg px-4 py-2 text-sm font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] disabled:opacity-50 self-start"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      {/* MusicBrainz section */}
      <section className="island-shell rounded-xl border border-[var(--stroke)] p-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">
          MusicBrainz
        </h2>
        {!clientId ? (
          <p className="text-xs text-[var(--text-muted)]">
            <code>VITE_MB_CLIENT_ID</code> is not set. See{" "}
            <code>.env.example</code> for instructions on registering an OAuth
            application.
          </p>
        ) : mbAuth ? (
          <div className="flex items-center gap-4">
            <p className="text-sm text-[var(--text)]">
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
              onClick={disconnectMb}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] underline"
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
              className="island-shell rounded-lg border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] hover:text-[var(--accent)]"
            >
              Connect MusicBrainz
            </button>
          </>
        )}
      </section>
    </main>
  );
}
