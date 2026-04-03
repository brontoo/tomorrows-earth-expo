import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lightbulb, Target, CheckCircle, ChevronRight, Leaf } from "lucide-react";

interface CategoryData {
  name: string;
  icon: string;
  color: string;
  description: string;
}

const categoryData: Record<string, CategoryData> = {
  environmental: {
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
    color: "from-emerald-600 to-green-500",
    description: "Projects focused on protecting natural ecosystems and addressing climate challenges.",
  },
  community: {
    name: "Sustainable Communities & Social Well-Being",
    icon: "🤝",
    color: "from-blue-600 to-cyan-500",
    description: "Projects that improve quality of life, inclusion, and community resilience.",
  },
  innovation: {
    name: "Innovation, Technology & Green Economy",
    icon: "💡",
    color: "from-amber-500 to-yellow-400",
    description: "Projects that use innovation, AI, or entrepreneurship to create sustainable solutions.",
  },
  education: {
    name: "Education, Awareness & Sustainable Behavior",
    icon: "📚",
    color: "from-violet-600 to-purple-500",
    description: "Projects that promote learning, awareness, and positive environmental behavior.",
  },
};

const subcategoryDescriptions: Record<string, string> = {
  "Plastic reduction and recycling solutions": "Develop innovative solutions to reduce plastic waste and improve recycling systems. Focus on creative approaches to plastic collection, processing, or alternative materials.",
  "Water conservation and purification systems": "Create systems or methods to conserve water, improve water quality, or provide clean water access. Include innovative purification or conservation technologies.",
  "Renewable energy models (solar, wind, bioenergy)": "Design and prototype renewable energy solutions using solar, wind, or bioenergy sources. Demonstrate practical applications and efficiency improvements.",
  "Climate change mitigation and awareness projects": "Develop projects that help mitigate climate change impacts or raise awareness about climate issues. Include education, advocacy, or practical solutions.",
  "Sustainable school or smart community designs": "Design sustainable community spaces or smart school environments that promote eco-friendly living and social well-being.",
  "Inclusive solutions for people with special needs": "Create inclusive solutions that address the needs of people with disabilities or special requirements in community settings.",
  "Health, food security, or clean water access initiatives": "Develop projects addressing health, nutrition, food security, or clean water access in communities.",
  "Community awareness and social impact projects": "Launch awareness campaigns or social impact initiatives that promote community engagement and positive change.",
  "AI- or app-based sustainability tools": "Develop AI algorithms or mobile/web applications that help solve sustainability challenges or track environmental metrics.",
  "Smart waste or energy management systems": "Create smart systems for waste management, energy monitoring, or resource optimization using IoT or data analytics.",
  "Sustainable product design and green startups": "Design sustainable products or develop green business models that demonstrate environmental and economic viability.",
  "Energy-efficient and future-ready technologies": "Develop energy-efficient technologies or future-ready solutions that reduce environmental impact.",
  "Educational games or interactive learning platforms": "Create engaging educational games or platforms that teach sustainability concepts to students.",
  "Virtual labs or sustainability simulations": "Build virtual laboratories or simulations that allow students to experiment with sustainability concepts.",
  "Campaigns promoting responsible consumption": "Design campaigns that promote responsible consumption, waste reduction, or sustainable lifestyle choices.",
  "School-wide sustainability action plans": "Develop comprehensive action plans for schools to implement sustainability initiatives across all operations.",
};

const guidelines = [
  "Develop an innovative solution addressing the subcategory focus",
  "Demonstrate clear understanding of the sustainability challenge",
  "Show practical implementation or a working prototype",
  "Include measurable impact or outcomes",
  "Present your work clearly and professionally",
];

const criteria = [
  "Innovation and creativity of the solution",
  "Relevance to sustainability goals",
  "Feasibility and implementation potential",
  "Clarity of presentation and documentation",
  "Potential for real-world impact",
];

export default function SubcategoryDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ categoryId: string; subcategoryName: string }>();

  const categoryId = params?.categoryId as string;
  const subcategoryName = params?.subcategoryName
    ? decodeURIComponent(params.subcategoryName as string)
    : "";

  const category = categoryData[categoryId];
  const description = subcategoryDescriptions[subcategoryName];

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
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-white/5 blur-3xl" />

        <div className="container relative z-10 pt-8 pb-10">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/category/${categoryId}`)}
            className="mb-6 text-white/80 hover:text-white hover:bg-white/15 rounded-xl gap-2 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Subcategories
          </Button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/55 mb-6 font-medium flex-wrap">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
            <ChevronRight className="w-3 h-3" />
            <button onClick={() => navigate(`/category/${categoryId}`)} className="hover:text-white transition-colors">{category.name}</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white font-bold">{subcategoryName}</span>
          </div>

          {/* Title block */}
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
              {category.icon}
            </div>
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">{category.name}</p>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{subcategoryName}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Left: Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* About card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 shadow-sm p-8">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-blue-500" />
                </div>
                About This Subcategory
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                {description || "This subcategory focuses on creating innovative solutions within the selected sustainability path. Students can develop projects that address real-world challenges and demonstrate positive environmental or social impact."}
              </p>
            </div>

            {/* Project Guidelines */}
            <div className="rounded-2xl border border-green-200/70 dark:border-green-800/40 bg-green-50/80 dark:bg-green-900/20 shadow-sm p-8">
              <h3 className="font-black text-green-800 dark:text-green-300 text-base mb-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                Project Guidelines
              </h3>
              <ul className="space-y-3">
                {guidelines.map((g, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-green-800 dark:text-green-200 font-medium">
                    <span className="w-5 h-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-300 text-[10px] font-black flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            {/* Evaluation Criteria */}
            <div className="rounded-2xl border border-violet-200/70 dark:border-violet-800/40 bg-violet-50/80 dark:bg-violet-900/20 shadow-sm p-8">
              <h3 className="font-black text-violet-800 dark:text-violet-300 text-base mb-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Target className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                Evaluation Criteria
              </h3>
              <ul className="space-y-3">
                {criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-violet-800 dark:text-violet-200 font-medium">
                    <Leaf className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: Sticky CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 shadow-md overflow-hidden">

              {/* CTA header */}
              <div className={`bg-gradient-to-br ${category.color} p-6`}>
                <h3 className="text-xl font-black text-white mb-1">Ready to Submit?</h3>
                <p className="text-white/70 text-sm font-medium">Start your project in this subcategory</p>
              </div>

              <div className="p-6 space-y-5">
                <Button
                  size="lg"
                  className={`w-full premium-gradient text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 py-6 border-none`}
                  onClick={() => navigate(`/category/${categoryId}/subcategory/${encodeURIComponent(subcategoryName)}/submit`)}
                >
                  Submit Project
                </Button>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Category</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{category.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Subcategory</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{subcategoryName}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => navigate(`/category/${categoryId}`)}
                  className="w-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold gap-2 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                  View All Subcategories
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}