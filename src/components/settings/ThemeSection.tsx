import { useThemeMode } from "@src/hooks/useThemeMode";

const THEME_OPTIONS: { value: "light" | "dark" | "auto"; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];

export function ThemeSection() {
  const { mode, setAndApply } = useThemeMode();

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-2">
        Theme
      </p>
      <div className="flex rounded-lg border border-stroke overflow-hidden">
        {THEME_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setAndApply(value)}
            className={`flex-1 py-1.5 text-sm font-semibold transition-colors ${
              mode === value
                ? "bg-[var(--accent)] text-white"
                : "text-app-muted hover:text-app-text hover:bg-hover"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
