import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lightbulb } from "lucide-react";

interface CategoryData {
  name: string;
  icon: string;
  description: string;
}

const categoryData: Record<string, CategoryData> = {
  environmental: {
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
    description: "Projects focused on protecting natural ecosystems and addressing climate challenges.",
  },
  community: {
    name: "Sustainable Communities & Social Well-Being",
    icon: "🤝",
    description: "Projects that improve quality of life, inclusion, and community resilience.",
  },
  innovation: {
    name: "Innovation, Technology & Green Economy",
    icon: "💡",
    description: "Projects that use innovation, AI, or entrepreneurship to create sustainable solutions.",
  },
  education: {
    name: "Education, Awareness & Sustainable Behavior",
    icon: "📚",
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
            onClick={() => navigate(`/category/${categoryId}`)}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Subcategories
          </Button>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
            <button
              onClick={() => navigate("/")}
              className="hover:text-foreground transition-colors"
            >
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => navigate(`/category/${categoryId}`)}
              className="hover:text-foreground transition-colors"
            >
              {category.name}
            </button>
            <span>/</span>
            <span className="text-foreground font-semibold">{subcategoryName}</span>
          </div>

          {/* Subcategory Header */}
          <div className="flex items-start gap-4">
            <div className="text-6xl">{category.icon}</div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{subcategoryName}</h1>
              <p className="text-muted-foreground max-w-2xl">
                {category.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Description */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-primary" />
                About This Subcategory
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {description || "This subcategory focuses on creating innovative solutions within the selected sustainability path. Students can develop projects that address real-world challenges and demonstrate positive environmental or social impact."}
              </p>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Project Guidelines</h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li>✓ Develop an innovative solution addressing the subcategory focus</li>
                  <li>✓ Demonstrate clear understanding of the sustainability challenge</li>
                  <li>✓ Show practical implementation or prototype</li>
                  <li>✓ Include measurable impact or outcomes</li>
                  <li>✓ Present your work clearly and professionally</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Evaluation Criteria</h3>
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li>• Innovation and creativity of the solution</li>
                  <li>• Relevance to sustainability goals</li>
                  <li>• Feasibility and implementation potential</li>
                  <li>• Clarity of presentation and documentation</li>
                  <li>• Potential for real-world impact</li>
                </ul>
              </div>
            </Card>
          </div>

          {/* Sidebar CTA */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="text-xl font-bold mb-4">Ready to Submit?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Start developing your project in this subcategory and submit it for review.
              </p>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() =>
                  navigate(
                    `/category/${categoryId}/subcategory/${encodeURIComponent(subcategoryName)}/submit`
                  )
                }
              >
                Submit Project
              </Button>

              <div className="mt-6 pt-6 border-t space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Category</h4>
                  <p className="text-sm text-muted-foreground">{category.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Subcategory</h4>
                  <p className="text-sm text-muted-foreground">{subcategoryName}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Related Subcategories */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8">Other Subcategories in This Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* This would be populated with other subcategories from the same category */}
            <Button
              variant="outline"
              onClick={() => navigate(`/category/${categoryId}`)}
              className="h-auto py-4 text-left"
            >
              <div>
                <p className="font-semibold">View All Subcategories</p>
                <p className="text-sm text-muted-foreground">Browse all subcategories in {category.name}</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
