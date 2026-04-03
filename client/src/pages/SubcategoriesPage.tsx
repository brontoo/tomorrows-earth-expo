"use client";

import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft } from "lucide-react";

const categoryData: Record<string, { name: string; icon: string; color: string; subcategories: string[] }> = {
  environmental: {
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
    color: "from-emerald-600 to-green-500",
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
    color: "from-blue-600 to-cyan-500",
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
    color: "from-amber-500 to-yellow-400",
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
    color: "from-violet-600 to-purple-500",
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

  if (!route) return <div>Loading...</div>;

  const [, params] = route;
  const categoryId = params?.categoryId as string;
  const category = categoryData[categoryId];

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">

      {/* ── Header Banner ── */}
      <div className={`bg-gradient-to-br ${category.color} relative overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

        <div className="container relative z-10 pt-8 pb-10">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 text-white/80 hover:text-white hover:bg-white/15 rounded-xl gap-2 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-white/60 mb-6 font-medium">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{category.name}</span>
          </div>

          {/* Category title */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
              {category.icon}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {category.name}
              </h1>
              <p className="text-white/70 text-sm font-medium mt-1">
                {category.subcategories.length} subcategories available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Subcategories Grid ── */}
      <div className="container py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-1 h-6 rounded-full bg-gradient-to-b ${category.color}`} />
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
            Choose a Subcategory
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {category.subcategories.map((sub, idx) => (
            <button
              key={idx}
              onClick={() => navigate(`/category/${categoryId}/subcategory/${encodeURIComponent(sub)}/submit`)}
              className="group text-left w-full"
            >
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6">
                {/* Number badge */}
                <div className={`absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center text-white text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                  {idx + 1}
                </div>

                {/* Hover accent line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b ${category.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Step label */}
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 dark:text-slate-500 mb-2">
                      Subcategory {idx + 1}
                    </p>

                    {/* Title — fully readable */}
                    <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug mb-2">
                      {sub}
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Click to submit your project in this area
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 mt-1" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="rounded-full px-8 py-5 font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Categories
          </Button>
        </div>
      </div>
    </div>
  );
}