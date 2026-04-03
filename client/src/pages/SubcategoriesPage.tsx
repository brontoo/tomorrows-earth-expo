"use client";

import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ArrowLeft } from "lucide-react";

const categoryData: Record<string, { name: string; icon: string; subcategories: string[] }> = {
  environmental: {
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
    subcategories: [
      "Plastic reduction and recycling solutions",
      "Water conservation and purification systems",
      "Renewable energy models (solar, wind, bioenergy)",
      "Climate change mitigation and awareness projects",
    ],
  },
  community: {
    name: "Sustainable Communities & Social Well-Being",
    icon: "🤝",
    subcategories: [
      "Sustainable school or smart community designs",
      "Inclusive solutions for people with special needs",
      "Health, food security, or clean water access initiatives",
      "Community awareness and social impact projects",
    ],
  },
  innovation: {
    name: "Innovation, Technology & Green Economy",
    icon: "💡",
    subcategories: [
      "AI- or app-based sustainability tools",
      "Smart waste or energy management systems",
      "Sustainable product design and green startups",
      "Energy-efficient and future-ready technologies",
    ],
  },
  education: {
    name: "Education, Awareness & Sustainable Behavior",
    icon: "📚",
    subcategories: [
      "Educational games or interactive learning platforms",
      "Virtual labs or sustainability simulations",
      "Campaigns promoting responsible consumption",
      "School-wide sustainability action plans",
    ],
  },
};

export default function SubcategoriesPage() {
  const [, navigate] = useLocation();
  const route = useRoute("/category/:categoryId");

  if (!route) {
    return <div>Loading...</div>;
  }

  const [, params] = route;
  const categoryId = params?.categoryId as string;
  const category = categoryData[categoryId];

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Button onClick={() => navigate("/")} variant="default">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 dark:to-slate-900">
      {/* Header with Back Button */}
      <div className="border-b bg-white dark:bg-slate-950">
        <div className="container py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button
              onClick={() => navigate("/")}
              className="hover:text-foreground transition-colors"
            >
              Home
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-semibold">{category.name}</span>
          </div>

          {/* Category Header */}
          <div className="flex items-start gap-4">
            <div className="text-6xl">{category.icon}</div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
              <p className="text-muted-foreground max-w-2xl">
                Select a subcategory below to submit your project in this sustainability path.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subcategories Grid */}
      <div className="container py-12">
        <h2 className="text-2xl font-bold mb-8">Available Subcategories</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {category.subcategories.map((subcategory, idx) => (
            <Card
              key={idx}
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 group"
              onClick={() =>
                navigate(
                  `/category/${categoryId}/subcategory/${encodeURIComponent(subcategory)}/submit`
                )
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold font-serif text-black dark:text-white mb-2">
                    {subcategory}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Click to submit your project in this subcategory
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
