import { clearLbAuth, getLbAuth, setLbAuth as storeLbAuth } from "@src/lib/config";
import type { LbAuth } from "@src/lib/types";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface LbAuthContextValue {
  lbAuth: LbAuth | null;
  setLbAuth: (auth: LbAuth | null) => void;
}

const LbAuthContext = createContext<LbAuthContextValue | null>(null);

export function LbAuthProvider({ children }: { children: ReactNode }) {
  const [lbAuth, setLbAuthState] = useState<LbAuth | null>(null);

  useEffect(() => {
    setLbAuthState(getLbAuth());
  }, []);

  function setLbAuth(next: LbAuth | null) {
    if (next) storeLbAuth(next);
    else clearLbAuth();
    setLbAuthState(next);
  }

  return (
    <LbAuthContext value={{ lbAuth, setLbAuth }}>{children}</LbAuthContext>
  );
}

export function useLbAuth(): LbAuthContextValue {
  const ctx = useContext(LbAuthContext);
  if (!ctx) throw new Error("useLbAuth must be used within LbAuthProvider");
  return ctx;
}
