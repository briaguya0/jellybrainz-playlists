import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SettingsPanel } from "./SettingsPanel";

export default function Header() {
  const [panelOpen, setPanelOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // return focus to cog button when panel closes
  useEffect(() => {
    if (!panelOpen) buttonRef.current?.focus();
  }, [panelOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--stroke)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center py-3 sm:py-4">
        <h2 className="m-0">
          <Link
            to="/"
            search={{ playlist: undefined, overrides: undefined }}
            className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--text)] no-underline"
          >
            jellybrainz
          </Link>
        </h2>

        <div className="ml-auto">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-label="Open settings"
            className="rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)]"
          >
            <Settings size={18} />
          </button>
        </div>
      </nav>

      {panelOpen && <SettingsPanel onClose={() => setPanelOpen(false)} />}
    </header>
  );
}
