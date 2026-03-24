import { useJellyfin } from "@src/contexts/JellyfinContext";
import { resolveUserId } from "@src/lib/jellyfin";
import type { JellyfinConfig } from "@src/lib/types";
import { getErrorMessage } from "@src/lib/utils";
import { useEffect, useState } from "react";

export function JellyfinSection() {
  const { cfg, setCfg } = useJellyfin();

  const [url, setUrl] = useState(cfg?.url ?? "");
  const [apiKey, setApiKey] = useState(cfg?.apiKey ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Populate form fields once the config hydrates from localStorage.
  useEffect(() => {
    if (cfg) {
      setUrl(cfg.url);
      setApiKey(cfg.apiKey);
    }
  }, [cfg]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const draft: JellyfinConfig = { url, apiKey };
      const userId = await resolveUserId(draft);
      setCfg({ ...draft, userId });
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to connect to Jellyfin"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-3">
        Jellyfin
      </p>
      {!cfg && (
        <p className="text-xs text-app-muted mb-3">
          Not connected yet — configure below to get started.
        </p>
      )}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-app-muted">Server URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="http://localhost:8096"
            className="rounded-lg border-2 border-stroke bg-hover px-3 py-2 text-sm text-app-text outline-none placeholder:text-app-muted focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-app-muted">API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            placeholder="Paste your API key"
            className="rounded-lg border-2 border-stroke bg-hover px-3 py-2 text-sm text-app-text outline-none placeholder:text-app-muted focus:border-[var(--accent)]"
          />
        </label>
        {saveError && (
          <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
        )}
        {saveSuccess && <p className="text-xs text-accent-text">Saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white enabled:hover:opacity-90 disabled:opacity-50 self-start"
        >
          {saving ? "Saving…" : cfg ? "Save" : "Connect"}
        </button>
      </form>
    </section>
  );
}
