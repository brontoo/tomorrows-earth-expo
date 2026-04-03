"use client";

import { ChevronDown, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  backgroundImage: string;
  color: string;
  subcategories: string[];
}

const categories: Category[] = [
  {
    id: "environmental",
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
    color: "from-emerald-700 to-green-600",
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
    color: "from-blue-700 to-cyan-600",
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
    color: "from-amber-600 to-yellow-500",
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
    color: "from-violet-700 to-purple-600",
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

  return (
    <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* subtle top border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

      <div className="container">
        {/* ── Section Header ── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-black uppercase tracking-widest text-green-700 dark:text-green-400">Innovation Paths</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
            Choose Your Sustainability Path
          </h2>
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
            Select a specialized category to develop your innovation project. Each path offers a unique way to protect our planet.
          </p>
        </div>

        {/* ── Category Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => {
            const isOpen = expandedId === cat.id;
            return (
              <div key={cat.id} className="group">
                {/* ── Card ── */}
                <div
                  className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl ${isOpen
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                >
                  {/* Background image strip */}
                  <div className="relative h-48 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${cat.backgroundImage})` }}
                    />
                    {/* strong overlay so text is always readable */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-80`} />
                    <div className="absolute inset-0 bg-black/30" />

                    {/* Header content on top of image */}
                    <div
                      className="absolute inset-0 flex flex-col justify-end p-6"
                      onClick={() => navigate(`/category/${cat.id}`)}
                    >
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-4xl mb-3 block">{cat.icon}</span>
                          <h3 className="text-xl font-black text-white leading-tight max-w-xs drop-shadow-md">
                            {cat.name}
                          </h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                          <ArrowRight size={16} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Bottom panel ── */}
                  <div className="bg-white dark:bg-slate-900 p-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4 leading-relaxed">
                      {cat.description}
                    </p>

                    {/* Toggle button */}
                    <button
                      onClick={() => setExpandedId(isOpen ? null : cat.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 font-bold text-xs uppercase tracking-widest ${isOpen
                          ? "bg-primary text-white border-primary"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                    >
                      <span>View Subcategories ({cat.subcategories.length})</span>
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* ── Subcategories — fully readable ── */}
                    {isOpen && (
                      <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {cat.subcategories.map((sub, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              navigate(
                                `/category/${cat.id}/subcategory/${encodeURIComponent(sub)}`
                              )
                            }
                            className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-primary/5 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 group/sub"
                          >
                            <span
                              className={`w-6 h-6 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center text-white text-[10px] font-black flex-shrink-0`}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                              {sub}
                            </span>
                            <ArrowRight
                              size={14}
                              className="ml-auto text-slate-300 dark:text-slate-600 group-hover/sub:text-primary flex-shrink-0 transition-colors"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}