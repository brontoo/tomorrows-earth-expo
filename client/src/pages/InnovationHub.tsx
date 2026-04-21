import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Sprout, Leaf, Flower2, Trees, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Category {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  colorTheme?: string | null;
}

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
}

interface CategoryVisual {
  icon: string;
  chip: string;
  ribbon: string;
  ribbonBorder: string;
  marker: string;
  itemBorder: string;
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  environmental: {
    icon: "🌍",
    chip: "from-emerald-500 to-green-600",
    ribbon: "from-emerald-100 to-green-100 dark:from-emerald-950/40 dark:to-green-950/30",
    ribbonBorder: "border-emerald-300/80 dark:border-emerald-800/80",
    marker: "bg-emerald-500",
    itemBorder: "border-emerald-200/80 dark:border-emerald-900/80",
  },
  community: {
    icon: "🤝",
    chip: "from-cyan-500 to-blue-600",
    ribbon: "from-cyan-100 to-blue-100 dark:from-cyan-950/40 dark:to-blue-950/30",
    ribbonBorder: "border-cyan-300/80 dark:border-cyan-800/80",
    marker: "bg-cyan-500",
    itemBorder: "border-cyan-200/80 dark:border-cyan-900/80",
  },
  innovation: {
    icon: "💡",
    chip: "from-amber-500 to-orange-600",
    ribbon: "from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/30",
    ribbonBorder: "border-amber-300/80 dark:border-amber-800/80",
    marker: "bg-amber-500",
    itemBorder: "border-amber-200/80 dark:border-amber-900/80",
  },
  education: {
    icon: "📚",
    chip: "from-violet-500 to-indigo-600",
    ribbon: "from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/30",
    ribbonBorder: "border-violet-300/80 dark:border-violet-800/80",
    marker: "bg-violet-500",
    itemBorder: "border-violet-200/80 dark:border-violet-900/80",
  },
} as const;

function getCategoryVisuals(slug: string | null | undefined, idx: number) {
  const key = (slug ?? "").toLowerCase();
  const defaults: CategoryVisual[] = [
    {
      icon: "🌿",
      chip: "from-emerald-500 to-teal-600",
      ribbon: "from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/30",
      ribbonBorder: "border-emerald-300/80 dark:border-emerald-800/80",
      marker: "bg-emerald-500",
      itemBorder: "border-emerald-200/80 dark:border-emerald-900/80",
    },
    {
      icon: "🧠",
      chip: "from-blue-500 to-cyan-600",
      ribbon: "from-blue-100 to-cyan-100 dark:from-blue-950/40 dark:to-cyan-950/30",
      ribbonBorder: "border-blue-300/80 dark:border-blue-800/80",
      marker: "bg-blue-500",
      itemBorder: "border-blue-200/80 dark:border-blue-900/80",
    },
    {
      icon: "⚙️",
      chip: "from-amber-500 to-orange-600",
      ribbon: "from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/30",
      ribbonBorder: "border-amber-300/80 dark:border-amber-800/80",
      marker: "bg-amber-500",
      itemBorder: "border-amber-200/80 dark:border-amber-900/80",
    },
    {
      icon: "📘",
      chip: "from-violet-500 to-indigo-600",
      ribbon: "from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/30",
      ribbonBorder: "border-violet-300/80 dark:border-violet-800/80",
      marker: "bg-violet-500",
      itemBorder: "border-violet-200/80 dark:border-violet-900/80",
    },
  ];

  if (key.includes("environment")) return CATEGORY_VISUALS.environmental;
  if (key.includes("community")) return CATEGORY_VISUALS.community;
  if (key.includes("innovation") || key.includes("technology")) return CATEGORY_VISUALS.innovation;
  if (key.includes("education") || key.includes("awareness")) return CATEGORY_VISUALS.education;
  return defaults[idx % defaults.length];
}

