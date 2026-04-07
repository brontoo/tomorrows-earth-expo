import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Users, BarChart3, Settings, Vote, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import PageNavigation from "@/components/PageNavigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
        <div className="container py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
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
        <PageNavigation />
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
      <PageNavigation />
      <AdminDashboardContent />
    </>
  );
}

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState("overview");

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
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUserMutation.mutateAsync({ userId });
      usersQuery.refetch();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-digital-cyan/10 via-background to-background">
      <div className="container py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3 hero-text-glow">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground font-medium">Manage the Tomorrow's Earth Expo platform</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 rounded-xl p-1 mb-8">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Overview</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Users</TabsTrigger>
            <TabsTrigger value="event" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Event Settings</TabsTrigger>
            <TabsTrigger value="voting" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Voting</TabsTrigger>
          </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {statsQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Users</div>
                  <div className="text-4xl font-black text-foreground">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-2">
                    {stats.totalStudents} students, {stats.totalTeachers} teachers
                  </p>
                </div>

                <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Projects</div>
                  <div className="text-4xl font-black text-primary">{stats.totalProjects}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-2">
                    {stats.approvedProjects} approved, {stats.pendingProjects} pending
                  </p>
                </div>

                <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Votes</div>
                  <div className="text-4xl font-black text-digital-cyan">{stats.totalVotes}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-2">People's Choice votes</p>
                </div>

                <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Admins</div>
                  <div className="text-4xl font-black text-foreground">{stats.totalAdmins}</div>
                  <p className="text-xs text-muted-foreground font-medium mt-2">Platform administrators</p>
                </div>
              </div>

              {/* Activity Logs */}
              <div className="glass-card p-8 rounded-3xl mt-8 border-white/10">
                <h3 className="text-2xl font-black mb-2 text-foreground">Recent Activity</h3>
                <p className="text-sm text-muted-foreground font-medium mb-6">Latest platform activity</p>
                <div className="space-y-4">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-white/5 p-4 rounded-xl text-center">No recent activity</p>
                  ) : (
                    activityLogs.slice(0, 10).map((log, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm border-b border-border/10 pb-4 last:border-0">
                        <div>
                          <p className="font-bold text-foreground">{(log as any).action || (log as any).status || "Activity"}</p>
                          <p className="text-xs text-muted-foreground font-medium mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="glass-card border-white/20 px-3 py-1 font-bold">{(log as any).newStatus || (log as any).status || "—"}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="glass-card p-8 rounded-3xl border-white/10">
            <h3 className="text-2xl font-black mb-2">User Management</h3>
            <p className="text-sm text-muted-foreground font-medium mb-6">Manage platform users and their roles</p>
            
            {usersQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center bg-white/5 p-4 rounded-xl">No users found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border/10">
                        <tr className="text-muted-foreground font-bold tracking-wider uppercase text-xs">
                          <th className="text-left py-3 px-3">Name</th>
                          <th className="text-left py-3 px-3">Email</th>
                          <th className="text-left py-3 px-3">Role</th>
                          <th className="text-left py-3 px-3">Status</th>
                          <th className="text-left py-3 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-border/5 hover:bg-white/5 transition-colors duration-200">
                            <td className="py-3 px-3 font-bold">{u.name || "—"}</td>
                            <td className="py-3 px-3 text-muted-foreground font-medium">{u.email}</td>
                            <td className="py-3 px-3">
                              <Badge variant="outline" className="glass-card border-white/20 capitalize font-bold">{u.role}</Badge>
                            </td>
                            <td className="py-3 px-3">
                              {u.approved ? (
                                <Badge variant="default" className="bg-leaf-green/20 text-leaf-green hover:bg-leaf-green/30 border-none font-bold">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground font-bold border-white/20">Inactive</Badge>
                              )}
                            </td>
                            <td className="py-3 px-3 space-x-2">
                              {!u.approved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserStatusChange(u.id, true)}
                                  disabled={updateUserStatusMutation.isPending}
                                  className="glass-card hover:bg-white/10 font-bold"
                                >
                                  Activate
                                </Button>
                              )}
                              {u.approved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserStatusChange(u.id, false)}
                                  disabled={updateUserStatusMutation.isPending}
                                  className="glass-card hover:bg-white/10 font-bold"
                                >
                                  Deactivate
                                </Button>
                              )}
                              {u.role !== "admin" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={deleteUserMutation.isPending}
                                  className="font-bold"
                                >
                                  Delete
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Event Settings Tab */}
        <TabsContent value="event" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Settings</CardTitle>
              <CardDescription>Configure expo event details</CardDescription>
            </CardHeader>
            <CardContent>
              {eventSettingsQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : eventSettings ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Event Date</label>
                    <Input
                      type="date"
                      defaultValue={eventSettings.eventDate}
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Event Location</label>
                    <Input
                      defaultValue={eventSettings.eventLocation}
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Submission Deadline</label>
                    <Input
                      type="date"
                      defaultValue={eventSettings.submissionDeadline}
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Event settings are currently read-only. Edit them through the system configuration.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voting Tab */}
        <TabsContent value="voting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voting Management</CardTitle>
              <CardDescription>Control voting periods and view voting statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {votingStatsQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : votingStats ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Voting Status</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {votingStats.votingOpen ? "Voting is currently OPEN" : "Voting is currently CLOSED"}
                      </p>
                    </div>
                    <Button
                      onClick={handleToggleVoting}
                      disabled={toggleVotingMutation.isPending}
                      variant={votingStats.votingOpen ? "destructive" : "default"}
                    >
                      {toggleVotingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      {votingStats.votingOpen ? "Close Voting" : "Open Voting"}
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Voting Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-3xl font-bold">{votingStats.totalVotes}</div>
                          <p className="text-sm text-muted-foreground mt-1">Total votes cast</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-3xl font-bold">{votingStats.topProjects.length}</div>
                          <p className="text-sm text-muted-foreground mt-1">Projects with votes</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {votingStats.topProjects.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4">Top Projects by Votes</h3>
                      <div className="space-y-3">
                        {votingStats.topProjects.map((project, idx) => (
                          <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">{idx + 1}. {project.title}</p>
                              <p className="text-xs text-muted-foreground">{project.teamName}</p>
                            </div>
                            <Badge variant="default">{project.voteCount} votes</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
