import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Plus, Eye, Edit2, Trash2,
  CheckCircle, Clock, AlertCircle, XCircle,
  ArrowRight, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { AssignmentWizard } from "@/components/AssignmentWizard";
import { supabase } from "@/lib/supabase";

// ─── Wizard Modal ─────────────────────────────────────────────────────────────
function WizardModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5">
          <h2 className="text-white font-black text-lg">Start Your Project</h2>
          <p className="text-green-100 text-sm font-medium mt-0.5">
            Complete the steps below to begin your project submission
          </p>
        </div>

        {/* Wizard */}
        <div className="p-6">
          <AssignmentWizard />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors font-bold text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  const map: Record<string, React.ReactNode> = {
    approved: <CheckCircle className="w-5 h-5 text-green-600" />,
    rejected: <XCircle className="w-5 h-5 text-red-600" />,
    submitted: <Clock className="w-5 h-5 text-blue-600" />,
    draft: <AlertCircle className="w-5 h-5 text-yellow-600" />,
  };
  return <>{map[status] || <AlertCircle className="w-5 h-5 text-slate-400" />}</>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
    submitted: { label: "Under Review", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    draft: { label: "Draft", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  };
  const cfg = map[status] || { label: status, className: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.className}`}>{cfg.label}</span>;
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project, onView, onEdit, onDelete,
}: {
  project: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-6">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
            <StatusIcon status={project.status} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 truncate">{project.title}</h3>
            {project.description && (
              <p className="text-xs text-slate-400 font-medium mt-0.5 line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 mb-4">
        {[
          { label: "Category", value: project.categoryId },
          { label: "Grade", value: project.grade ? `Grade ${project.grade}` : "—" },
          { label: "Team", value: project.teamName },
          { label: "Submitted", value: project.submittedAt ? new Date(project.submittedAt).toLocaleDateString() : "Not yet" },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-0.5">{label}</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Rejection feedback */}
      {project.status === "rejected" && project.rejectionReason && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-1">Teacher Feedback</p>
          <p className="text-xs text-red-600 dark:text-red-300 font-medium">{project.rejectionReason}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
        <Button variant="outline" size="sm" onClick={onView} className="gap-1.5 rounded-xl text-xs font-bold">
          <Eye size={13} /> View
        </Button>
        {project.status === "draft" && (
          <>
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 rounded-xl text-xs font-bold text-primary border-primary/30">
              <Edit2 size={13} /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 rounded-xl text-xs font-bold text-red-500 border-red-200 hover:bg-red-50">
              <Trash2 size={13} /> Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyProjectsDashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [showWizard, setShowWizard] = useState(false);

  // Fetch projects directly from Supabase using the student's UUID
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const mockUser = JSON.parse(localStorage.getItem("mock-user") || "{}");
      const uid = mockUser?.id ?? mockUser?.openId ?? null;
      if (!uid) { setProjects([]); return; }

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("supabase_uid", uid)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProjects(data);
        // Try to sync local projects
        await syncLocalProjects(uid);
      }
    } catch (e) {
      console.warn("[MyProjects] Supabase fetch failed:", e);
      // Fallback: show local projects
      const local = JSON.parse(localStorage.getItem("local-projects") || "[]");
      setProjects(local);
    } finally {
      setIsLoading(false);
    }
  };

  const syncLocalProjects = async (uid: string) => {
    const localProjects = JSON.parse(localStorage.getItem("local-projects") || "[]");
    if (localProjects.length === 0) return;

    for (const local of localProjects) {
      try {
        const { error } = await supabase.from("projects").insert({
          title: local.title,
          team_name: local.teamName,
          description: local.description,
          abstract: local.abstract,
          grade: local.grade,
          supabase_uid: uid,
          category_id: Number(local.categoryId) || null,
          subcategory_id: Number(local.subcategoryId) || null,
          supervisor_id: Number(local.supervisorId) || null,
          image_urls: local.imageUrls,
          video_url: local.videoUrl,
          document_urls: local.documentUrls,
          status: local.status,
          submitted_at: local.submittedAt,
          created_at: local.createdAt,
          updated_at: local.updatedAt,
        });
        if (!error) {
          // Remove from local storage
          const updated = localProjects.filter((p: any) => p.id !== local.id);
          localStorage.setItem("local-projects", JSON.stringify(updated));
          toast.success("Local project synced to server!");
          // Refetch to show the synced project
          await refetch();
        }
      } catch (err) {
        console.warn("[MyProjects] Failed to sync local project:", err);
      }
    }
  };

  useEffect(() => { refetch(); }, []);

  const handleDelete = async (id: string | number) => {
    if (!confirm("Delete this project?")) return;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Project deleted");
      refetch();
    } catch {
      // Fallback: remove from local-projects
      const local = JSON.parse(localStorage.getItem("local-projects") || "[]");
      localStorage.setItem("local-projects", JSON.stringify(local.filter((p: any) => p.id !== id)));
      toast.success("Project deleted");
      refetch();
    }
  };

  // ── The single entry point for "new project" ──
  const handleNewProject = () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    setShowWizard(true);
  };

  const draft = projects?.filter((p: any) => p.status === "draft") || [];
  const submitted = projects?.filter((p: any) => p.status === "submitted") || [];
  const approved = projects?.filter((p: any) => p.status === "approved") || [];
  const rejected = projects?.filter((p: any) => p.status === "rejected") || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ── Wizard Modal ── */}
      {showWizard && <WizardModal onClose={() => setShowWizard(false)} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">My Projects</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Manage and track your project submissions
            </p>
          </div>
          <Button
            onClick={handleNewProject}
            className="gap-2 premium-gradient text-white border-none rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform"
          >
            <Plus size={16} />
            New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: projects?.length ?? 0, color: "text-slate-700 dark:text-slate-200" },
            { label: "Drafts", value: draft.length, color: "text-amber-500" },
            { label: "Under Review", value: submitted.length, color: "text-blue-600" },
            { label: "Approved", value: approved.length, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 p-5 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">{label}</p>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Projects list or empty state */}
        {projects && projects.length > 0 ? (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { value: "all", label: `All (${projects.length})` },
                { value: "draft", label: `Drafts (${draft.length})` },
                { value: "submitted", label: `Review (${submitted.length})` },
                { value: "approved", label: `Approved (${approved.length})` },
                { value: "rejected", label: `Rejected (${rejected.length})` },
              ].map(({ value, label }) => (
                <TabsTrigger key={value} value={value} className="rounded-lg text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {[
              { value: "all", list: projects },
              { value: "draft", list: draft },
              { value: "submitted", list: submitted },
              { value: "approved", list: approved },
              { value: "rejected", list: rejected },
            ].map(({ value, list }) => (
              <TabsContent key={value} value={value} className="space-y-4">
                {list.length > 0 ? list.map((p: any) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onView={() => navigate(`/project/${p.id}`)}
                    onEdit={() => navigate(`/project/${p.id}/edit`)}
                    onDelete={() => handleDelete(p.id)}
                  />
                )) : (
                  <div className="text-center py-12 text-slate-400 font-medium">
                    No projects in this category.{" "}
                    <button onClick={handleNewProject} className="text-primary font-bold hover:underline">
                      Create one
                    </button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          /* ── Empty state ── */
          <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-5">
              <Rocket size={28} className="text-green-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
              No Projects Yet
            </h3>
            <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mb-8">
              You haven't submitted any projects yet. Start by selecting your teacher and category, then submit your project.
            </p>
            <Button
              onClick={handleNewProject}
              size="lg"
              className="premium-gradient text-white border-none rounded-full px-10 font-bold shadow-xl hover:scale-105 transition-transform gap-2"
            >
              Submit Your First Project
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}