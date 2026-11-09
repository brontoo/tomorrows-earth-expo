import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

/** Educational adapter shared by presentations. Rendering never owns these queries or rewards. */
export function useBookProgress() {
  const { user, isAuthenticated, loading } = useAuthContext();
  const student = isAuthenticated && user?.role === "student";
  const catalogue = trpc.missions.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });
  const passport = trpc.passport.getMine.useQuery(undefined, {
    enabled: student,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });
  return {
    profile: String(user?.id ?? "guest"),
    student,
    loading: loading || catalogue.isLoading || (student && passport.isLoading),
    error: catalogue.isError || (student && passport.isError),
    missions: catalogue.data ?? [],
    states: passport.data?.missionStates ?? [],
    refresh: () => {
      void catalogue.refetch();
      if (student) void passport.refetch();
    },
  };
}
