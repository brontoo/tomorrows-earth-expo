import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Heart, Check } from "lucide-react";

export default function Vote() {
  const [votedProjects, setVotedProjects] = useState<Set<number>>(new Set());
  const [voterIdentifier] = useState(() => {
    // Use a combination of browser fingerprint and session
    const stored = localStorage.getItem("voter_id");
    if (stored) return stored;
    const newId = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("voter_id", newId);
    return newId;
  });

  const { data: projects } = trpc.projects.getAll.useQuery();
  const { data: categories } = trpc.categories.getAll.useQuery();
  const utils = trpc.useUtils();

  const voteMutation = trpc.voting.vote.useMutation({
    onSuccess: (_, variables) => {
      setVotedProjects((prev) => {
        const newSet = new Set(prev);
        newSet.add(variables.projectId);
        return newSet;
      });
      toast.success("Vote submitted! Thank you for participating!");
      utils.voting.getLeaderboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const approvedProjects = projects?.filter((p) => p.status === "approved" || p.status === "finalist") || [];

  const handleVote = async (projectId: number) => {
    await voteMutation.mutateAsync({
      projectId,
      voterIdentifier,
    });
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

        {/* Projects Grid */}
        {approvedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedProjects.map((project) => {
              const category = categories?.find((c) => c.id === project.categoryId);
              const hasVoted = votedProjects.has(project.id);

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
                      disabled={hasVoted || voteMutation.isPending}
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
