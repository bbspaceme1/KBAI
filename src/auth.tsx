import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  username: string | null;
  isAdmin: boolean;
  isAdvisor: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const fetchRoleAndProfile = async (user: User) => {
    // Try to get roles from JWT claims first (more efficient)
    const claims = user.app_metadata as { roles?: string[] } | undefined;
    const jwtRoles = claims?.roles;

    if (jwtRoles && jwtRoles.length > 0) {
      setIsAdmin(jwtRoles.includes("admin"));
      setIsAdvisor(jwtRoles.includes("advisor"));
    } else {
      // Fallback to DB query if claims not available
      const [{ data: roles }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      setIsAdmin(!!roles?.some((r) => String(r.role) === "admin"));
      setIsAdvisor(!!roles?.some((r) => String(r.role) === "advisor"));
    }

    // Always fetch profile (username)
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    setUsername(profile?.username ?? null);
  };

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer DB calls to avoid deadlock
        setTimeout(() => {
          fetchRoleAndProfile(newSession.user).finally(() => setIsLoading(false));
        }, 0);
      } else {
        setIsAdmin(false);
        setIsAdvisor(false);
        setUsername(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchRoleAndProfile(data.session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check if user is privileged (admin/advisor) and needs MFA
    if (data.user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const isPrivileged = roles?.some(
        (r) => String(r.role) === "admin" || String(r.role) === "advisor",
      );

      if (isPrivileged) {
        const { data: twofa } = await supabase
          .from("user_2fa")
          .select("enabled")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!twofa?.enabled) {
          // Force logout and throw error to redirect to MFA setup
          await supabase.auth.signOut();
          throw new Error("MFA_REQUIRED");
        }
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRole = async () => {
    if (user) await fetchRoleAndProfile(user);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading,
        user,
        session,
        username,
        isAdmin,
        isAdvisor,
        signIn,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
