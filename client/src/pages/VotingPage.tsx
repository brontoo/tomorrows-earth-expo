import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Heart, AlertCircle, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import PageNavigation from "@/components/PageNavigation";

export default function VotingPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Queries
  const { data: allProjects } = trpc.projects.getAll.useQuery();
  const { data: votingStats } = trpc.admin.getVotingStats.useQuery();
  // const { data: userVotes } = trpc.voting.getUserVotes.useQuery();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  // Mutations
  const voteMutation = trpc.voting.vote.useMutation({
    onSuccess: () => {
      toast.success("Vote submitted successfully!");
      setSelectedProjectId(null);
    },
    onError: (error) => {
      toast.error(`Failed to vote: ${error.message}`);
    },
  });

  // Filter approved projects only
  const approvedProjects = allProjects?.filter((p: any) => p.status === "approved") || [];

  // Sort by vote count
  const sortedProjects = [...approvedProjects].sort((a: any, b: any) => (b.voteCount || 0) - (a.voteCount || 0));

  const handleVote = async (projectId: number) => {
    if (!user) {
      toast.error("Please log in to vote");
      return;
    }

    try {
      await voteMutation.mutateAsync({ projectId, voterIdentifier: user.id?.toString() || "anonymous" });
    } catch (error) {
      console.error("Voting error:", error);
    }
  };

  const isVotingOpen = votingStats?.votingOpen ?? false;
  const userHasVoted = false; // Check from user's voting history
  const maxVotes = 1; // One vote per user

  return (
    <div className="min-h-screen bg-background">
      <PageNavigation />
      <Navigation />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">People's Choice Voting</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Vote for your favorite sustainability innovation project. Every vote counts!
          </p>
        </div>

        {/* Voting Status */}
        {!isVotingOpen && (
          <Alert className="mb-8 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Voting is currently closed. Check back during the voting period to cast your vote!
            </AlertDescription>
          </Alert>
        )}

        {isVotingOpen && userHasVoted && (
          <Alert className="mb-8 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Thank you for voting! You have already cast your vote.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {votingStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{votingStats.totalVotes}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Projects Receiving Votes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{votingStats.topProjects.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Voting Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={isVotingOpen ? "default" : "secondary"}>
                  {isVotingOpen ? "Open" : "Closed"}
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects for Voting */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Vote for Your Favorite Project</h2>

          {sortedProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No approved projects available for voting yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProjects.map((project: any, index: number) => {
                const totalVotes = votingStats?.totalVotes || 1;
                const projectVotes = project.voteCount || 0;
                const votePercentage = (projectVotes / totalVotes) * 100;

                return (
                  <Card
                    key={project.id}
                    className={`hover:shadow-lg transition-all cursor-pointer ${
                      selectedProjectId === project.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {project.thumbnailUrl && (
                      <div className="h-40 bg-muted overflow-hidden">
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <CardHeader>
                      {index === 0 && (
                        <div className="mb-2">
                          <Badge className="bg-yellow-500">
                            <Trophy className="h-3 w-3 mr-1" /> Leading
                          </Badge>
                        </div>
                      )}
                      <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                      <CardDescription>{project.teamName}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {project.abstract && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.abstract}</p>
                      )}

                      {/* Vote Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{projectVotes} votes</span>
                          <span className="text-muted-foreground">{Math.round(votePercentage)}%</span>
                        </div>
                        <Progress value={votePercentage} className="h-2" />
                      </div>

                      {/* Vote Button */}
                      <Button
                        className="w-full gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(project.id);
                        }}
                        disabled={!isVotingOpen || userHasVoted || voteMutation.isPending}
                        variant={selectedProjectId === project.id ? "default" : "outline"}
                      >
                        {voteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Heart className="h-4 w-4" />
                        )}
                        {userHasVoted ? "You voted" : "Vote"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Projects */}
        {votingStats && votingStats.topProjects.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Top Projects</h2>
            <div className="space-y-3">
              {votingStats.topProjects.slice(0, 5).map((project: any, index: number) => (
                <Card key={project.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg font-bold w-10 h-10 flex items-center justify-center">
                        #{index + 1}
                      </Badge>
                      <div>
                        <p className="font-semibold">{project.title}</p>
                        <p className="text-sm text-muted-foreground">{project.teamName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{project.voteCount}</p>
                      <p className="text-xs text-muted-foreground">votes</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
