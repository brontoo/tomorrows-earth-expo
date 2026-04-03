import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { X, Play, Pause, Trophy } from "lucide-react";
import { Link } from "wouter";

type DisplayMode = "journey" | "leaderboard" | "winners";

export default function WallMode() {
  const { user } = useAuth();
  const [mode, setMode] = useState<DisplayMode>("journey");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const { data: journeyPosts } = trpc.journeyPosts.getAll.useQuery();
  const { data: leaderboard } = trpc.voting.getLeaderboard.useQuery();
  const { data: projects } = trpc.projects.getAll.useQuery();

  const videoPosts = journeyPosts?.filter((post) => post.videoUrl) || [];
  const finalistProjects = projects?.filter((p) => p.status === "finalist") || [];

  useEffect(() => {
    if (isPlaying && mode === "journey" && videoPosts.length > 0) {
      const timer = setInterval(() => {
        setCurrentVideoIndex((prev) => (prev + 1) % videoPosts.length);
      }, 30000); // Change video every 30 seconds
      return () => clearInterval(timer);
    }
  }, [isPlaying, mode, videoPosts.length]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
            <p className="text-muted-foreground mb-6">
              Wall Mode is only accessible to administrators.
            </p>
            <Button asChild>
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? "wall-mode" : "min-h-screen bg-background"}`}>
      {!isFullscreen && (
        <div className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Wall Mode Control</h1>
              <p className="text-muted-foreground">
                Expo Day large screen display system
              </p>
            </div>
            <Button size="lg" onClick={enterFullscreen}>
              Launch Fullscreen
            </Button>
          </div>

          <div className="flex gap-4 mb-6">
            <Button
              variant={mode === "journey" ? "default" : "outline"}
              onClick={() => setMode("journey")}
            >
              Journey Videos
            </Button>
            <Button
              variant={mode === "leaderboard" ? "default" : "outline"}
              onClick={() => setMode("leaderboard")}
            >
              Voting Leaderboard
            </Button>
            <Button
              variant={mode === "winners" ? "default" : "outline"}
              onClick={() => setMode("winners")}
            >
              Winners Reveal
            </Button>
          </div>
        </div>
      )}

      {/* Fullscreen Display */}
      <div className={isFullscreen ? "h-screen" : "container pb-8"}>
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMode("journey")}
            >
              Journey
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMode("leaderboard")}
            >
              Leaderboard
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMode("winners")}
            >
              Winners
            </Button>
            <Button variant="secondary" size="sm" onClick={exitFullscreen}>
              <X size={20} />
            </Button>
          </div>
        )}

        {/* Journey Videos Mode */}
        {mode === "journey" && (
          <div className={`${isFullscreen ? "h-full" : "aspect-video"} bg-black relative`}>
            {videoPosts.length > 0 ? (
              <>
                <video
                  key={videoPosts[currentVideoIndex]?.id}
                  src={videoPosts[currentVideoIndex]?.videoUrl || ""}
                  autoPlay={isPlaying}
                  loop
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-8 left-8 right-8 bg-black/80 backdrop-blur-sm rounded-lg p-6 text-white">
                  <h2 className="text-3xl font-bold mb-2">
                    {videoPosts[currentVideoIndex]?.title}
                  </h2>
                  <p className="text-xl opacity-80">
                    {projects?.find((p) => p.id === videoPosts[currentVideoIndex]?.projectId)?.teamName}
                  </p>
                </div>
                <div className="absolute bottom-8 right-8 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎬</div>
                  <p className="text-2xl">No journey videos available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Mode */}
        {mode === "leaderboard" && (
          <div className={`${isFullscreen ? "h-full p-12" : ""} bg-gradient-to-br from-primary/20 to-digital-cyan/20`}>
            <div className="max-w-6xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold text-center mb-12">
                🏆 People's Choice Voting
              </h1>
              <div className="space-y-4">
                {leaderboard?.slice(0, 10).map((entry, index) => {
                  const project = projects?.find((p) => p.id === entry.projectId);
                  return (
                    <Card key={entry.projectId} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className={`text-4xl font-bold ${
                            index === 0 ? "text-yellow-500" :
                            index === 1 ? "text-gray-400" :
                            index === 2 ? "text-amber-700" :
                            "text-muted-foreground"
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-1">{project?.title}</h3>
                            <p className="text-lg text-muted-foreground">{project?.teamName}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold text-primary">
                              {entry.voteCount}
                            </div>
                            <p className="text-sm text-muted-foreground">votes</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Winners Mode */}
        {mode === "winners" && (
          <div className={`${isFullscreen ? "h-full p-12" : ""} bg-gradient-to-br from-yellow-500/20 via-primary/20 to-digital-cyan/20`}>
            <div className="max-w-6xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold text-center mb-12">
                <Trophy className="inline-block mr-4" size={64} />
                Finalists & Winners
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {finalistProjects.map((project) => (
                  <Card key={project.id} className="overflow-hidden">
                    {project.thumbnailUrl ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-primary/10 flex items-center justify-center text-6xl">
                        🏆
                      </div>
                    )}
                    <CardContent className="p-6">
                      <Badge className="mb-3">Finalist</Badge>
                      <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                      <p className="text-muted-foreground">{project.teamName}</p>
                      <p className="text-sm text-muted-foreground mt-1">Grade {project.grade}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {finalistProjects.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-2xl">Winners will be announced soon!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
