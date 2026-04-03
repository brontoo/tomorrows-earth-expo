import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface Project {
  id: number;
  title: string;
  abstract?: string;
  teamName: string;
  categoryId: number;
  subcategoryId?: number;
  thumbnailUrl?: string;
  status: string;
  voteCount?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface InnovationHubEnhancedProps {
  projects: Project[];
  categories: Category[];
  selectedCategorySlug?: string;
  onProjectSelect: (projectId: number) => void;
}

type SortOption = "newest" | "most-voted" | "alphabetical";

export function InnovationHubEnhanced({
  projects,
  categories,
  selectedCategorySlug,
  onProjectSelect,
}: InnovationHubEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter((p) => p.status === "approved");

    // Filter by category if selected
    if (selectedCategorySlug) {
      const category = categories.find((c) => c.slug === selectedCategorySlug);
      if (category) {
        filtered = filtered.filter((p) => p.categoryId === category.id);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.teamName.toLowerCase().includes(query) ||
          p.abstract?.toLowerCase().includes(query)
      );
    }

    // Sort projects
    const sorted = [...filtered];
    switch (sortBy) {
      case "most-voted":
        sorted.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
        break;
      case "alphabetical":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
      default:
        // Assuming newer projects have higher IDs
        sorted.sort((a, b) => b.id - a.id);
        break;
    }

    return sorted;
  }, [projects, categories, selectedCategorySlug, searchQuery, sortBy]);

  const getCategoryName = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by title, team name, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="most-voted">Most Voted</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold">{filteredProjects.length}</span> approved
          {selectedCategorySlug && ` ${getCategoryName(categories.find((c) => c.slug === selectedCategorySlug)?.id || 0)}`}{" "}
          projects
        </p>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
              {project.thumbnailUrl && (
                <div className="h-48 bg-muted overflow-hidden">
                  <img
                    src={project.thumbnailUrl}
                    alt={project.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <CardHeader>
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-fit">
                    {getCategoryName(project.categoryId)}
                  </Badge>
                  <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                  <CardDescription>{project.teamName}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.abstract && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{project.abstract}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  {project.voteCount !== undefined && (
                    <span className="text-sm font-medium">{project.voteCount} votes</span>
                  )}
                  <Button size="sm" onClick={() => onProjectSelect(project.id)}>
                    View Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No projects found matching your criteria.</p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
