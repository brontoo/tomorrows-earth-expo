import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Plus, Eye, Edit, CheckCircle2, X } from "lucide-react";
import ProjectForm from "@/components/ProjectForm";
import MyProjectsDashboard from "@/components/MyProjectsDashboard";
import { AssignmentWizard } from "@/components/AssignmentWizard";
import { StudentDashboardLayout } from "@/components/StudentDashboardLayout";
import { StudentDashboardOverview } from "@/components/StudentDashboardOverview";
import PageNavigation from "@/components/PageNavigation";
import { ProfileSettings } from "@/components/ProfileSettings";
import { useState } from "react";

export default function StudentDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: myProjects, refetch } = trpc.projects.getMyProjects.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "student",
  });
  const { data: assignment, refetch: refetchAssignment } = trpc.assignments.getMyAssignment.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "student",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
        <Navigation />
        <div className="container py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
  return (
    <div className="min-h-screen bg-background">
      <PageNavigation />
      <Navigation />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in as a student to access the dashboard.
          </p>
          <Button asChild>
            <a href={getLoginUrl()}>Login</a>
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "student") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            This dashboard is only accessible to students.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getProjectProgress = (project: any) => {
    let completed = 0;
    const total = 7;
    
    if (project.title) completed++;
    if (project.abstract) completed++;
    if (project.scientificQuestion) completed++;
    if (project.researchMethod) completed++;
    if (project.thumbnailUrl) completed++;
    if (project.videoUrl) completed++;
    if (project.imageUrls) completed++;
    
    return (completed / total) * 100;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      submitted: { variant: "default", label: "Submitted" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      finalist: { variant: "default", label: "Finalist" },
    };
    
    const config = statusMap[status] || statusMap.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <StudentDashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Dashboard Overview with Welcome and Stats */}
            <StudentDashboardOverview />

        {/* Show assignment wizard if student has no assignment */}
        {!assignment && (
          <div className="mb-12">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Complete Your Assignment</CardTitle>
                <CardDescription>
                  Before you can submit projects, please select your teacher and project category.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssignmentWizard onComplete={refetchAssignment} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Show assignment summary if assigned */}
        {activeTab === "dashboard" && assignment && (
          <div className="mb-8 p-6 glass-card border-leaf-green/20 rounded-2xl overflow-hidden relative animate-in fade-in duration-700 delay-150">
            <div className="absolute top-0 right-0 p-8 opacity-5 blur-2xl bg-leaf-green w-64 h-64 rounded-full"></div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <h3 className="text-xl font-black text-leaf-green/90 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={24} className="text-leaf-green" />
                  Your Configured Environment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-black/5 p-4 rounded-xl">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Teacher</p>
                    <p className="font-bold text-foreground">{assignment.teacherName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Category</p>
                    <p className="font-bold text-foreground">{assignment.mainCategoryId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Subcategory</p>
                    <p className="font-bold text-foreground">{assignment.subcategoryId}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <MyProjectsDashboard />
          </div>
        )}

        {/* Profile Settings Tab */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ProfileSettings />
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
}

