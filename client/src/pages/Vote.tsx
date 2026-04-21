import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Heart, Check, AlertCircle } from "lucide-react";

export default function Vote() {
  const [voterIdentifier] = useState(() => {
    const stored = localStorage.getItem("voter_id");
    if (stored) return stored;
    const newId = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("voter_id", newId);
    return newId;
  });

  const { data: projects } = trpc.projects.getPublic.useQuery();
  const { data: categories } = trpc.categories.getAll.useQuery();
  const { data: votingConfig } = trpc.config.get.useQuery({ key: "votingOpen" });
  const { data: priorVotes } = trpc.voting.getUserVotes.useQuery({ voterIdentifier });
  const utils = trpc.useUtils();

  const voteMutation = trpc.voting.vote.useMutation({
    onSuccess: () => {
      utils.voting.getUserVotes.invalidate({ voterIdentifier });
      utils.voting.getLeaderboard.invalidate();
      toast.success("Vote submitted! Thank you for participating!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isVotingOpen = votingConfig?.value === "true";
  const votedProjectIds = new Set(priorVotes ?? []);

  const handleVote = (projectId: number) => {
    voteMutation.mutate({ projectId, voterIdentifier });
  };

  const getCategoryClass = (colorTheme: string) => {
    const themeMap: Record<string, string> = {
      "earth-brown": "category-earth-brown",
      "electric-blue": "category-electric-blue",
      "leaf-green": "category-leaf-green",
      "digital-cyan": "category-digital-cyan",
    };
    return themeMap[colorTheme] || "bg-primary";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">❤️</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">People's Choice Award</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Vote for your favorite projects! Each visitor can vote once per project.
            Your votes help recognize outstanding student innovation.
          </p>
        </div>

        {/* Voting closed banner */}
        {!isVotingOpen && (
          <Alert className="mb-8 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Voting is currently closed. Check back during the voting period to cast your vote!
            </AlertDescription>
          </Alert>
        )}

        {/* Projects Grid */}
        {(projects ?? []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(projects ?? []).map((project) => {
              const category = categories?.find((c) => c.id === project.categoryId);
              const hasVoted = votedProjectIds.has(project.id);

              return (
                <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Thumbnail */}
                  {project.thumbnailUrl ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={project.thumbnailUrl}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`h-48 flex items-center justify-center text-6xl ${
                        category ? getCategoryClass(category.colorTheme) : "bg-muted"
                      }`}
                    >
                      🌍
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                      {project.status === "finalist" && (
                        <Badge variant="default" className="shrink-0">
                          Finalist
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{project.teamName}</p>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>Grade {project.grade}</span>
                      {category && (
                        <Badge variant="outline" className="text-xs">
                          {category.name}
                        </Badge>
                      )}
                    </div>
                    {project.abstract && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {project.abstract}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => handleVote(project.id)}
                      disabled={!isVotingOpen || hasVoted || voteMutation.isPending}
                      variant={hasVoted ? "secondary" : "default"}
                    >
                      {hasVoted ? (
                        <>
                          <Check className="mr-2" size={16} />
                          Voted
                        </>
                      ) : (
                        <>
                          <Heart className="mr-2" size={16} />
                          Vote for this Project
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-20 text-center text-muted-foreground">
              <div className="text-6xl mb-4">🗳️</div>
              <h3 className="text-2xl font-semibold mb-2">Voting Opens Soon</h3>
              <p>
                Projects will be available for voting once they are approved and the Expo begins.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
