import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Eye, ChevronDown } from "lucide-react";
import { useState } from "react";
import PageNavigation from "@/components/PageNavigation";

interface CategoryDisplay {
  id: string;
  name: string;
  icon: string;
  description: string;
  backgroundImage: string;
  slug: string;
}

const categoryDisplays: CategoryDisplay[] = [
  {
    id: "environmental",
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
    description: "Projects focused on protecting natural ecosystems and addressing climate challenges.",
    backgroundImage: "/bg-environmental.jpg",
    slug: "environmental-protection-climate-action",
  },
  {
    id: "community",
    name: "Sustainable Communities & Social Well-Being",
    icon: "🤝",
    description: "Projects that improve quality of life, inclusion, and community resilience.",
    backgroundImage: "/bg-community.jpg",
    slug: "sustainable-communities-social-wellbeing",
  },
  {
    id: "innovation",
    name: "Innovation, Technology & Green Economy",
    icon: "💡",
    description: "Projects that use innovation, AI, or entrepreneurship to create sustainable solutions.",
    backgroundImage: "/bg-innovation.jpg",
    slug: "innovation-technology-green-economy",
  },
  {
    id: "education",
    name: "Education, Awareness & Sustainable Behavior",
    icon: "📚",
    description: "Projects that promote learning, awareness, and positive environmental behavior.",
    backgroundImage: "/bg-education.jpg",
    slug: "education-awareness-sustainable-behavior",
  },
];

export default function InnovationHub() {
  const params = useParams<{ categorySlug?: string }>();
  const categorySlug = params.categorySlug;
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const { data: categories } = trpc.categories.getAll.useQuery();
  const { data: allProjects } = trpc.projects.getAll.useQuery();

  const selectedCategory = categories?.find((c) => c.slug === categorySlug);

  const filteredProjects = categorySlug
    ? allProjects?.filter((p: any) => {
        const cat = categories?.find((c: any) => c.id === p.categoryId);
        return cat?.slug === categorySlug && p.status === "approved";
      })
    : allProjects?.filter((p: any) => p.status === "approved");

  const getCategoryClass = (colorTheme: string) => {
    const themeMap: Record<string, string> = {
      "earth-brown": "category-earth-brown",
      "electric-blue": "category-electric-blue",
      "leaf-green": "category-leaf-green",
      "digital-cyan": "category-digital-cyan",
    };
    return themeMap[colorTheme] || "bg-primary";
  };

  // Show category selection view
  if (!categorySlug) {
    return (
      <div className="min-h-screen bg-background">
        <PageNavigation />
        <Navigation />

        <div className="container py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Innovation Hub</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore groundbreaking environmental innovation projects from talented high school students. Select a category to view approved projects.
            </p>
          </div>

          {/* Categories Grid - Same as Home Page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {categoryDisplays.map((categoryDisplay) => (
              <div key={categoryDisplay.id} className="h-full">
                <Card
                  className={`h-full cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden group relative ${
                    expandedCategoryId === categoryDisplay.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setExpandedCategoryId(expandedCategoryId === categoryDisplay.id ? null : categoryDisplay.id)}
                >
                  {/* Background Image with Transparent Overlay */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-70 transition-opacity duration-300"
                    style={{
                      backgroundImage: `url('${categoryDisplay.backgroundImage}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300" />

                  <CardHeader className="relative pb-3 z-10">
                    {/* Icon with Hover Animation */}
                    <div className="mb-3 inline-block text-5xl transition-transform duration-300 group-hover:scale-125 group-hover:drop-shadow-lg">
                      {categoryDisplay.icon}
                    </div>

                    <h3 className="text-lg line-clamp-2 group-hover:text-black dark:group-hover:text-white transition-colors font-serif italic font-bold text-center">
                      {categoryDisplay.name}
                    </h3>
                  </CardHeader>

                  <CardContent className="relative space-y-4 z-10">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground group-hover:text-black dark:group-hover:text-white leading-relaxed transition-colors">
                      {categoryDisplay.description}
                    </p>

                    {/* View Projects Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <Link href={`/innovation-hub/${categoryDisplay.slug}`}>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full group-hover:bg-white group-hover:text-black transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Projects
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show projects for selected category
  const displayCategory = categoryDisplays.find((c) => c.slug === categorySlug);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/innovation-hub">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2" size={16} />
              All Categories
            </Button>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {displayCategory?.name || "Innovation Hub"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {displayCategory?.description || "Explore approved projects in this category"}
          </p>
        </div>

        {/* Projects Grid */}
        {filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects?.map((project: any) => {
              const category = categories?.find((c: any) => c.id === project.categoryId);
              return (
                <Card
                  key={project.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
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
                      {displayCategory?.icon || "🌍"}
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2">
                        {project.title}
                      </h3>
                      {project.status === "finalist" && (
                        <Badge variant="default" className="shrink-0">
                          Finalist
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {project.teamName}
                    </p>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Grade {project.grade}</span>
                      {category && (
                        <Badge variant="outline" className="text-xs">
                          {category.name}
                        </Badge>
                      )}
                    </div>
                    {project.abstract && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                        {project.abstract}
                      </p>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Link href={`/project/${project.id}`}>
                      <Button variant="outline" className="w-full">
                        <Eye className="mr-2" size={16} />
                        View Project
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground">
              No approved projects in this category yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
