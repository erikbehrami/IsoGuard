import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/api/authApi";
import { configureHttp } from "@/api/client";
import type { AuthUser } from "@/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  mfaPending: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ mfaRequired: boolean; user: AuthUser | null }>;
  verifyMfa: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const session = authApi.readSession();
      setMfaPending(Boolean(session?.mfaPending));
      const current = await authApi.currentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    configureHttp({
      getToken: authApi.getAccessToken,
      onUnauthorized: () => {
        void authApi.signOut();
        setUser(null);
        setMfaPending(false);
      },
    });
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mfaPending,
      setUser,
      refresh,
      signIn: async (email, password) => {
        const session = await authApi.signIn(email, password);
        setMfaPending(session.mfaPending);
        let current: AuthUser | null;
        try {
          current = await authApi.currentUser();
        } catch (error) {
          await authApi.signOut().catch(() => undefined);
          setUser(null);
          setMfaPending(false);
          throw error;
        }
        if (current?.status === "BLOCKED") {
          await authApi.signOut();
          setUser(null);
          setMfaPending(false);
          throw {
            status: 403,
            message: "Your account has been blocked. Contact an administrator for assistance.",
          };
        }
        setUser(current);
        return { mfaRequired: session.mfaPending, user: current };
      },
      verifyMfa: async (code) => {
        await authApi.verifyMfa(code);
        setMfaPending(false);
        await refresh();
      },
      signOut: async () => {
        await authApi.signOut();
        setUser(null);
        setMfaPending(false);
      },
    }),
    [user, loading, mfaPending, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
