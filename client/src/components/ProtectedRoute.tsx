import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth, UserRole } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-24">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-lg">
            <div className="h-10 w-10 rounded-full animate-spin border-4 border-green-500 border-t-transparent" />
            <div className="text-sm font-semibold text-slate-700">Checking access...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-background px-4 py-24">
        <div className="container mx-auto">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You do not have permission to view this page.
              </p>
              <Button onClick={() => setLocation("/")}>Go home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
