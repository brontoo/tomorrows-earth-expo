import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Users, Award } from "lucide-react";
import QRCode from "react-qr-code";
import PageNavigation from "@/components/PageNavigation";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");

  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: categories } = trpc.categories.getAll.useQuery();
  const { data: journeyPosts } = trpc.journeyPosts.getByProject.useQuery({ projectId });
  const { data: comments } = trpc.comments.getByProject.useQuery({ projectId });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
        <Navigation />
        <div className="container py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
        <Navigation />
        <div className="container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <Link href="/innovation-hub">
            <Button>Back to Innovation Hub</Button>
          </Link>
        </div>
      </div>
    );
  }

  const category = categories?.find((c) => c.id === project.categoryId);
  const imageUrls = project.imageUrls ? JSON.parse(project.imageUrls) : [];
  const sdgAlignment = project.sdgAlignment ? JSON.parse(project.sdgAlignment) : [];
  const projectUrl = `${window.location.origin}/project/${project.id}`;

  return (
    <div className="min-h-screen bg-background">
      <PageNavigation />
      <Navigation />

      <div className="container py-12">
        {/* Back Button */}
        <Link href="/innovation-hub">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2" size={16} />
            Back to Innovation Hub
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">{project.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users size={20} />
                  <span className="font-medium">{project.teamName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={20} />
                  <span>Grade {project.grade}</span>
                </div>
                {category && (
                  <Badge variant="outline">{category.name}</Badge>
                )}
                {project.status === "finalist" && (
                  <Badge variant="default">Finalist</Badge>
                )}
              </div>
            </div>

            {/* QR Code */}
            <Card className="hidden md:block">
              <CardContent className="p-4">
                <div className="qr-code-container">
                  <QRCode value={projectUrl} size={128} />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Scan to view
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="method">Method</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="journey">Journey</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Abstract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {project.abstract || "No abstract provided yet."}
                </p>
              </CardContent>
            </Card>

            {project.scientificQuestion && (
              <Card>
                <CardHeader>
                  <CardTitle>Scientific Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.scientificQuestion}
                  </p>
                </CardContent>
              </Card>
            )}

            {sdgAlignment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>UN Sustainable Development Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sdgAlignment.map((sdg: number) => (
                      <Badge key={sdg} variant="secondary">
                        SDG {sdg}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Scientific Method Tab */}
          <TabsContent value="method" className="space-y-6">
            {project.researchMethod && (
              <Card>
                <CardHeader>
                  <CardTitle>Research Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.researchMethod}
                  </p>
                </CardContent>
              </Card>
            )}

            {project.experimentDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Experiment & Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.experimentDetails}
                  </p>
                </CardContent>
              </Card>
            )}

            {project.dataExplanation && (
              <Card>
                <CardHeader>
                  <CardTitle>Data & Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.dataExplanation}
                  </p>
                </CardContent>
              </Card>
            )}

            {!project.researchMethod && !project.experimentDetails && !project.dataExplanation && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Scientific method details will be added soon.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            {/* Images */}
            {imageUrls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Image Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {imageUrls.map((url: string, index: number) => (
                      <div key={index} className="aspect-video overflow-hidden rounded-lg">
                        <img
                          src={url}
                          alt={`Project image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Video */}
            {project.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Project Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video">
                    <video
                      src={project.videoUrl}
                      controls
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 3D Model */}
            {project.model3dUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>3D Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video">
                    <iframe
                      src={project.model3dUrl}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {imageUrls.length === 0 && !project.videoUrl && !project.model3dUrl && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Media content will be added soon.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Journey Tab */}
          <TabsContent value="journey" className="space-y-6">
            {journeyPosts && journeyPosts.length > 0 ? (
              <div className="space-y-6">
                {journeyPosts.map((post) => {
                  const postImages = post.imageUrls ? JSON.parse(post.imageUrls) : [];
                  return (
                    <Card key={post.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{post.title}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar size={16} />
                            {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {post.weekNumber && (
                          <Badge variant="outline" className="w-fit">
                            Week {post.weekNumber}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>
                        
                        {postImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {postImages.map((url: string, index: number) => (
                              <div key={index} className="aspect-square overflow-hidden rounded-lg">
                                <img
                                  src={url}
                                  alt={`Journey image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {post.videoUrl && (
                          <div className="aspect-video">
                            <video
                              src={post.videoUrl}
                              controls
                              className="w-full h-full rounded-lg"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <div className="text-4xl mb-4">📝</div>
                  <p>No journey updates yet. Check back as the team documents their progress!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