function CategoryBranch({
  category,
  index,
  side,
  isActive,
  onSelect,
}: {
  category: Category;
  index: number;
  side: "left" | "right";
  isActive: boolean;
  onSelect: () => void;
}) {
  const visual = getCategoryVisuals(category.slug, index);
  const alignRight = side === "right";

  return (
    <div className="relative h-full">
      <span
        className={`hidden md:block absolute top-11 h-px w-7 bg-slate-300 dark:bg-slate-700 ${
          alignRight ? "-left-7" : "-right-7"
        }`}
      />
      <span
        className={`hidden md:block absolute top-[2.35rem] h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-950 shadow ${visual.marker} ${
          alignRight ? "-left-[2.05rem]" : "-right-[2.05rem]"
        } ${isActive ? "ring-4 ring-cyan-300/40 dark:ring-cyan-500/30" : ""}`}
      />

      <motion.article
        onClick={onSelect}
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.25 }}
        className={`rounded-[1.6rem] border bg-white/92 dark:bg-slate-900/88 backdrop-blur p-4 md:p-5 shadow-md transition-all duration-300 h-full cursor-pointer ${
          isActive
            ? "border-cyan-300 dark:border-cyan-700 shadow-xl ring-2 ring-cyan-200/60 dark:ring-cyan-700/50"
            : "border-slate-200/90 dark:border-slate-800/90 hover:shadow-xl"
        }`}
      >
        <div className={`rounded-2xl border bg-gradient-to-r ${visual.ribbon} ${visual.ribbonBorder} p-3 md:p-3.5`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${visual.chip} text-white flex items-center justify-center text-xl shadow-md`}>
              {visual.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                {category.name}
              </h2>
              <p className="mt-1 text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {category.description || "A sustainability track designed for meaningful student innovation and measurable impact."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-800/75 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed text-center">
            Tap to view subcategories in the details panel on the right.
          </p>
        </div>
      </motion.article>
    </div>
  );
}

function CategoryDetailPanel({
  category,
  index,
  total,
  onPrev,
  onNext,
}: {
  category: Category;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { data: subcategories, isLoading } = trpc.subcategories.getByCategory.useQuery(
    { categoryId: category.id },
    { staleTime: 1000 * 60 * 10, retry: 1 }
  );

  const visual = getCategoryVisuals(category.slug, index);
  const list = (subcategories as Subcategory[] | undefined) ?? [];

  return (
    <aside className="rounded-[1.6rem] border border-slate-200/90 dark:border-slate-800/90 bg-white/92 dark:bg-slate-900/88 backdrop-blur p-4 md:p-5 shadow-xl h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Category Details</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
            aria-label="Previous category"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
            aria-label="Next category"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border bg-gradient-to-r ${visual.ribbon} ${visual.ribbonBorder} p-3 md:p-3.5`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${visual.chip} text-white flex items-center justify-center text-xl shadow-md`}>
            {visual.icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{category.name}</h2>
            <p className="mt-1 text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {category.description || "A sustainability track designed for meaningful student innovation and measurable impact."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 max-h-[28rem] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : list.length ? (
          list.map((sub, subIndex) => (
            <div key={sub.id} className={`rounded-xl border ${visual.itemBorder} bg-white/90 dark:bg-slate-800/80 px-3 py-2.5`}>
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full text-[11px] font-black text-white bg-gradient-to-br ${visual.chip}`}>
                  {subIndex + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">{sub.name}</p>
                  {sub.description && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{sub.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No subcategories available for this category yet.</p>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-400 text-center">
        Category {index + 1} of {total}
      </p>
    </aside>
  );
}

export default function InnovationHub() {
  const { data: categories, isLoading } = trpc.categories.getAll.useQuery(undefined, {
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const sortedCategories = useMemo(
    () => (((categories as Category[] | undefined) ?? []).slice().sort((a, b) => a.id - b.id)),
    [categories]
  );

  const categoryPairs: Array<[Category, Category | null]> = [];
  for (let i = 0; i < sortedCategories.length; i += 2) {
    categoryPairs.push([sortedCategories[i], sortedCategories[i + 1] ?? null]);
  }

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [panelDirection, setPanelDirection] = useState(1);

  useEffect(() => {
    if (!sortedCategories.length) return;
    if (activeCategoryIndex >= sortedCategories.length) setActiveCategoryIndex(0);
  }, [sortedCategories.length, activeCategoryIndex]);

  const showNextCategory = () => {
    if (!sortedCategories.length) return;
    setPanelDirection(1);
    setActiveCategoryIndex((current) => (current + 1) % sortedCategories.length);
  };

  const showPrevCategory = () => {
    if (!sortedCategories.length) return;
    setPanelDirection(-1);
    setActiveCategoryIndex((current) => (current - 1 + sortedCategories.length) % sortedCategories.length);
  };

  const selectCategory = (index: number) => {
    setPanelDirection(index >= activeCategoryIndex ? 1 : -1);
    setActiveCategoryIndex(index);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(165deg,#f5f7f8_0%,#eef4f2_45%,#f9fafb_100%)] dark:bg-[linear-gradient(165deg,#020617_0%,#06201d_45%,#020617_100%)]">
      <Navigation />

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-75">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute top-72 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl" />
        </div>

        <div className="container py-7 md:py-9 relative z-10">
          <header className="text-center max-w-3xl mx-auto mb-6 md:mb-7">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight flex items-center justify-center gap-2">
              <Trees size={22} className="text-emerald-600" />
              Innovation Hub Tree Map
            </h1>
          </header>

          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6 items-start">
            <section className="rounded-[2rem] border border-white/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur px-4 py-7 md:px-8 md:py-9 shadow-xl overflow-hidden">
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-10 md:w-12 rounded-full bg-gradient-to-b from-[#9b6a3f] via-[#8a5a35] to-[#734729] opacity-90 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.2)] hidden md:block" />
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-300 via-teal-300 to-cyan-300 dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-700 md:hidden" />

                <div className="pointer-events-none absolute inset-0 hidden md:block z-20">
                  <Leaf size={16} className="absolute top-6 left-2 text-emerald-500/90 rotate-[-22deg]" />
                  <Sprout size={14} className="absolute top-16 left-5 text-teal-500/85 rotate-[16deg]" />
                  <Leaf size={15} className="absolute top-[28%] left-3 text-emerald-500/85 rotate-[20deg]" />
                  <Sprout size={14} className="absolute top-[42%] left-6 text-amber-500/80 rotate-[-18deg]" />
                  <Leaf size={16} className="absolute top-[58%] left-3 text-teal-500/85 rotate-[14deg]" />
                  <Sprout size={14} className="absolute bottom-[24%] left-6 text-emerald-500/80 rotate-[-14deg]" />
                  <Leaf size={16} className="absolute bottom-8 left-2 text-cyan-500/85 rotate-[12deg]" />

                  <Leaf size={16} className="absolute top-8 right-2 text-cyan-500/90 rotate-[22deg]" />
                  <Sprout size={14} className="absolute top-20 right-5 text-sky-500/85 rotate-[-14deg]" />
                  <Leaf size={15} className="absolute top-[30%] right-3 text-violet-500/85 rotate-[-18deg]" />
                  <Sprout size={14} className="absolute top-[44%] right-6 text-cyan-500/80 rotate-[14deg]" />
                  <Leaf size={16} className="absolute top-[60%] right-3 text-violet-500/85 rotate-[-12deg]" />
                  <Sprout size={14} className="absolute bottom-[26%] right-6 text-teal-500/80 rotate-[16deg]" />
                  <Leaf size={16} className="absolute bottom-10 right-2 text-cyan-500/85 rotate-[-10deg]" />
                </div>

                {isLoading ? (
                  <div className="space-y-5 pl-6 md:pl-12">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 space-y-3">
                        <div className="h-6 w-56 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : sortedCategories.length ? (
                  <div className="relative z-10">
                    {categoryPairs.map(([leftCategory, rightCategory], pairIndex) => (
                      <div
                        key={leftCategory.id}
                        className="mb-6 md:mb-7 grid grid-cols-1 md:grid-cols-[1fr_3rem_1fr] gap-4 md:gap-0 items-stretch"
                      >
                        <div className="md:pr-3">
                          <CategoryBranch
                            category={leftCategory}
                            index={pairIndex * 2}
                            side="left"
                            isActive={activeCategoryIndex === pairIndex * 2}
                            onSelect={() => selectCategory(pairIndex * 2)}
                          />
                        </div>

                        <div className="hidden md:block" />

                        {rightCategory ? (
                          <div className="md:pl-3">
                            <CategoryBranch
                              category={rightCategory}
                              index={pairIndex * 2 + 1}
                              side="right"
                              isActive={activeCategoryIndex === pairIndex * 2 + 1}
                              onSelect={() => selectCategory(pairIndex * 2 + 1)}
                            />
                          </div>
                        ) : (
                          <div className="hidden md:block" />
                        )}
                      </div>
                    ))}

                    <div className="mt-2 md:mt-3 flex justify-center">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-[#7f4f2f]/50 bg-gradient-to-b from-[#d4a373] to-[#b87944] px-4 py-2 text-[#3a2412] shadow-md">
                        <Flower2 size={16} />
                        <span className="text-sm font-black tracking-wide">INNOVATION HUB</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pl-6 md:pl-12">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 p-5">
                      <p className="text-sm text-slate-600 dark:text-slate-300">No categories available at the moment.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {!isLoading && sortedCategories[activeCategoryIndex] && (
              <div className="xl:sticky xl:top-24">
                <AnimatePresence custom={panelDirection} mode="wait">
                  <motion.div
                    key={activeCategoryIndex}
                    custom={panelDirection}
                    variants={{
                      enter: (dir: number) => ({ x: dir > 0 ? 44 : -44, opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (dir: number) => ({ x: dir > 0 ? -44 : 44, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <CategoryDetailPanel
                      category={sortedCategories[activeCategoryIndex]}
                      index={activeCategoryIndex}
                      total={sortedCategories.length}
                      onPrev={showPrevCategory}
                      onNext={showNextCategory}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
