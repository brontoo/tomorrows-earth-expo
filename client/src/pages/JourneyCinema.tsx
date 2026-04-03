import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Maximize2, Play } from "lucide-react";
import PageNavigation from "@/components/PageNavigation";

export default function JourneyCinema() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);

  const { data: journeyPosts } = trpc.journeyPosts.getAll.useQuery();
  const { data: categories } = trpc.categories.getAll.useQuery();
  const { data: allProjects } = trpc.projects.getAll.useQuery();

  const postsWithVideos = journeyPosts?.filter((post: any) => post.videoUrl) || [];

  const filteredPosts = postsWithVideos.filter((post: any) => {
    const project = allProjects?.find((p: any) => p.id === post.projectId);
    if (!project) return false;

    const categoryMatch =
      selectedCategory === "all" || project.categoryId === parseInt(selectedCategory);
    const gradeMatch = selectedGrade === "all" || project.grade === selectedGrade;

    return categoryMatch && gradeMatch;
  });

  const grades = Array.from(
    new Set(allProjects?.map((p) => p.grade).filter(Boolean))
  ).sort();

  return (
    <div className="min-h-screen bg-background">
      <PageNavigation />
      <Navigation />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Journey Cinema</h1>
          <p className="text-lg text-muted-foreground">
            Watch student teams document their innovation journey from concept to completion
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  Grade {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(selectedCategory !== "all" || selectedGrade !== "all") && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedGrade("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Video Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => {
              const project = allProjects?.find((p) => p.id === post.projectId);
              const category = categories?.find((c) => c.id === project?.categoryId);

              return (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-video bg-black group">
                    <video
                      src={post.videoUrl || ""}
                      className="w-full h-full object-cover"
                      poster={project?.thumbnailUrl || ""}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <Button
                        size="lg"
                        className="rounded-full"
                        onClick={() => setFullscreenVideo(post.videoUrl || null)}
                      >
                        <Play className="mr-2" size={20} />
                        Play
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => setFullscreenVideo(post.videoUrl || null)}
                      >
                        <Maximize2 size={20} />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{post.title}</h3>
                    {project && (
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{project.teamName}</p>
                        <div className="flex items-center gap-2">
                          <span>Grade {project.grade}</span>
                          {category && <span>• {category.name}</span>}
                        </div>
                        {post.weekNumber && (
                          <p className="text-xs">Week {post.weekNumber}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-20 text-center">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-2xl font-semibold mb-2">No Journey Videos Yet</h3>
              <p className="text-muted-foreground">
                Student teams will share their journey videos as they work on their projects.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fullscreen Video Modal */}
      {fullscreenVideo && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreenVideo(null)}
        >
          <div className="relative w-full h-full max-w-7xl max-h-screen p-4">
            <video
              src={fullscreenVideo}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
            <Button
              variant="secondary"
              className="absolute top-8 right-8"
              onClick={() => setFullscreenVideo(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
