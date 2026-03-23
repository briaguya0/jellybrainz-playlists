import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	getJellyfinConfig,
	setJellyfinConfig as storeJellyfinConfig,
} from "../lib/config";
import { resolveUserId } from "../lib/jellyfin";
import type { JellyfinConfig } from "../lib/types";

export const Route = createFileRoute("/")({
	component: PlaylistsPage,
});

function SkeletonCard() {
	return (
		<div className="island-shell feature-card rounded-xl border p-5 animate-pulse">
			<div className="h-4 w-3/5 rounded-md bg-[var(--line)] mb-3" />
			<div className="h-3 w-2/5 rounded-md bg-[var(--line)]" />
		</div>
	);
}

function ConnectOverlay({
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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-base)]/60 backdrop-blur-sm">
			<div className="island-shell rounded-2xl p-8 w-full max-w-sm mx-4 rise-in">
				<h2 className="text-lg font-semibold text-[var(--sea-ink)] mb-1">
					Connect to Jellyfin
				</h2>
				<p className="text-sm text-[var(--sea-ink-soft)] mb-6">
					Enter your Jellyfin server URL and API key to browse your playlists.
				</p>
				<form onSubmit={handleConnect} className="flex flex-col gap-4">
					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
							Server URL
						</span>
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							required
							className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
							placeholder="http://localhost:8096"
						/>
					</label>
					<label className="flex flex-col gap-1.5">
						<span className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
							API Key
						</span>
						<input
							type="password"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							required
							className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] focus:ring-1 focus:ring-[var(--lagoon)]"
							placeholder="Paste your API key"
						/>
					</label>
					{error && (
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					)}
					<button
						type="submit"
						disabled={connecting}
						className="island-shell rounded-lg px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] hover:text-[var(--lagoon)] disabled:opacity-50"
					>
						{connecting ? "Connecting…" : "Connect"}
					</button>
				</form>
				<p className="mt-4 text-xs text-[var(--sea-ink-soft)]">
					Don&apos;t have a key?{" "}
					<a
						href="https://jellyfin.org/docs/general/networking/index.html"
						target="_blank"
						rel="noreferrer"
					>
						Learn how to generate one
					</a>
				</p>
			</div>
		</div>
	);
}

function PlaylistsPage() {
	const [jellyfinConfig, setJellyfinConfig] = useState<JellyfinConfig | null>(
		null,
	);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setJellyfinConfig(getJellyfinConfig());
		setHydrated(true);
	}, []);

	const showOverlay = hydrated && !jellyfinConfig;

	return (
		<main className="page-wrap px-4 pb-8 pt-14 relative">
			{showOverlay && (
				<ConnectOverlay onConnected={(cfg) => setJellyfinConfig(cfg)} />
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
					<SkeletonCard key={i} />
				))}
			</div>
		</main>
	);
}
