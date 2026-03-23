import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	ChevronDown,
	LayoutGrid,
	List,
	Music,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	getJellyfinConfig,
	getMbAuth,
	setJellyfinConfig as storeJellyfinConfig,
} from "../lib/config";
import {
	extractMbRecordingId,
	fetchPlaylists,
	fetchPlaylistTracks,
	playlistThumbnailUrl,
	resolveUserId,
	thumbnailUrl,
	ticksToDisplay,
} from "../lib/jellyfin";
import {
	addRecordingsToCollection,
	createCollection,
	fetchCollections,
	fetchRecording,
	formatArtistCredits,
	msToDisplay,
} from "../lib/musicbrainz";
import { buildAuthUrl, generatePkce } from "../lib/oauth";
import type {
	JellyfinConfig,
	JellyfinPlaylist,
	JellyfinTrack,
	MbAuth,
	MbCollection,
} from "../lib/types";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>) => ({
		playlist: typeof search.playlist === "string" ? search.playlist : undefined,
	}),
	component: PlaylistsPage,
});

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
	return (
		<div className="island-shell feature-card rounded-xl border p-5 animate-pulse">
			<div className="h-4 w-3/5 rounded-md bg-[var(--line)] mb-3" />
			<div className="h-3 w-2/5 rounded-md bg-[var(--line)]" />
		</div>
	);
}

// ─── connect form ─────────────────────────────────────────────────────────────

function ConnectForm({
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
				Find your API key in the Jellyfin admin dashboard under{" "}
				<strong>Administration → API Keys</strong>.
			</p>
		</div>
	);
}

// ─── playlist card / row ─────────────────────────────────────────────────────

function PlaylistCard({
	playlist,
	cfg,
	selected,
	disabled,
	onClick,
}: {
	playlist: JellyfinPlaylist;
	cfg: JellyfinConfig;
	selected: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	const imgUrl = playlistThumbnailUrl(cfg, playlist);
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={disabled ? { filter: "grayscale(1) opacity(0.45)", cursor: "not-allowed" } : undefined}
			className={`island-shell feature-card rounded-xl border p-4 text-left w-full rise-in flex items-center gap-3 cursor-pointer ${
				selected
					? "border-[var(--lagoon)] ring-2 ring-[var(--lagoon)]/30"
					: "border-[var(--line)]"
			}`}
		>
			{imgUrl ? (
				<img
					src={imgUrl}
					alt=""
					className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[var(--line)]"
					loading="lazy"
				/>
			) : (
				<div className="w-12 h-12 rounded-lg shrink-0 bg-[var(--line)]" />
			)}
			<div className="min-w-0">
				<p className="font-semibold text-[var(--sea-ink)] truncate">
					{playlist.Name}
				</p>
				{playlist.ChildCount != null && (
					<p className="text-xs text-[var(--sea-ink-soft)] mt-0.5">
						{playlist.ChildCount} tracks
					</p>
				)}
			</div>
		</button>
	);
}

function PlaylistRow({
	playlist,
	selected,
	disabled,
	onClick,
}: {
	playlist: JellyfinPlaylist;
	selected: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={disabled ? { filter: "grayscale(1) opacity(0.45)", cursor: "not-allowed" } : undefined}
			className={`island-shell feature-card rounded-lg border px-4 py-3 text-left w-full rise-in flex items-center gap-4 cursor-pointer ${
				selected
					? "border-[var(--lagoon)] ring-2 ring-[var(--lagoon)]/30"
					: "border-[var(--line)]"
			}`}
		>
			<span className="font-semibold text-[var(--sea-ink)] flex-1 truncate">
				{playlist.Name}
			</span>
			{playlist.ChildCount != null && (
				<span className="text-xs text-[var(--sea-ink-soft)] shrink-0">
					{playlist.ChildCount} tracks
				</span>
			)}
		</button>
	);
}

// ─── diagnostic popover ──────────────────────────────────────────────────────

