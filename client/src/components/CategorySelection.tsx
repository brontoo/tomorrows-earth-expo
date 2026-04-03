"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  backgroundImage: string;
  subcategories: string[];
}

const categories: Category[] = [
  {
    id: "environmental",
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
    description: "Projects focused on protecting natural ecosystems and addressing climate challenges.",
    backgroundImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/XJUaLQrtXAObiAXG.jpg",
    subcategories: [
      "Plastic reduction and recycling solutions",
      "Water conservation and purification systems",
      "Renewable energy models (solar, wind, bioenergy)",
      "Climate change mitigation and awareness projects",
    ],
  },
  {
    id: "community",
    name: "Sustainable Communities & Social Well-Being",
    icon: "🤝",
    description: "Projects that improve quality of life, inclusion, and community resilience.",
    backgroundImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/frWARTKznWtgmpoq.jpg",
    subcategories: [
      "Sustainable school or smart community designs",
      "Inclusive solutions for people with special needs",
      "Health, food security, or clean water access initiatives",
      "Community awareness and social impact projects",
    ],
  },
  {
    id: "innovation",
    name: "Innovation, Technology & Green Economy",
    icon: "💡",
    description: "Projects that use innovation, AI, or entrepreneurship to create sustainable solutions.",
    backgroundImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/WuJoORirYElLXdlC.jpg",
    subcategories: [
      "AI- or app-based sustainability tools",
      "Smart waste or energy management systems",
      "Sustainable product design and green startups",
      "Energy-efficient and future-ready technologies",
    ],
  },
  {
    id: "education",
    name: "Education, Awareness & Sustainable Behavior",
    icon: "📚",
    description: "Projects that promote learning, awareness, and positive environmental behavior.",
    backgroundImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/CoxAxNqjdYDqWgOJ.jpg",
    subcategories: [
      "Educational games or interactive learning platforms",
      "Virtual labs or sustainability simulations",
      "Campaigns promoting responsible consumption",
      "School-wide sustainability action plans",
    ],
  },
];

export default function CategorySelection() {
  const [, navigate] = useLocation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-20 animate-fadeIn">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight hero-text-glow">Choose Your Sustainability Path</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Select a specialized category to develop your innovation project. Each path offers a unique way to protect our planet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category) => (
            <div key={category.id} className="h-full">
              <div
                className={`h-full cursor-pointer transition-all duration-500 transform hover:scale-[1.05] hover:-translate-y-2 overflow-hidden group relative rounded-[2.5rem] glass-card border-white/20 shadow-2xl ${
                  expandedId === category.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleCategoryClick(category.id)}
              >
                {/* Background Image with Zoom */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${category.backgroundImage})` }}
                />

                {/* Refined Dark Overlay */}
                <div className="absolute inset-0 bg-black/80 group-hover:bg-black/60 transition-colors duration-500" />

                {/* Content Layer */}
                <div className="relative z-10 h-full flex flex-col justify-between p-8">
                  <div className="text-center">
                    <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{category.icon}</div>
                    <h3 className="text-2xl font-black text-white mb-4 leading-tight tracking-tight px-1">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-300 font-medium leading-relaxed">{category.description}</p>
                  </div>

                  {/* Modern Expand Toggle */}
                  <div className="mt-8">
                    <button
                      onClick={(e) => toggleExpand(category.id, e)}
                      className="w-full flex items-center justify-center gap-3 py-4 px-6 glass-card bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300"
                    >
                      <span className="text-white font-bold text-xs uppercase tracking-widest">Subcategories</span>
                      <ChevronDown
                        className={`w-4 h-4 text-white transition-transform duration-500 ${
                          expandedId === category.id ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Subcategories Panel */}
                    {expandedId === category.id && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-fadeIn">
                        {category.subcategories.map((subcategory, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-primary-foreground font-black py-3 px-4 glass-card bg-white/95 rounded-xl hover:bg-white transition-all cursor-pointer shadow-lg transform hover:scale-[1.02]"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/category/${category.id}/subcategory/${encodeURIComponent(subcategory)}`);
                            }}
                          >
                            {subcategory}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
