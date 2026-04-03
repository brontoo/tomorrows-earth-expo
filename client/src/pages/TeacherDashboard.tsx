import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import PageNavigation from "@/components/PageNavigation";

export default function TeacherDashboard() {
  return (
    <>
      <PageNavigation />
      <TeacherDashboardContent />
    </>
  );
}

function TeacherDashboardContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: allProjects } = trpc.projects.getAll.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "teacher" || user?.role === "admin"),
  });

  const approveMutation = trpc.projects.approve.useMutation({
    onSuccess: () => {
      toast.success("Project approved successfully!");
      utils.projects.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.projects.reject.useMutation({
    onSuccess: () => {
      toast.success("Project rejected with feedback.");
      utils.projects.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
        <Navigation />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-muted-foreground mb-6">
            You need to be logged in as a teacher to access this dashboard.
          </p>
          <Button asChild>
            <a href={getLoginUrl()}>Login</a>
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "teacher" && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            This dashboard is only accessible to teachers and admins.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const submittedProjects = allProjects?.filter((p) => p.status === "submitted") || [];
  const approvedProjects = allProjects?.filter((p) => p.status === "approved") || [];
  const rejectedProjects = allProjects?.filter((p) => p.status === "rejected") || [];

  const handleApprove = async (projectId: number) => {
    await approveMutation.mutateAsync({ id: projectId });
  };

  const handleReject = async (projectId: number) => {
    const reason = prompt("Please provide feedback for the student:");
    if (reason) {
      await rejectMutation.mutateAsync({ id: projectId, reason });
    }
  };

  const ProjectCard = ({ project }: { project: any }) => (
    <div className="glass-card p-6 rounded-2xl border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-black mb-1">{project.title}</h3>
          <p className="text-sm font-medium text-muted-foreground">
            {project.teamName} • Grade {project.grade}
          </p>
        </div>
        <Link href={`/project/${project.id}`}>
          <Button variant="outline" size="sm" className="glass-card border-white/20 hover:bg-white/10 font-bold">
            <Eye className="mr-2" size={16} />
            View
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {project.abstract && (
          <p className="text-sm text-muted-foreground font-medium line-clamp-3 bg-black/5 p-4 rounded-xl">
            {project.abstract}
          </p>
        )}
        
        {project.status === "submitted" && (
          <div className="flex gap-3 pt-2 border-t border-border/10">
            <Button
              size="sm"
              onClick={() => handleApprove(project.id)}
              disabled={approveMutation.isPending}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              <CheckCircle className="mr-2" size={16} />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReject(project.id)}
              disabled={rejectMutation.isPending}
              className="flex-1 font-bold"
            >
              <XCircle className="mr-2" size={16} />
              Reject
            </Button>
          </div>
        )}

        {project.status === "rejected" && project.rejectionReason && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-2">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Feedback from you:</p>
            <p className="text-sm text-red-400 font-medium">{project.rejectionReason}</p>
          </div>
        )}

        {project.submittedAt && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase pt-2">
            Submitted: {new Date(project.submittedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background">
      <Navigation />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3 hero-text-glow">Teacher Dashboard</h1>
          <p className="text-lg text-muted-foreground font-medium">
            Review and approve student project submissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-yellow-500/20">
                <Clock className="text-yellow-500" size={32} />
              </div>
              <div>
                <div className="text-4xl font-black text-foreground">{submittedProjects.length}</div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-leaf-green/20">
                <CheckCircle className="text-leaf-green" size={32} />
              </div>
              <div>
                <div className="text-4xl font-black text-foreground">{approvedProjects.length}</div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Approved</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-red-500/20">
                <XCircle className="text-red-500" size={32} />
              </div>
              <div>
                <div className="text-4xl font-black text-foreground">{rejectedProjects.length}</div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Needs Revision</p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pending Review ({submittedProjects.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Approved ({approvedProjects.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Needs Revision ({rejectedProjects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {submittedProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {submittedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="glass-card py-16 rounded-3xl text-center text-muted-foreground border-white/10">
                <Clock size={64} className="mx-auto mb-6 text-primary/40" />
                <h3 className="text-xl font-bold text-foreground">All caught up!</h3>
                <p className="font-medium mt-2">No projects currently pending review.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {approvedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="glass-card py-16 rounded-3xl text-center text-muted-foreground border-white/10">
                <CheckCircle size={64} className="mx-auto mb-6 text-primary/40" />
                <h3 className="text-xl font-bold text-foreground">No approved projects</h3>
                <p className="font-medium mt-2">You haven't approved any projects yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rejectedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="glass-card py-16 rounded-3xl text-center text-muted-foreground border-white/10">
                <XCircle size={64} className="mx-auto mb-6 text-primary/40" />
                <h3 className="text-xl font-bold text-foreground">No revisions needed</h3>
                <p className="font-medium mt-2">No projects are currently marked for revision.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