function DiagnosticPopover({
	track,
	mbError,
}: {
	track: JellyfinTrack;
	mbError?: Error | null;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function close(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	return (
		<div ref={ref} className="relative inline-block">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="text-xs font-mono text-[var(--sea-ink-soft)] border border-[var(--line)] rounded px-1 leading-4 hover:border-[var(--lagoon)] hover:text-[var(--lagoon-deep)]"
				aria-label="Show diagnostic info"
			>
				?
			</button>
			{open && (
				<div className="absolute left-0 top-full mt-1 z-40 island-shell rounded-lg border border-[var(--line)] p-3 w-72 text-xs rise-in">
					{mbError ? (
						<>
							<p className="font-semibold text-[var(--sea-ink)] mb-1">
								MusicBrainz lookup failed
							</p>
							<p className="text-[var(--sea-ink-soft)]">{mbError.message}</p>
						</>
					) : (
						<>
							<p className="font-semibold text-[var(--sea-ink)] mb-1">
								No MusicBrainz recording ID
							</p>
							<p className="text-[var(--sea-ink-soft)] mb-2">
								Raw <code className="text-[0.8em]">ProviderIds</code> from
								Jellyfin:
							</p>
							<pre className="bg-[var(--surface)] rounded p-2 overflow-x-auto text-[0.75rem] text-[var(--sea-ink)]">
								{JSON.stringify(track.ProviderIds ?? null, null, 2)}
							</pre>
						</>
					)}
				</div>
			)}
		</div>
	);
}

// ─── track table row ─────────────────────────────────────────────────────────

function TrackTableRow({
	track,
	cfg,
}: {
	track: JellyfinTrack;
	cfg: JellyfinConfig;
}) {
	const mbid = extractMbRecordingId(track);

	const {
		data: recording,
		isPending: mbPending,
		isError: mbIsError,
		error: mbFetchError,
	} = useQuery({
		queryKey: ["mb-recording", mbid],
		queryFn: () => fetchRecording(mbid as string),
		enabled: !!mbid,
		staleTime: Number.POSITIVE_INFINITY,
	});

	const matched = !!mbid && !mbIsError;

	return (
		<tr className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface)]/40">
			{/* Jellyfin: thumbnail + title/artist */}
			<td className="px-4 py-3">
				<div className="flex items-center gap-3 min-w-0">
					<img
						src={thumbnailUrl(cfg, track)}
						alt=""
						className="w-10 h-10 rounded shrink-0 bg-[var(--line)] object-cover"
						loading="lazy"
					/>
					<div className="min-w-0">
						<p className="text-sm font-medium text-[var(--sea-ink)] truncate">
							{track.Name}
						</p>
						<p className="text-xs text-[var(--sea-ink-soft)] truncate">
							{track.Artists?.join(", ") ?? ""}
						</p>
					</div>
				</div>
			</td>
			{/* Jellyfin: duration */}
			<td className="px-4 py-3 whitespace-nowrap">
				<span className="text-xs tabular-nums text-[var(--sea-ink-soft)]">
					{track.RunTimeTicks != null
						? ticksToDisplay(track.RunTimeTicks)
						: "—"}
				</span>
			</td>
			{/* Link indicator */}
			<td className="px-4 py-3 w-12 text-center">
				{matched ? (
					<ArrowRight size={16} className="text-[var(--lagoon-deep)] mx-auto" />
				) : (
					<span className="flex items-center justify-center gap-1">
						<X size={14} className="text-[var(--sea-ink-soft)] shrink-0" />
						<DiagnosticPopover
							track={track}
							mbError={mbIsError ? (mbFetchError as Error) : null}
						/>
					</span>
				)}
			</td>
			{/* MB: title/artist/releases */}
			<td className="px-4 py-3">
				{mbid && mbPending && (
					<div className="animate-pulse">
						<div className="h-3 w-32 rounded bg-[var(--line)] mb-1.5" />
						<div className="h-2.5 w-20 rounded bg-[var(--line)]" />
					</div>
				)}
				{recording && (
					<div className="flex items-center gap-2 min-w-0">
						<Music
							size={14}
							className="text-[var(--lagoon-deep)] shrink-0 mt-0.5"
						/>
						<div className="min-w-0 flex-1">
							<a
								href={`https://musicbrainz.org/recording/${recording.id}`}
								target="_blank"
								rel="noreferrer"
								className="text-sm font-medium truncate block"
							>
								{recording.title}
							</a>
							<p className="text-xs text-[var(--sea-ink-soft)] truncate">
								{formatArtistCredits(recording["artist-credit"])}
							</p>
						</div>
						{recording.releases != null && recording.releases.length > 0 && (
							<span className="text-xs text-[var(--sea-ink-soft)] shrink-0 border border-[var(--line)] rounded px-1.5 py-0.5">
								{recording.releases.length}
							</span>
						)}
					</div>
				)}
			</td>
			{/* MB: duration */}
			<td className="px-4 py-3 whitespace-nowrap">
				{recording?.length != null && (
					<span className="text-xs tabular-nums text-[var(--sea-ink-soft)]">
						{msToDisplay(recording.length)}
					</span>
				)}
			</td>
		</tr>
	);
}

