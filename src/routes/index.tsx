import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: () => <main className="page-wrap px-4 pb-8 pt-14" />,
});
