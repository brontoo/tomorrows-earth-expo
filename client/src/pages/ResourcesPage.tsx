import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Video, BookOpen, Search, Filter } from "lucide-react";

type ResourceCategory = "guides" | "rubrics" | "templates" | "videos";

interface Resource {
  id: number;
  title: string;
  description: string;
  category: ResourceCategory;
  url: string;
  fileType: string;
  isPublic: boolean;
  createdAt: Date;
}

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | "all">("all");

  // Mock data - in production, this would come from tRPC
  const resources: Resource[] = [
    {
      id: 1,
      title: "Project Submission Guide",
      description: "Complete guide on how to submit your sustainability project",
      category: "guides",
      url: "#",
      fileType: "PDF",
      isPublic: true,
      createdAt: new Date("2026-01-15"),
    },
    {
      id: 2,
      title: "Evaluation Rubric",
      description: "Rubric used by teachers to evaluate student projects",
      category: "rubrics",
      url: "#",
      fileType: "PDF",
      isPublic: true,
      createdAt: new Date("2026-01-10"),
    },
    {
      id: 3,
      title: "Project Proposal Template",
      description: "Template for writing your project proposal",
      category: "templates",
      url: "#",
      fileType: "DOCX",
      isPublic: true,
      createdAt: new Date("2026-01-05"),
    },
    {
      id: 4,
      title: "Sustainability Basics",
      description: "Introduction to sustainability concepts and principles",
      category: "videos",
      url: "#",
      fileType: "Video",
      isPublic: true,
      createdAt: new Date("2025-12-20"),
    },
  ];

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;
    return matchesSearch && matchesCategory && resource.isPublic;
  });

  const getCategoryIcon = (category: ResourceCategory) => {
    switch (category) {
      case "guides":
        return <BookOpen className="h-5 w-5" />;
      case "rubrics":
        return <FileText className="h-5 w-5" />;
      case "templates":
        return <FileText className="h-5 w-5" />;
      case "videos":
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: ResourceCategory) => {
    switch (category) {
      case "guides":
        return "bg-blue-100 text-blue-800";
      case "rubrics":
        return "bg-purple-100 text-purple-800";
      case "templates":
        return "bg-green-100 text-green-800";
      case "videos":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Resources & Learning</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access guides, rubrics, templates, and educational videos to help you succeed in the expo.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="guides">Guides</SelectItem>
                <SelectItem value="rubrics">Rubrics</SelectItem>
                <SelectItem value="templates">Templates</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resources Grid */}
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-muted">{getCategoryIcon(resource.category)}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                        <Badge className={`mt-2 ${getCategoryColor(resource.category)}`}>
                          {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{resource.description}</p>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-xs text-muted-foreground">{resource.fileType}</span>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No resources found matching your search.</p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