// ─── sync dropdown ────────────────────────────────────────────────────────────

type SyncState =
	| { phase: "idle" }
	| { phase: "progress"; added: number; total: number }
	| { phase: "done"; collectionId: string }
	| { phase: "error"; message: string };

function SyncDropdown({
	mbAuth,
	playlistName,
	matchedMbids,
}: {
	mbAuth: MbAuth | null;
	playlistName: string;
	matchedMbids: string[];
}) {
	const [open, setOpen] = useState(false);
	const [syncState, setSyncState] = useState<SyncState>({ phase: "idle" });
	const [collections, setCollections] = useState<MbCollection[] | null>(null);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function close(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	useEffect(() => {
		if (open && mbAuth && !collections) {
			fetchCollections(mbAuth.username, mbAuth.accessToken).then(
				setCollections,
				() => {},
			);
		}
	}, [open, mbAuth, collections]);

	async function startOAuth() {
		const clientId = import.meta.env.VITE_MB_CLIENT_ID as string | undefined;
		if (!clientId) return;
		const { codeVerifier, codeChallenge } = await generatePkce();
		sessionStorage.setItem("mb_pkce_verifier", codeVerifier);
		const redirectUri = `${window.location.origin}/mb-callback`;
		window.location.href = buildAuthUrl(clientId, redirectUri, codeChallenge);
	}

	async function exportToNew() {
		if (!mbAuth || matchedMbids.length === 0) return;
		setSyncState({ phase: "progress", added: 0, total: matchedMbids.length });
		try {
			const collId = await createCollection(playlistName, mbAuth.accessToken);
			if (!collId) {
				setSyncState({
					phase: "error",
					message:
						"Collection creation is not supported by this MusicBrainz server (endpoint returned 404/405). Create a collection manually and use \u201cExport to existing collection\u201d.",
				});
				return;
			}
			await addRecordingsToCollection(collId, matchedMbids, mbAuth.accessToken);
			setSyncState({ phase: "done", collectionId: collId });
		} catch (err) {
			setSyncState({
				phase: "error",
				message: err instanceof Error ? err.message : "Sync failed",
			});
		}
	}

	async function exportToExisting(collection: MbCollection) {
		if (!mbAuth || matchedMbids.length === 0) return;
		setSyncState({ phase: "progress", added: 0, total: matchedMbids.length });
		try {
			await addRecordingsToCollection(
				collection.id,
				matchedMbids,
				mbAuth.accessToken,
			);
			setSyncState({ phase: "done", collectionId: collection.id });
		} catch (err) {
			setSyncState({
				phase: "error",
				message: err instanceof Error ? err.message : "Sync failed",
			});
		}
	}

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => {
					setOpen((v) => !v);
					if (syncState.phase === "done" || syncState.phase === "error") {
						setSyncState({ phase: "idle" });
					}
				}}
				className="island-shell flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--lagoon-deep)] hover:text-[var(--lagoon)]"
			>
				<Music size={14} />
				Sync
				<ChevronDown size={14} />
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-1 z-40 island-shell rounded-xl border border-[var(--line)] p-4 w-72 rise-in">
					{!mbAuth ? (
						<>
							<p className="text-sm text-[var(--sea-ink-soft)] mb-3">
								Log in to MusicBrainz to sync this playlist.
							</p>
							<button
								type="button"
								onClick={startOAuth}
								className="w-full island-shell rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--lagoon-deep)] hover:text-[var(--lagoon)]"
							>
								Connect MusicBrainz
							</button>
						</>
					) : syncState.phase === "progress" ? (
						<p className="text-sm text-[var(--sea-ink-soft)]">
							Adding {syncState.total} recordings…
						</p>
					) : syncState.phase === "done" ? (
						<>
							<p className="text-sm font-semibold text-[var(--sea-ink)] mb-2">
								Sync complete
							</p>
							<a
								href={`https://musicbrainz.org/collection/${syncState.collectionId}`}
								target="_blank"
								rel="noreferrer"
								className="text-sm"
							>
								View collection on MusicBrainz →
							</a>
						</>
					) : syncState.phase === "error" ? (
						<p className="text-sm text-red-600 dark:text-red-400">
							{syncState.message}
						</p>
					) : (
						<>
							<p className="text-xs text-[var(--sea-ink-soft)] mb-3">
								Syncing {matchedMbids.length} matched recording
								{matchedMbids.length === 1 ? "" : "s"} as {mbAuth.username}
							</p>
							<button
								type="button"
								onClick={exportToNew}
								className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--surface)] text-[var(--sea-ink)]"
							>
								Export to new collection
							</button>
							{collections && collections.length > 0 && (
								<>
									<hr className="border-[var(--line)] my-2" />
									<p className="text-xs text-[var(--sea-ink-soft)] mb-1 px-1">
										Export to existing collection
									</p>
									<div className="max-h-48 overflow-y-auto">
										{collections
											.filter((c) => c["entity-type"] === "recording")
											.map((c) => (
												<button
													key={c.id}
													type="button"
													onClick={() => exportToExisting(c)}
													className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--surface)] text-[var(--sea-ink)] truncate"
												>
													{c.name}
												</button>
											))}
									</div>
								</>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

// ─── track section ────────────────────────────────────────────────────────────

function TrackSection({
	cfg,
	playlistId,
	playlistName,
}: {
	cfg: JellyfinConfig;
	playlistId: string;
	playlistName: string;
}) {
	const [mbAuth, setMbAuth] = useState<MbAuth | null>(null);
	useEffect(() => {
		setMbAuth(getMbAuth());
	}, []);

	const {
		data: tracks,
		isPending,
		isError,
		error,
	} = useQuery({
		queryKey: ["playlist-tracks", playlistId, cfg],
		queryFn: () => {
			if (!cfg.userId) throw new Error("No userId");
			return fetchPlaylistTracks(cfg, cfg.userId, playlistId);
		},
		enabled: !!cfg.userId,
	});

	const matchedMbids = (tracks ?? [])
		.map(extractMbRecordingId)
		.filter((id): id is string => id != null);

	return (
		<section className="mt-10 rise-in">
			<div className="flex items-center justify-between mb-3">
				<div>
					<h2 className="text-base font-semibold text-[var(--sea-ink)]">
						{playlistName}
					</h2>
					{tracks && (
						<p className="text-xs text-[var(--sea-ink-soft)]">
							{matchedMbids.length}/{tracks.length} matched
						</p>
					)}
				</div>
				<SyncDropdown
					mbAuth={mbAuth}
					playlistName={playlistName}
					matchedMbids={matchedMbids}
				/>
			</div>

			{isError && (
				<p className="text-sm text-red-600 dark:text-red-400 mb-3">
					{error instanceof Error ? error.message : "Failed to load tracks"}
				</p>
			)}

			<div className="island-shell rounded-xl border border-[var(--line)] overflow-x-auto">
				<table className="w-full text-sm min-w-[640px]">
					<thead>
						<tr className="border-b border-[var(--line)]">
							<th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
								Track
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
								Duration
							</th>
							<th className="px-4 py-3 w-12" />
							<th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
								MusicBrainz
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wide">
								Duration
							</th>
						</tr>
					</thead>
					<tbody>
						{isPending
							? ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((k) => (
									<tr
										key={k}
										className="border-b border-[var(--line)] animate-pulse"
									>
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded bg-[var(--line)]" />
												<div>
													<div className="h-3 w-32 rounded bg-[var(--line)] mb-1.5" />
													<div className="h-2.5 w-20 rounded bg-[var(--line)]" />
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="h-3 w-8 rounded bg-[var(--line)]" />
										</td>
										<td className="px-4 py-3" />
										<td className="px-4 py-3" />
										<td className="px-4 py-3" />
									</tr>
								))
							: tracks?.map((track) => (
									<TrackTableRow key={track.Id} track={track} cfg={cfg} />
								))}
					</tbody>
				</table>
			</div>
		</section>
	);
}

// ─── main page ────────────────────────────────────────────────────────────────

function PlaylistsPage() {
	const navigate = useNavigate({ from: "/" });
	const { playlist: selectedId } = Route.useSearch();

	const [jellyfinConfig, setJellyfinConfig] = useState<JellyfinConfig | null>(
		null,
	);
	const [hydrated, setHydrated] = useState(false);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [page, setPage] = useState(0);
	const PAGE_SIZE = 12;

	useEffect(() => {
		setJellyfinConfig(getJellyfinConfig());
		setHydrated(true);
	}, []);

	const {
		data: playlists,
		isPending,
		isError,
		error,
	} = useQuery({
		queryKey: ["playlists", jellyfinConfig],
		queryFn: () => {
			if (!jellyfinConfig?.userId) throw new Error("No config");
			return fetchPlaylists(jellyfinConfig, jellyfinConfig.userId);
		},
		enabled: !!jellyfinConfig?.userId,
	});

	function selectPlaylist(id: string) {
		navigate({ search: { playlist: id }, replace: true });
	}

	const showConnect = hydrated && !jellyfinConfig;
	const showSkeletons = !hydrated || (!!jellyfinConfig && isPending);

	const sortedPlaylists = playlists?.slice().sort((a, b) => {
		const aEmpty = (a.ChildCount ?? 0) === 0;
		const bEmpty = (b.ChildCount ?? 0) === 0;
		return Number(aEmpty) - Number(bEmpty);
	});
	const totalPages = Math.ceil((sortedPlaylists?.length ?? 0) / PAGE_SIZE);
	const visiblePlaylists = sortedPlaylists?.slice(
		page * PAGE_SIZE,
		(page + 1) * PAGE_SIZE,
	);

	const selectedPlaylist = playlists?.find((p) => p.Id === selectedId);

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			{showConnect ? (
				<ConnectForm onConnected={(cfg) => setJellyfinConfig(cfg)} />
			) : (
				<>
					<div className="flex items-center justify-between mb-5">
						<h1 className="text-xl font-semibold text-[var(--sea-ink)]">
							Playlists
						</h1>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								aria-label="Grid view"
								className={`p-2 rounded-lg border ${
									viewMode === "grid"
										? "island-shell border-[var(--lagoon)] text-[var(--lagoon-deep)]"
										: "border-transparent text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
								}`}
							>
								<LayoutGrid size={16} />
							</button>
							<button
								type="button"
								onClick={() => setViewMode("list")}
								aria-label="List view"
								className={`p-2 rounded-lg border ${
									viewMode === "list"
										? "island-shell border-[var(--lagoon)] text-[var(--lagoon-deep)]"
										: "border-transparent text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
								}`}
							>
								<List size={16} />
							</button>
						</div>
					</div>

					{isError && (
						<p className="text-sm text-red-600 dark:text-red-400 mb-4">
							{error instanceof Error
								? error.message
								: "Failed to load playlists"}
						</p>
					)}

					{viewMode === "grid" ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{showSkeletons
								? Array.from({ length: 6 }, (_, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
										<SkeletonCard key={i} />
									))
								: visiblePlaylists?.map((pl) => (
										<PlaylistCard
											key={pl.Id}
											playlist={pl}
											cfg={jellyfinConfig}
											selected={pl.Id === selectedId}
											disabled={(pl.ChildCount ?? 0) === 0}
											onClick={() => selectPlaylist(pl.Id)}
										/>
									))}
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{showSkeletons
								? Array.from({ length: 6 }, (_, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
										<SkeletonCard key={i} />
									))
								: visiblePlaylists?.map((pl) => (
										<PlaylistRow
											key={pl.Id}
											playlist={pl}
											selected={pl.Id === selectedId}
											disabled={(pl.ChildCount ?? 0) === 0}
											onClick={() => selectPlaylist(pl.Id)}
										/>
									))}
						</div>
					)}

					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-4">
							<button
								type="button"
								onClick={() => setPage((p) => p - 1)}
								disabled={page === 0}
								className="island-shell rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] disabled:opacity-30"
							>
								← Prev
							</button>
							<span className="text-xs text-[var(--sea-ink-soft)]">
								{page + 1} / {totalPages}
							</span>
							<button
								type="button"
								onClick={() => setPage((p) => p + 1)}
								disabled={page >= totalPages - 1}
								className="island-shell rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] disabled:opacity-30"
							>
								Next →
							</button>
						</div>
					)}
				</>
			)}

			{jellyfinConfig && selectedId && selectedPlaylist && (
				<TrackSection
					cfg={jellyfinConfig}
					playlistId={selectedId}
					playlistName={selectedPlaylist.Name}
				/>
			)}
		</main>
	);
}
