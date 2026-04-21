import { createContext, useContext, type ReactNode } from "react";
import { useAuth as useAuthHook } from "@/_core/hooks/useAuth";

// Single shared auth state for the whole app
// Prevents each component from creating its own Supabase listener
const AuthContext = createContext<ReturnType<typeof useAuthHook> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthHook();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
