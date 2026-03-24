import {
  clearMbAuth,
  clearMbClientSecret,
  getMbAuth,
  getMbClientId,
  getMbClientSecret,
  setMbAuth as storeMbAuth,
  setMbClientId,
  setMbClientSecret,
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
  clientId: string | null;
  clientSecret: string | null;
  setClientId: (id: string) => void;
  setClientSecret: (secret: string) => void;
  clearClientSecret: () => void;
}

const MbAuthContext = createContext<MbAuthContextValue | null>(null);

export function MbAuthProvider({ children }: { children: ReactNode }) {
  const [mbAuth, setMbAuthState] = useState<MbAuth | null>(null);
  const [clientId, setClientIdState] = useState<string | null>(null);
  const [clientSecret, setClientSecretState] = useState<string | null>(null);

  useEffect(() => {
    setMbAuthState(getMbAuth());
    setClientIdState(getMbClientId());
    setClientSecretState(getMbClientSecret());
  }, []);

  function setMbAuth(next: MbAuth | null) {
    if (next) storeMbAuth(next);
    else clearMbAuth();
    setMbAuthState(next);
  }

  function setClientId(id: string) {
    setMbClientId(id);
    setClientIdState(id);
  }

  function setClientSecret(secret: string) {
    setMbClientSecret(secret);
    setClientSecretState(secret);
  }

  function clearClientSecret() {
    clearMbClientSecret();
    setClientSecretState(null);
  }

  return (
    <MbAuthContext
      value={{
        mbAuth,
        setMbAuth,
        clientId,
        clientSecret,
        setClientId,
        setClientSecret,
        clearClientSecret,
      }}
    >
      {children}
    </MbAuthContext>
  );
}

export function useMbAuth(): MbAuthContextValue {
  const ctx = useContext(MbAuthContext);
  if (!ctx) throw new Error("useMbAuth must be used within MbAuthProvider");
  return ctx;
}
