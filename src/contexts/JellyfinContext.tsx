import { getJellyfinConfig, setJellyfinConfig } from "@src/lib/config";
import type { JellyfinConfig } from "@src/lib/types";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface JellyfinContextValue {
  cfg: JellyfinConfig | null;
  hydrated: boolean;
  setCfg: (cfg: JellyfinConfig | null) => void;
}

const JellyfinContext = createContext<JellyfinContextValue | null>(null);

export function JellyfinProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfgState] = useState<JellyfinConfig | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCfgState(getJellyfinConfig());
    setHydrated(true);
  }, []);

  function setCfg(next: JellyfinConfig | null) {
    if (next) setJellyfinConfig(next);
    setCfgState(next);
  }

  return (
    <JellyfinContext value={{ cfg, hydrated, setCfg }}>
      {children}
    </JellyfinContext>
  );
}

export function useJellyfin(): JellyfinContextValue {
  const ctx = useContext(JellyfinContext);
  if (!ctx) throw new Error("useJellyfin must be used within JellyfinProvider");
  return ctx;
}
