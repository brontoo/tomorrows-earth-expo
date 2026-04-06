
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import PageNavigation from "@/components/PageNavigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  Eye,
  CheckCircle2,
  XCircle,
  Clock3,
  FolderOpen,
  User,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

type ProjectItem = {
  id: number;
  title?: string;
  teamName?: string;
  description?: string;
  abstract?: string;
  grade?: string;
  status?: "submitted" | "approved" | "rejected" | string;
  submittedAt?: string | Date | null;
  rejectionReason?: string | null;
  supervisorId?: number | string | null;
  studentId?: number | string | null;
  studentName?: string | null;
  category?: { name?: string | null } | null;
  subcategory?: { name?: string | null } | null;
};

export default function TeacherDashboard() {
  return <TeacherDashboardContent />;
}

function TeacherDashboardContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  // ── جلب مشاريع المدرس فقط من الـ endpoint المخصص ──
  const { data: myProjects = [], isLoading: projectsLoading } =
    trpc.teacher.getStudentSubmissions.useQuery(undefined, {
      enabled: isAuthenticated && (user?.role === "teacher" || user?.role === "admin"),
      retry: false,
      refetchOnWindowFocus: false,
    });

  const approveMutation = trpc.teacher.approve.useMutation({
    onSuccess: async () => {
      toast.success("Project approved successfully.");
      await utils.teacher.getStudentSubmissions.invalidate();
    },
    onError: (error: { message: any; }) => {
      toast.error(`Failed to approve project: ${error.message}`);
    },
  });

  const rejectMutation = trpc.teacher.reject.useMutation({
    onSuccess: async () => {
      toast.success("Project returned for revision.");
      setRejectingId(null);
      setFeedback("");
      await utils.teacher.getStudentSubmissions.invalidate();
    },
    onError: (error: { message: any; }) => {
      toast.error(`Failed to reject project: ${error.message}`);
    },
  });

  // ── فلترة حسب الحالة ──
  const submittedProjects = (myProjects as ProjectItem[]).filter(
    (p) => p.status === "submitted"
  );
  const approvedProjects = (myProjects as ProjectItem[]).filter(
    (p) => p.status === "approved"
  );
  const rejectedProjects = (myProjects as ProjectItem[]).filter(
    (p) => p.status === "rejected"
  );

  const handleApprove = async (projectId: number) => {
    await approveMutation.mutateAsync({ id: projectId });
  };

  const openRejectBox = (projectId: number) => {
    setRejectingId(projectId);
    setFeedback("");
  };

  const handleReject = async (projectId: number) => {
    const reason = feedback.trim();
    if (!reason) {
      toast.error("Please enter feedback before returning the project.");
      return;
    }
    await rejectMutation.mutateAsync({ id: projectId, reason });
  };

  // ── States ──
  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container pt-24 pb-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-56 rounded-md bg-muted" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-28 rounded-xl bg-muted" />
              <div className="h-28 rounded-xl bg-muted" />
              <div className="h-28 rounded-xl bg-muted" />
            </div>
            <div className="h-72 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container pt-24 pb-16">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Please login</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You need to be logged in as a teacher to access this dashboard.
              </p>
              <Button asChild>
                <a href={getLoginUrl()}>Login</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (user?.role !== "teacher" && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container pt-24 pb-16">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This dashboard is only accessible to teachers and admins.
              </p>
              <Link href="/">
                <Button variant="outline">Go home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Sub-components ──
  const StatCard = ({
    title,
    value,
    icon: Icon,
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
  }) => (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ title, text }: { title: string; text: string }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <FolderOpen className="mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );

  const ProjectCard = ({ project }: { project: ProjectItem }) => {
    const isRejecting = rejectingId === project.id;

    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="text-xl">
                {project.title || "Untitled project"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.teamName || "No team name"} • Grade {project.grade || "-"}
              </p>
            </div>

            <Link href={`/project/${project.id}`}>
              <Button variant="outline" size="sm" className="shrink-0">
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
            </Link>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{project.studentName || "Student not available"}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span>
                {project.subcategory?.name ||
                  project.category?.name ||
                  "Category not available"}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {project.description || project.abstract || "No project summary available."}
          </p>

          {project.submittedAt && (
            <p className="text-xs text-muted-foreground">
              Submitted on{" "}
              {new Date(project.submittedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}

          {project.status === "rejected" && project.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                <MessageSquare className="h-4 w-4" />
                Previous feedback
              </div>
              <p className="text-sm text-red-700/90 dark:text-red-300/90">
                {project.rejectionReason}
              </p>
            </div>
          )}

          {project.status === "submitted" && (
            <div className="space-y-3 border-t pt-4">
              {isRejecting && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Feedback for student</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Explain what should be revised before approval..."
                    className="min-h-[110px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => handleApprove(project.id)}
                  disabled={approveMutation.isPending}
                  className="sm:flex-1"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>

                {!isRejecting ? (
                  <Button
                    variant="outline"
                    onClick={() => openRejectBox(project.id)}
                    disabled={rejectMutation.isPending}
                    className="sm:flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Return for revision
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(project.id)}
                    disabled={rejectMutation.isPending || !feedback.trim()}
                    className="sm:flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Confirm return
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Main Render ──
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container pt-24 pb-10">  {/* ← pt-24 فقط */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review projects submitted by students assigned to you.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard title="Pending review" value={submittedProjects.length} icon={Clock3} />
          <StatCard title="Approved" value={approvedProjects.length} icon={CheckCircle2} />
          <StatCard title="Needs revision" value={rejectedProjects.length} icon={XCircle} />
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-lg bg-muted p-1">
            <TabsTrigger value="pending">
              Pending ({submittedProjects.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedProjects.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Needs Revision ({rejectedProjects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {submittedProjects.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {submittedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No pending projects"
                text="There are currently no submitted projects waiting for your review."
              />
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedProjects.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {approvedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No approved projects"
                text="Projects you approve will appear here."
              />
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedProjects.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {rejectedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No revision requests"
                text="Projects returned to students for revision will appear here."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}