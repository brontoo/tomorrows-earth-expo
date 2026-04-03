import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Eye, Edit2, Trash2, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function MyProjectsDashboard() {
  const [, navigate] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Fetch user's projects
  const { data: projects, isLoading, refetch } = trpc.projects.getMyProjects.useQuery();

  // Delete project mutation
  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  const handleDeleteProject = (projectId: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate({ id: projectId });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "submitted":
        return <Clock className="w-5 h-5 text-blue-600" />;
      case "draft":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const draftProjects = projects?.filter((p: any) => p.status === "draft") || [];
  const submittedProjects = projects?.filter((p: any) => p.status === "submitted") || [];
  const approvedProjects = projects?.filter((p: any) => p.status === "approved") || [];
  const rejectedProjects = projects?.filter((p: any) => p.status === "rejected") || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Projects</h1>
          <p className="text-muted-foreground">
            Manage and track your project submissions
          </p>
        </div>
        <Button
          onClick={() => navigate("/project-submission")}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Total Projects
          </div>
          <div className="text-3xl font-black text-foreground">{projects?.length || 0}</div>
        </div>
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Drafts
          </div>
          <div className="text-3xl font-black text-yellow-500">{draftProjects.length}</div>
        </div>
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Under Review
          </div>
          <div className="text-3xl font-black text-primary">{submittedProjects.length}</div>
        </div>
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Approved
          </div>
          <div className="text-3xl font-black text-leaf-green">{approvedProjects.length}</div>
        </div>
      </div>

      {/* Projects Tabs */}
      {projects && projects.length > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="draft">Drafts ({draftProjects.length})</TabsTrigger>
            <TabsTrigger value="submitted">Under Review ({submittedProjects.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedProjects.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedProjects.length})</TabsTrigger>
          </TabsList>

          {/* All Projects Tab */}
          <TabsContent value="all" className="space-y-4">
            {projects.map((project: any) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => navigate(`/project/${project.id}`)}
                onEdit={() => navigate(`/project/${project.id}/edit`)}
                onDelete={() => handleDeleteProject(project.id)}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </TabsContent>

          {/* Draft Projects Tab */}
          <TabsContent value="draft" className="space-y-4">
            {draftProjects.length > 0 ? (
              draftProjects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={() => navigate(`/project/${project.id}`)}
                  onEdit={() => navigate(`/project/${project.id}/edit`)}
                  onDelete={() => handleDeleteProject(project.id)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No draft projects. <a href="/project-submission" className="text-primary hover:underline">Create one</a>
              </div>
            )}
          </TabsContent>

          {/* Submitted Projects Tab */}
          <TabsContent value="submitted" className="space-y-4">
            {submittedProjects.length > 0 ? (
              submittedProjects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={() => navigate(`/project/${project.id}`)}
                  onEdit={() => navigate(`/project/${project.id}/edit`)}
                  onDelete={() => handleDeleteProject(project.id)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No projects under review
              </div>
            )}
          </TabsContent>

          {/* Approved Projects Tab */}
          <TabsContent value="approved" className="space-y-4">
            {approvedProjects.length > 0 ? (
              approvedProjects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={() => navigate(`/project/${project.id}`)}
                  onEdit={() => navigate(`/project/${project.id}/edit`)}
                  onDelete={() => handleDeleteProject(project.id)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No approved projects yet
              </div>
            )}
          </TabsContent>

          {/* Rejected Projects Tab */}
          <TabsContent value="rejected" className="space-y-4">
            {rejectedProjects.length > 0 ? (
              rejectedProjects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={() => navigate(`/project/${project.id}`)}
                  onEdit={() => navigate(`/project/${project.id}/edit`)}
                  onDelete={() => handleDeleteProject(project.id)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No rejected projects
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="glass-card p-12 rounded-3xl text-center border-white/10 mt-8">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="inline-flex p-4 rounded-2xl bg-white/5 mb-4">
              <Plus className="w-12 h-12 text-primary opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No projects</h3>
            <p className="text-muted-foreground font-medium">You haven't submitted any projects yet. Start by creating a draft to participate in the Expo.</p>
            <Button onClick={() => navigate("/project-submission")} className="mt-4 premium-gradient font-bold px-8" size="lg">
              Submit Your First Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
}

function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
  getStatusIcon,
  getStatusBadge,
}: ProjectCardProps) {
  return (
    <div className="glass-card p-6 rounded-2xl border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-white/5">{getStatusIcon(project.status)}</div>
            <h3 className="text-xl font-black tracking-tight">{project.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground font-medium line-clamp-2">{project.description}</p>
        </div>
        <div>
          {getStatusBadge(project.status)}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Project Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-black/5 p-4 rounded-xl">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Category</p>
            <p className="font-bold text-foreground">{project.categoryId}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Grade</p>
            <p className="font-bold text-foreground">{project.grade}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Submitted</p>
            <p className="font-bold text-foreground">
              {project.submittedAt
                ? new Date(project.submittedAt).toLocaleDateString()
                : "Not submitted"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Team</p>
            <p className="font-bold text-foreground">{project.teamName}</p>
          </div>
        </div>

        {/* Rejection Reason (if rejected) */}
        {project.status === "rejected" && project.rejectionReason && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Feedback from teacher</p>
            <p className="text-sm text-red-400 font-medium">{project.rejectionReason}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-2 border-t border-border/10">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="gap-2 glass-card border-white/20 hover:bg-white/10 font-bold"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          {project.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-2 glass-card border-white/20 hover:bg-white/10 font-bold text-primary"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="gap-2 glass-card border-white/20 hover:bg-white/10 font-bold text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
