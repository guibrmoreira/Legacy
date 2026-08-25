import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  isAdmin: boolean;
  /** true enquanto restauramos a sessão / verificamos permissões */
  loading: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"unknown" | "yes" | "no">("unknown");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setAdminStatus("no");
      return;
    }
    setAdminStatus("unknown");
    supabase
      .rpc("bf_is_admin")
      .then(({ data }) => {
        if (!cancelled) setAdminStatus(data ? "yes" : "no");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("E-mail ou senha incorretos.");
      }
      throw new Error(error.message);
    }
    const { data: isAdminData } = await supabase.rpc("bf_is_admin");
    if (!isAdminData) {
      await supabase.auth.signOut();
      throw new Error("Este usuário não tem acesso ao painel administrativo.");
    }
    setSession(data.session);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const displayName = useMemo(() => {
    const raw = (session?.user.user_metadata?.name as string | undefined) ?? "Wesley";
    return raw.split(" ")[0];
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAdmin: adminStatus === "yes",
      loading: !ready || (session !== null && adminStatus === "unknown"),
      displayName,
      signIn,
      signOut,
    }),
    [session, adminStatus, ready, displayName, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
