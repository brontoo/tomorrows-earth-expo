import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Users, BarChart3, Settings, ToggleRight, AlertCircle, Loader2, Calendar, Lock, Unlock, Trash2, Eye, EyeOff, Video } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
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
                You need to be logged in as an admin to access this dashboard.
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

  if (user?.role !== "admin") {
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
                This dashboard is only accessible to admins.
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

  return (
    <>
      <Navigation />
      <AdminDashboardContent />
    </>
  );
}

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState("overview");
  const [userSubTab, setUserSubTab] = useState("teachers");

  // Queries
  const statsQuery = trpc.admin.getPlatformStats.useQuery();
  const usersQuery = trpc.admin.getAllUsers.useQuery();
  const teachersQuery = trpc.teachers.getAll.useQuery();
  const eventSettingsQuery = trpc.admin.getEventSettings.useQuery();
  const votingStatsQuery = trpc.admin.getVotingStats.useQuery();
  const activityQuery = trpc.admin.getActivityLogs.useQuery({ limit: 50 });
  const journeyPostsQuery = trpc.admin.getJourneyPosts.useQuery();
  const projectsQuery = trpc.admin.getAllProjects.useQuery();

  // Mutations
  const updateEventSettingsMutation = trpc.admin.updateEventSettings.useMutation();
  const toggleVotingMutation = trpc.admin.toggleVoting.useMutation();
  const updateUserStatusMutation = trpc.admin.updateUserStatus.useMutation();
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const deleteJourneyPostMutation = trpc.admin.deleteJourneyPost.useMutation();
  const deleteProjectMutation = trpc.admin.deleteProject.useMutation();

  const stats = statsQuery.data;
  const users = usersQuery.data || [];
  const eventSettings = eventSettingsQuery.data;
  const votingStats = votingStatsQuery.data;
  const activityLogs = activityQuery.data || [];
  const journeyPosts = journeyPostsQuery.data || [];
  const projects = projectsQuery.data || [];

  const teacherUserIds = useMemo(() => {
    return new Set((teachersQuery.data || []).map((t: any) => t.userId));
  }, [teachersQuery.data]);

  const dedupeUsersForView = (rows: any[]) => {
    const normalizeName = (name?: string | null) =>
      (name || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

    const map = new Map<string, any>();
    for (const row of rows) {
      const key = normalizeName(row.name) || String(row.email || "").toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, row);
        continue;
      }

      const existingEmail = String(existing.email || "").toLowerCase();
      const currentEmail = String(row.email || "").toLowerCase();
      const existingPreferred = existingEmail.includes("@moe.sch.ae") ? 1 : 0;
      const currentPreferred = currentEmail.includes("@moe.sch.ae") ? 1 : 0;

      if (currentPreferred > existingPreferred) {
        map.set(key, row);
      }
    }
    return Array.from(map.values());
  };

  const userBuckets = useMemo(() => {
    const admins = dedupeUsersForView(users.filter((u: any) => u.role === "admin"));
    const teachers = dedupeUsersForView(
      users.filter((u: any) => u.role === "teacher" || teacherUserIds.has(u.id))
    );
    const students = dedupeUsersForView(users.filter((u: any) => u.role === "student"));
    const visitors = dedupeUsersForView(
      users.filter((u: any) => u.role === "public" || u.role === "visitor")
    );

    return { admins, teachers, students, visitors };
  }, [users, teacherUserIds]);

  const visibleUniqueUsers = useMemo(() => {
    return dedupeUsersForView(users).length;
  }, [users]);

  const displayedUsers =
    userSubTab === "admins"
      ? userBuckets.admins
      : userSubTab === "students"
        ? userBuckets.students
        : userSubTab === "visitors"
          ? userBuckets.visitors
          : userBuckets.teachers;

  const handleToggleVoting = async () => {
    if (!votingStats) return;
    try {
      await toggleVotingMutation.mutateAsync({ open: !votingStats.votingOpen });
      votingStatsQuery.refetch();
    } catch (error) {
      console.error("Failed to toggle voting:", error);
    }
  };

  const handleUserStatusChange = async (userId: number, approved: boolean) => {
    try {
      await updateUserStatusMutation.mutateAsync({ userId, approved });
      usersQuery.refetch();
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteUserMutation.mutateAsync({ userId });
      usersQuery.refetch();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const handleUpdateEventSettings = async (key: string, value: any) => {
    try {
      await updateEventSettingsMutation.mutateAsync({ [key]: value });
      eventSettingsQuery.refetch();
    } catch (error) {
      console.error("Failed to update event settings:", error);
    }
  };

  const handleDeleteJourneyPost = async (id: number) => {
    if (!confirm("Delete this journey video/post?")) return;
    try {
      await deleteJourneyPostMutation.mutateAsync({ id });
      journeyPostsQuery.refetch();
    } catch (error) {
      console.error("Failed to delete journey post:", error);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm("Delete this project? This action cannot be undone.")) return;
    try {
      await deleteProjectMutation.mutateAsync({ id });
      await Promise.all([projectsQuery.refetch(), statsQuery.refetch(), votingStatsQuery.refetch()]);
      alert("Project deleted successfully.");
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-digital-cyan/10 via-background to-background py-12">
      <div className="container">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4 hero-text-glow">Admin Control Center</h1>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl">Manage platform settings, users, events, and voting system</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <Card className="glass-card border-white/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Accounts</p>
                  <p className="text-4xl font-black text-foreground">{stats?.totalUsers || 0}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-2">Visible unique users: {visibleUniqueUsers}</p>
                </div>
                <Users className="h-12 w-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Projects</p>
                  <p className="text-4xl font-black text-primary">{stats?.totalProjects || 0}</p>
                </div>
                <BarChart3 className="h-12 w-12 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Votes</p>
                  <p className="text-4xl font-black text-digital-cyan">{stats?.totalVotes || 0}</p>
                </div>
                <ToggleRight className="h-12 w-12 text-digital-cyan/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Admins</p>
                  <p className="text-4xl font-black text-foreground">{stats?.totalAdmins || 0}</p>
                </div>
                <Settings className="h-12 w-12 text-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 glass-card border border-white/10 rounded-xl p-1 mb-8">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Overview</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Users</TabsTrigger>
            <TabsTrigger value="event" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Event</TabsTrigger>
            <TabsTrigger value="voting" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Voting</TabsTrigger>
            <TabsTrigger value="projects" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Projects</TabsTrigger>
            <TabsTrigger value="journey" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Journey Videos</TabsTrigger>
          </TabsList>

          {(statsQuery.error || usersQuery.error || teachersQuery.error || eventSettingsQuery.error || votingStatsQuery.error || activityQuery.error || projectsQuery.error) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load some dashboard data. Please refresh the page.
              </AlertDescription>
            </Alert>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {statsQuery.isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-card border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold">Student Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-primary mb-2">{stats?.totalStudents || 0}</div>
                      <p className="text-xs text-muted-foreground font-medium">Total registered students</p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold">Project Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground">Approved</span>
                          <Badge className="bg-leaf-green/20 text-leaf-green border-none font-bold">{stats?.approvedProjects || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground">Pending</span>
                          <Badge className="bg-amber-500/20 text-amber-600 border-none font-bold">{stats?.pendingProjects || 0}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-white/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold">Teachers & Admins</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground">Teachers</span>
                          <Badge className="bg-blue-500/20 text-blue-600 border-none font-bold">{stats?.totalTeachers || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground">Admins</span>
                          <Badge className="bg-purple-500/20 text-purple-600 border-none font-bold">{stats?.totalAdmins || 0}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Logs */}
                <Card className="glass-card border-white/20">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest platform events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activityLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8 bg-white/5 rounded-lg">No recent activity</p>
                    ) : (
                      <div className="space-y-3">
                        {activityLogs.slice(0, 10).map((log, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <div>
                              <p className="text-sm font-bold text-foreground">{(log as any).action || "Activity"}</p>
                              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                {new Date((log as any).createdAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="glass-card border-white/20 font-bold">{(log as any).status || "—"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-8">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users by role. Admin-teachers appear in both Admins and Teachers tabs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Button variant={userSubTab === "teachers" ? "default" : "outline"} onClick={() => setUserSubTab("teachers")} className="font-bold">
                    Teachers ({userBuckets.teachers.length})
                  </Button>
                  <Button variant={userSubTab === "admins" ? "default" : "outline"} onClick={() => setUserSubTab("admins")} className="font-bold">
                    Admins ({userBuckets.admins.length})
                  </Button>
                  <Button variant={userSubTab === "students" ? "default" : "outline"} onClick={() => setUserSubTab("students")} className="font-bold">
                    Students ({userBuckets.students.length})
                  </Button>
                  <Button variant={userSubTab === "visitors" ? "default" : "outline"} onClick={() => setUserSubTab("visitors")} className="font-bold">
                    Visitors/Parents ({userBuckets.visitors.length})
                  </Button>
                </div>

                {usersQuery.isLoading || teachersQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/10">
                        <tr>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Name</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Email</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Role</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Status</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedUsers.map((u: any) => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">{u.name || "—"}</td>
                            <td className="py-3 px-4 text-muted-foreground font-medium">{u.email}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="glass-card border-white/20 capitalize font-bold">{u.role}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              {u.approved ? (
                                <Badge className="bg-leaf-green/20 text-leaf-green border-none font-bold flex items-center gap-1 w-fit">
                                  <Eye className="h-3 w-3" /> Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="glass-card border-white/20 font-bold flex items-center gap-1 w-fit">
                                  <EyeOff className="h-3 w-3" /> Inactive
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 space-x-2 flex items-center">
                              {!u.approved ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserStatusChange(u.id, true)}
                                  disabled={updateUserStatusMutation.isPending}
                                  className="glass-card hover:bg-white/10 font-bold h-8"
                                >
                                  <Unlock className="h-3 w-3 mr-1" /> Activate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserStatusChange(u.id, false)}
                                  disabled={updateUserStatusMutation.isPending}
                                  className="glass-card hover:bg-white/10 font-bold h-8"
                                >
                                  <Lock className="h-3 w-3 mr-1" /> Deactivate
                                </Button>
                              )}
                              {u.role !== "admin" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={deleteUserMutation.isPending}
                                  className="font-bold h-8"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Settings Tab */}
          <TabsContent value="event" className="space-y-8">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle>Event Configuration</CardTitle>
                <CardDescription>Configure Tomorrow's Earth Expo 2026 settings</CardDescription>
              </CardHeader>
              <CardContent>
                {eventSettingsQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : eventSettings ? (
                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <label className="block text-sm font-bold mb-3 text-foreground">Event Date</label>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="date"
                          value={eventSettings.eventDate}
                          onChange={(e) => handleUpdateEventSettings("eventDate", e.target.value)}
                          className="glass-card border-white/20"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-2">Current: {eventSettings.eventDate}</p>
                    </div>

                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <label className="block text-sm font-bold mb-3 text-foreground">Submission Deadline</label>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <Input
                          type="date"
                          value={eventSettings.submissionDeadline}
                          onChange={(e) => handleUpdateEventSettings("submissionDeadline", e.target.value)}
                          className="glass-card border-white/20"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-2">Current: {eventSettings.submissionDeadline}</p>
                    </div>

                    <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                      <label className="block text-sm font-bold mb-3 text-foreground">Event Location</label>
                      <Input
                        type="text"
                        value={eventSettings.eventLocation}
                        onChange={(e) => handleUpdateEventSettings("eventLocation", e.target.value)}
                        className="glass-card border-white/20"
                        placeholder="Um Al-Emarat School"
                      />
                    </div>

                    {eventSettings.eventDescription && (
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <label className="block text-sm font-bold mb-3 text-foreground">Event Description</label>
                        <textarea
                          value={eventSettings.eventDescription}
                          onChange={(e) => handleUpdateEventSettings("eventDescription", e.target.value)}
                          className="glass-card border-white/20 w-full rounded-lg p-3 text-sm"
                          rows={4}
                          placeholder="Event description..."
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voting Tab */}
          <TabsContent value="voting" className="space-y-8">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle>Voting System</CardTitle>
                <CardDescription>Control voting availability and see statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {votingStatsQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : votingStats ? (
                  <>
                    {/* Voting Toggle */}
                    <div className="p-6 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground">Voting Status</p>
                        <p className="text-sm text-muted-foreground font-medium mt-1">
                          {votingStats.votingOpen ? "Voting is currently enabled" : "Voting is currently disabled"}
                        </p>
                      </div>
                      <Button
                        onClick={handleToggleVoting}
                        disabled={toggleVotingMutation.isPending}
                        variant={votingStats.votingOpen ? "destructive" : "default"}
                        className="font-bold"
                      >
                        {toggleVotingMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : votingStats.votingOpen ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" /> Close Voting
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4 mr-2" /> Open Voting
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Voting Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Votes Cast</p>
                        <p className="text-4xl font-black text-digital-cyan">{votingStats.totalVotes}</p>
                      </div>

                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Top Project</p>
                        <p className="text-lg font-bold text-foreground">
                          {votingStats.topProjects?.[0]?.title || "No votes yet"}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-2">
                          {votingStats.topProjects?.[0]?.votes || 0} votes
                        </p>
                      </div>
                    </div>

                    {/* Top Projects */}
                    {votingStats.topProjects && votingStats.topProjects.length > 0 && (
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <p className="font-bold text-foreground mb-4">Top Voted Projects</p>
                        <div className="space-y-3">
                          {votingStats.topProjects.map((project, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-bold text-foreground">{idx + 1}. {project.title}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-1">{project.teamName}</p>
                              </div>
                              <Badge className="bg-digital-cyan/20 text-digital-cyan border-none font-bold animate-pulse">
                                {project.voteCount} votes
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-8">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle>Projects Management</CardTitle>
                <CardDescription>View all submitted projects and their status. Project deletion is admin-only.</CardDescription>
              </CardHeader>
              <CardContent>
                {projectsQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 bg-white/5 rounded-lg">No projects found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/10">
                        <tr>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Title</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Team</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Submitted By</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Status</th>
                          <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project: any) => {
                          const creator = users.find((u: any) => u.id === project.createdBy);
                          const status = String(project.status || "draft");

                          return (
                            <tr key={project.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-bold text-foreground">{project.title || "Untitled"}</td>
                              <td className="py-3 px-4 text-muted-foreground font-medium">{project.teamName || "—"}</td>
                              <td className="py-3 px-4 text-muted-foreground font-medium">{creator?.name || creator?.email || `User #${project.createdBy}`}</td>
                              <td className="py-3 px-4">
                                <Badge
                                  className={
                                    status === "approved"
                                      ? "bg-leaf-green/20 text-leaf-green border-none font-bold"
                                      : status === "submitted"
                                        ? "bg-amber-500/20 text-amber-600 border-none font-bold"
                                        : status === "rejected"
                                          ? "bg-rose-500/20 text-rose-600 border-none font-bold"
                                          : status === "finalist"
                                            ? "bg-indigo-500/20 text-indigo-600 border-none font-bold"
                                            : "glass-card border-white/20 font-bold"
                                  }
                                >
                                  {status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteProject(project.id)}
                                  disabled={deleteProjectMutation.isPending}
                                  className="font-bold h-8"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Journey Videos Tab */}
          <TabsContent value="journey" className="space-y-8">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle>Journey Cinema Management</CardTitle>
                <CardDescription>Review and remove uploaded journey videos/posts</CardDescription>
              </CardHeader>
              <CardContent>
                {journeyPostsQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : journeyPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 bg-white/5 rounded-lg">No journey posts found</p>
                ) : (
                  <div className="space-y-3">
                    {journeyPosts.map((post) => (
                      <div key={post.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Video className="h-4 w-4 text-primary" />
                            <p className="text-sm font-bold text-foreground truncate">{post.title || "Untitled"}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">Student: {post.studentName || "Unknown"} ({post.studentEmail || "No email"})</p>
                          <p className="text-xs text-muted-foreground truncate">Project: {post.projectTitle || "Unknown project"} {post.weekNumber ? `• Week ${post.weekNumber}` : ""}</p>
                          {post.videoUrl && (
                            <a
                              href={post.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 text-xs font-bold text-cyan-600 hover:text-cyan-500"
                            >
                              Open video
                            </a>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteJourneyPost(post.id)}
                          disabled={deleteJourneyPostMutation.isPending}
                          className="font-bold"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
