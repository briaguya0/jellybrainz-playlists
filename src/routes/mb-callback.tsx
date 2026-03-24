import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setMbAuth } from "../lib/config";
import { exchangeCode, fetchMbUsername } from "../lib/oauth";
import { getErrorMessage } from "../lib/utils";

export const Route = createFileRoute("/mb-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: MbCallbackPage,
});

function MbCallbackPage() {
  const navigate = useNavigate();
  const { code, error: oauthError } = Route.useSearch();
  const [status, setStatus] = useState<"pending" | "error">("pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (oauthError) {
      setErrorMsg(`Authorization denied: ${oauthError}`);
      setStatus("error");
      return;
    }
    if (!code) {
      setErrorMsg("No authorization code in callback URL.");
      setStatus("error");
      return;
    }

    const codeVerifier = sessionStorage.getItem("mb_pkce_verifier");
    const clientId = import.meta.env.VITE_MB_CLIENT_ID as string | undefined;
    const redirectUri = `${window.location.origin}/mb-callback`;

    if (!codeVerifier) {
      setErrorMsg("PKCE verifier missing from session. Please try again.");
      setStatus("error");
      return;
    }
    if (!clientId) {
      setErrorMsg(
        "VITE_MB_CLIENT_ID is not set. See .env.example for instructions.",
      );
      setStatus("error");
      return;
    }

    (async () => {
      try {
        const accessToken = await exchangeCode(
          code,
          codeVerifier,
          clientId,
          redirectUri,
        );
        const username = await fetchMbUsername(accessToken);
        setMbAuth({ accessToken, username });
        sessionStorage.removeItem("mb_pkce_verifier");
        navigate({
          to: "/",
          search: { playlist: undefined, overrides: undefined },
        });
      } catch (err) {
        setErrorMsg(getErrorMessage(err, "Failed to complete OAuth flow"));
        setStatus("error");
      }
    })();
  }, [code, oauthError, navigate]);

  if (status === "error") {
    return (
      <main className="page-wrap px-4 pb-8 pt-14 flex flex-col items-center gap-4">
        <div className="island-shell rounded-xl border border-[var(--stroke)] p-8 max-w-md w-full text-center rise-in">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
            Connection failed
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">{errorMsg}</p>
          <a
            href="/"
            className="text-sm font-semibold text-[var(--accent-text)]"
          >
            ← Back to playlists
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14 flex flex-col items-center gap-4">
      <div className="island-shell rounded-xl border border-[var(--stroke)] p-8 max-w-md w-full text-center rise-in">
        <p className="text-sm text-[var(--text-muted)]">
          Connecting to MusicBrainz…
        </p>
      </div>
    </main>
  );
}
