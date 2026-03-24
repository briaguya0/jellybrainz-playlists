import { JellyfinSection } from "@src/components/settings/JellyfinSection";
import { MbSection } from "@src/components/settings/MbSection";
import { ThemeSection } from "@src/components/settings/ThemeSection";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
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
          <ThemeSection />
          <JellyfinSection />
          <MbSection />
        </div>
      </div>
    </>,
    document.body,
  );
}
