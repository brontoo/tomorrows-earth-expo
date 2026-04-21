import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { Maximize2, Play, UploadCloud } from "lucide-react";
import { toast } from "sonner";

type JourneyVideoPost = {
  id: number;
  projectId: number;
  title: string;
  content: string;
  videoUrl: string | null;
  weekNumber: number | null;
  studentName: string | null;
  studentEmail: string | null;
  teamName: string | null;
  projectGrade: string | null;
  projectCategoryId: number | null;
};

export default function JourneyCinema() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [weekNumber, setWeekNumber] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const utils = trpc.useUtils();
  const { data: journeyPosts } = trpc.journeyPosts.getAll.useQuery();
  const { data: categories } = trpc.categories.getAll.useQuery();
  const { data: myProjects = [] } = trpc.projects.getMyProjects.useQuery(undefined, {
    enabled: user?.role === "student",
  });

  const createJourneyMutation = trpc.journeyPosts.create.useMutation({
    onSuccess: async () => {
      await utils.journeyPosts.getAll.invalidate();
      toast.success("Journey video uploaded successfully.");
      setVideoFile(null);
      setVideoUrlInput("");
      setPostTitle("");
      setPostDescription("");
      setWeekNumber("");
      setSelectedProjectId("");
    },
    onError: (error) => {
      toast.error(`Failed to upload journey video: ${error.message}`);
    },
  });

  const allJourneyPosts = (journeyPosts as JourneyVideoPost[] | undefined) || [];
  const postsWithVideos = allJourneyPosts.filter((post) => post.videoUrl);

  const eligibleStudentProjects = useMemo(() => {
    return (myProjects as any[])
      .filter((project) => project.status && project.status !== "draft")
      .map((project) => ({
        id: project.id,
        label: `${project.title || "Untitled"} (${project.teamName || "Team"})`,
      }));
  }, [myProjects]);

  const uploadVideoToStorage = async (file: File) => {
    if (!user?.id) {
      throw new Error("User not found");
    }

    const ext = file.name.split(".").pop() || "mp4";
    const key = `journey-videos/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("project-files")
      .upload(key, file, { upsert: false, contentType: file.type });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from("project-files").getPublicUrl(key);
    return data.publicUrl;
  };

  const handleCreateJourneyVideo = async () => {
    if (user?.role !== "student") return;

    if (!selectedProjectId) {
      toast.error("Please select one of your submitted projects.");
      return;
    }
    if (!postTitle.trim()) {
      toast.error("Please add a title for this journey step.");
      return;
    }

    const hasFile = Boolean(videoFile);
    const hasUrl = Boolean(videoUrlInput.trim());
    if (!hasFile && !hasUrl) {
      toast.error("Please upload a video file or paste a video URL.");
      return;
    }

    setIsUploading(true);
    try {
      let finalVideoUrl = videoUrlInput.trim();
      if (videoFile) {
        finalVideoUrl = await uploadVideoToStorage(videoFile);
      }

      await createJourneyMutation.mutateAsync({
        projectId: Number(selectedProjectId),
        title: postTitle.trim(),
        content: postDescription.trim() || "Journey step update",
        videoUrl: finalVideoUrl,
        weekNumber: weekNumber ? Number(weekNumber) : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredPosts = postsWithVideos.filter((post) => {
    const categoryMatch =
      selectedCategory === "all" || post.projectCategoryId === parseInt(selectedCategory, 10);
    const gradeMatch = selectedGrade === "all" || post.projectGrade === selectedGrade;
    return categoryMatch && gradeMatch;
  });

  const grades = Array.from(
    new Set(postsWithVideos.map((p) => p.projectGrade).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Journey Cinema</h1>
          <p className="text-lg text-muted-foreground">
            Watch student teams document their innovation journey from concept to completion
          </p>
        </div>

        {user?.role === "student" && (
          <Card className="mb-8 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold">Upload Your Journey Video</h2>
              <p className="text-sm text-muted-foreground">
                As a student, you can publish step-by-step videos for your submitted projects.
              </p>

              {eligibleStudentProjects.length === 0 ? (
                <p className="text-sm text-amber-600">
                  You do not have submitted projects yet. Submit a project first, then upload journey videos.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your project" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleStudentProjects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Week Number (optional)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={weekNumber}
                        onChange={(e) => setWeekNumber(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Video Title</Label>
                    <Input
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="e.g. Prototype Testing Day"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={postDescription}
                      onChange={(e) => setPostDescription(e.target.value)}
                      placeholder="Describe what happened in this step"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Upload Video File</Label>
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Or Paste Video URL</Label>
                      <Input
                        type="url"
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <Button onClick={handleCreateJourneyVideo} disabled={isUploading || createJourneyMutation.isPending}>
                    <UploadCloud className="mr-2" size={16} />
                    {isUploading ? "Uploading..." : "Publish Journey Video"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[220px]">
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
            <SelectTrigger className="w-full sm:w-[220px]">
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

        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => {
              const category = categories?.find((c) => c.id === post.projectCategoryId);
              return (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-video bg-black group">
                    <video src={post.videoUrl || ""} className="w-full h-full object-cover" />
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
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground/80">
                        Uploaded by: {post.studentName || post.studentEmail || "Student"}
                      </p>
                      {post.teamName && <p>{post.teamName}</p>}
                      <div className="flex items-center gap-2">
                        {post.projectGrade && <span>Grade {post.projectGrade}</span>}
                        {category && <span>• {category.name}</span>}
                      </div>
                      {post.weekNumber && <p className="text-xs">Week {post.weekNumber}</p>}
                    </div>
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

      {fullscreenVideo && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreenVideo(null)}
        >
          <div className="relative w-full h-full max-w-7xl max-h-screen p-4">
            <video src={fullscreenVideo} controls autoPlay className="w-full h-full object-contain" />
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
