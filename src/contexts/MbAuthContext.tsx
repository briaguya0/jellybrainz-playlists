import {
  clearMbAuth,
  getMbAuth,
  setMbAuth as storeMbAuth,
} from "@src/lib/config";
import type { MbAuth } from "@src/lib/types";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface MbAuthContextValue {
  mbAuth: MbAuth | null;
  setMbAuth: (auth: MbAuth | null) => void;
}

const MbAuthContext = createContext<MbAuthContextValue | null>(null);

export function MbAuthProvider({ children }: { children: ReactNode }) {
  const [mbAuth, setMbAuthState] = useState<MbAuth | null>(null);

  useEffect(() => {
    setMbAuthState(getMbAuth());
  }, []);

  function setMbAuth(next: MbAuth | null) {
    if (next) storeMbAuth(next);
    else clearMbAuth();
    setMbAuthState(next);
  }

  return (
    <MbAuthContext value={{ mbAuth, setMbAuth }}>{children}</MbAuthContext>
  );
}

export function useMbAuth(): MbAuthContextValue {
  const ctx = useContext(MbAuthContext);
  if (!ctx) throw new Error("useMbAuth must be used within MbAuthProvider");
  return ctx;
}
