import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FileText, ThumbsUp, Clock, MessageSquare, Plus } from "lucide-react";
import { Link } from "wouter";

export function StudentDashboardOverview() {
  const { user } = useAuth();
  const { data: myProjects } = trpc.projects.getMyProjects.useQuery();
  const { data: assignment } = trpc.assignments.getMyAssignment.useQuery();

  const projectCount = myProjects?.length || 0;
  const votesReceived = 0; // TODO: Add vote count field to projects
  const pendingFeedback = myProjects?.filter((p) => p.status === "submitted").length || 0;

  // Calculate days until deadline (May 14, 2026)
  const expoDate = new Date("2026-05-14").getTime();
  const now = new Date().getTime();
  const daysUntilDeadline = Math.ceil((expoDate - now) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="glass-card border-none rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute -inset-2 bg-gradient-to-r from-primary to-digital-cyan rounded-full blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-foreground mb-3 hero-text-glow">
            Welcome back, {user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground font-medium mb-5 text-lg">
            Here's an overview of your project progress and upcoming deadlines.
          </p>
          {assignment && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="glass-card px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary border-white/20">
                Teacher: {assignment.teacherName}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Projects Submitted */}
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/20"><FileText className="text-primary" size={20} /></div>
            <span className="text-sm font-bold text-muted-foreground">Projects Submitted</span>
          </div>
          <div className="text-4xl font-black text-foreground tracking-tight">{projectCount}</div>
          <p className="text-xs text-muted-foreground/70 font-medium mt-2">
            {projectCount === 0 ? "No projects yet" : `${projectCount} active project${projectCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Votes Received */}
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-leaf-green/20"><ThumbsUp className="text-leaf-green" size={20} /></div>
            <span className="text-sm font-bold text-muted-foreground">Votes Received</span>
          </div>
          <div className="text-4xl font-black text-foreground tracking-tight">{votesReceived}</div>
          <p className="text-xs text-muted-foreground/70 font-medium mt-2">
            Community support for your projects
          </p>
        </div>

        {/* Days Until Deadline */}
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-orange-500/20"><Clock className="text-orange-500" size={20} /></div>
            <span className="text-sm font-bold text-muted-foreground">Days Until Deadline</span>
          </div>
          <div className="text-4xl font-black text-foreground tracking-tight">{Math.max(0, daysUntilDeadline)}</div>
          <p className="text-xs text-muted-foreground/70 font-medium mt-2">
            May 14, 2026
          </p>
        </div>

        {/* Feedback Status */}
        <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-digital-cyan/20"><MessageSquare className="text-digital-cyan" size={20} /></div>
            <span className="text-sm font-bold text-muted-foreground">Feedback Pending</span>
          </div>
          <div className="text-4xl font-black text-foreground tracking-tight">{pendingFeedback}</div>
          <p className="text-xs text-muted-foreground/70 font-medium mt-2">
            {pendingFeedback === 0 ? "All reviewed" : `Awaiting feedback`}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl p-6 border-white/10">
        <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/innovation-hub">
            <Button className="premium-gradient border-none font-bold shadow-md hover:scale-[1.02] transition-transform">
              <Plus size={18} className="mr-2" />
              Submit New Project
            </Button>
          </Link>
          <Link href="/vote">
            <Button variant="outline" className="glass-card border-white/20 hover:bg-white/10 font-bold">
              View Voting Area
            </Button>
          </Link>
          <Link href="/resources">
            <Button variant="outline" className="glass-card border-white/20 hover:bg-white/10 font-bold">
              View Resources
            </Button>
          </Link>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="glass-card rounded-2xl p-6 border-white/10">
        <h3 className="font-bold text-lg mb-6">Important Dates</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4 pb-4 border-b border-border/40">
            <div className="text-sm font-black text-primary min-w-fit uppercase tracking-wider">Apr 30, 2026</div>
            <div>
              <p className="font-bold text-foreground">Submission Deadline</p>
              <p className="text-sm text-muted-foreground font-medium">All projects must be submitted by this date</p>
            </div>
          </div>
          <div className="flex items-start gap-4 pb-4 border-b border-border/40">
            <div className="text-sm font-black text-leaf-green min-w-fit uppercase tracking-wider">May 1-10, 2026</div>
            <div>
              <p className="font-bold text-foreground">Admin Review Period</p>
              <p className="text-sm text-muted-foreground font-medium">Projects are reviewed and finalized</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-sm font-black text-digital-cyan min-w-fit uppercase tracking-wider">May 14, 2026</div>
            <div>
              <p className="font-bold text-foreground">Expo Day</p>
              <p className="text-sm text-muted-foreground font-medium">Join us for the live event and voting</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
