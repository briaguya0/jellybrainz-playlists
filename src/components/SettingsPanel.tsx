import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  clearMbAuth,
  getJellyfinConfig,
  getMbAuth,
  setJellyfinConfig,
} from "../lib/config";
import { resolveUserId } from "../lib/jellyfin";
import { buildAuthUrl, generatePkce } from "../lib/oauth";
import type { JellyfinConfig, MbAuth } from "../lib/types";
import { getErrorMessage } from "../lib/utils";

// ─── theme logic ──────────────────────────────────────────────────────────────

type ThemeMode = "light" | "dark" | "auto";

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "auto")
    return stored;
  return "auto";
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);
  if (mode === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
  }
  document.documentElement.style.colorScheme = resolved;
}

function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const initial = getStoredMode();
    setMode(initial);
    applyThemeMode(initial);
  }, []);

  useEffect(() => {
    if (mode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  function setAndApply(next: ThemeMode) {
    setMode(next);
    applyThemeMode(next);
    window.localStorage.setItem("theme", next);
  }

  return { mode, setAndApply };
}

// ─── settings panel ───────────────────────────────────────────────────────────

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { mode, setAndApply } = useThemeMode();

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

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      setSaveError(getErrorMessage(err, "Failed to connect to Jellyfin"));
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
  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "auto", label: "Auto" },
  ];

  return createPortal(
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* panel */}
      <div
        role="dialog"
        aria-label="Settings"
        className="fixed right-0 top-0 z-50 flex h-full w-80 max-w-full flex-col island-shell border-l border-[var(--stroke)] shadow-2xl animate-slide-in-right overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--stroke)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          {/* Theme */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Theme
            </p>
            <div className="flex rounded-lg border border-[var(--stroke)] overflow-hidden">
              {themeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAndApply(value)}
                  className={`flex-1 py-1.5 text-sm font-semibold transition-colors ${
                    mode === value
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Jellyfin */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Jellyfin
            </p>
            {!jellyfinConfig && (
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Not connected yet — configure below to get started.
              </p>
            )}
            <form onSubmit={saveJellyfin} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-muted)]">
                  Server URL
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="http://localhost:8096"
                  className="rounded-lg border-2 border-[var(--stroke)] bg-[var(--hover-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-muted)]">
                  API Key
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  placeholder="Paste your API key"
                  className="rounded-lg border-2 border-[var(--stroke)] bg-[var(--hover-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </label>
              {saveError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="text-xs text-[var(--accent-text)]">Saved.</p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white enabled:hover:opacity-90 disabled:opacity-50 self-start"
              >
                {saving ? "Saving…" : jellyfinConfig ? "Save" : "Connect"}
              </button>
            </form>
          </section>

          {/* MusicBrainz */}
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
                  onClick={disconnectMb}
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
        </div>
      </div>
    </>,
    document.body,
  );
}
