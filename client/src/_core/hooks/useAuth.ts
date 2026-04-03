import { useEffect, useMemo, useState, useCallback } from "react"

// Mock Auth لـ Vercel Static (بدون backend)
export function useAuth(options?: any) {
  const [user, setUser] = useState<{ id: number, email: string, role: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock login للاختبار
    const mockUser = {
      id: 1,
      email: "demo@tomorrowsearth.ae",
      role: "student"
    }
    setTimeout(() => {
      setUser(mockUser)
      setLoading(false)
    }, 1000)
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
  }, [])

  const state = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    error: null,
  }), [user, loading])

  return {
    ...state,
    refresh: () => { },
    logout,
  }
}