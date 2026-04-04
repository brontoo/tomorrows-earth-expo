import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, ChevronRight, ChevronLeft, User, Layers, Tag, CheckCircle2 } from "lucide-react";

// ─── Teachers ─────────────────────────────────────────────────────────────────
export const TEACHERS = [
  "Amna Hasan Abdulla Alshamsi",
  "Muneera Mabkhot Saeed Al Kqahali",
  "Neama Mohamed Ibrahim Elgamil",
  "Fatima Abdulla Salem Manea Alseiari",
  "Salha Sulaiman Sheikhmus",
  "Nadya Mustafa Matawa",
  "Amna Mustafa Abdulla Mustafa Alhashmi",
  "Asmaa Abdulla Ibrahim Jasem Alhammadi",
  "Sameya Hasan Omar",
  "Rosaila Abdel Hamid Hasan Souri",
  "Abir Abdel Fattah Ali Hegazy",
  "Hanan Fawwaz Mahmoud Tayfour",
  "Abeer M A Shalash",
  "Salsabeel Bassam Shehadeh Naser",
  "Yasmeen Omar Hussein Hamida",
  "Maryam Salem Farhan Alhammadi",
  "Anoud Mousa Ibrahim Abdulla Alblooshi",
  "Reema Chhetri",
  "Norhan Khaled Marzouk Amin Elsayed",
  "Riham Saleh Elsaid Ahmed Hassan",
  "Zahinabath Sakeya Abdul Rahiman Sali",
  "Arti Thakur",
  "Rasha Saleh Ahmed Hasan Almessabi",
  "Naledi Noxolo Bhengu",
  "Salma Shahnawaz Shaikh",
  "Huda Hasan Mohamed Kamal Alali",
  "Holly Catherine Myburgh",
  "Sajida Bibi Younus",
  "Liesil Elizabeth Williams",
  "Sumeera Nazir Ahmed Shuroo",
  "Kholiwe Mangazha",
];

// ─── Categories & Subcategories ───────────────────────────────────────────────
export const CATEGORIES = [
  {
    id: "environmental",
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
  {
    id: "community",
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
  {
    id: "innovation",
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
  {
    id: "education",
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
];

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({
  step,
  current,
  label,
  icon: Icon,
}: {
  step: number;
  current: number;
  label: string;
  icon: any;
}) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${done
          ? "bg-green-500 text-white shadow-md shadow-green-200"
          : active
            ? "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
          }`}
      >
        {done ? <CheckCircle2 size={18} /> : <Icon size={16} />}
      </div>
      <span
        className={`text-[10px] font-bold uppercase tracking-wide hidden sm:block ${active ? "text-primary" : done ? "text-green-600" : "text-slate-400"
          }`}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AssignmentWizard() {
  const [step, setStep] = useState(1); // 1=teacher  2=category  3=subcategory
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [, setLocation] = useLocation();

  const selectedCategory = CATEGORIES.find((c) => c.id === selectedCategoryId);

  const handleSubmit = () => {
    const categoryOffsets: Record<string, number> = {
      environmental: 0,
      community: 4,
      innovation: 8,
      education: 12,
    };

    const subcategoryIndex =
      selectedCategory?.subcategories.indexOf(selectedSubcategory) ?? 0;

    const subcategoryId = 1 + categoryOffsets[selectedCategoryId] + subcategoryIndex;
    // environmental→1  community→5  innovation→9  education→13

    localStorage.setItem(
      "project-setup",
      JSON.stringify({
        teacher: selectedTeacher,
        categoryId: selectedCategoryId,
        categoryName: selectedCategory?.name,
        subcategory: selectedSubcategory,
        subcategoryId: subcategoryId,  // ✅ رقم صحيح من 1 إلى 16
        supervisorId: null,
      })
    );
    setLocation("/project-submission");
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm shadow-sm overflow-hidden">

      {/* ── Step Indicator Bar ── */}
      <div className="border-b border-slate-100 dark:border-white/10 px-6 py-4 bg-slate-50/80 dark:bg-white/3">
        <div className="flex items-center">
          <StepIndicator step={1} current={step} label="Teacher" icon={User} />
          {/* Connector */}
          <div className={`flex-1 h-px mx-2 transition-colors duration-500 ${step > 1 ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"}`} />
          <StepIndicator step={2} current={step} label="Category" icon={Layers} />
          <div className={`flex-1 h-px mx-2 transition-colors duration-500 ${step > 2 ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"}`} />
          <StepIndicator step={3} current={step} label="Subcategory" icon={Tag} />
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="p-6 space-y-5">

        {/* ── STEP 1: Teacher ── */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Step 1 of 3</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Select Your Teacher</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose the teacher supervising your project</p>
            </div>

            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium">
                <SelectValue placeholder="Select a teacher..." />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {TEACHERS.map((t) => (
                  <SelectItem key={t} value={t} className="cursor-pointer font-medium py-2.5">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              disabled={!selectedTeacher}
              className="w-full h-12 font-bold premium-gradient text-white border-none gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              onClick={() => setStep(2)}
            >
              Continue
              <ChevronRight size={16} />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Category ── */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Step 2 of 3</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Choose a Category</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Teacher: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedTeacher}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setSelectedSubcategory(""); // reset subcategory
                  }}
                  className={`group text-left rounded-xl border-2 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selectedCategoryId === cat.id
                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-md"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">{cat.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{cat.subcategories.length} subcategories</p>
                    </div>
                    {selectedCategoryId === cat.id && (
                      <CheckCircle2 size={16} className="text-primary ml-auto flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-12 font-bold gap-2 rounded-xl border-slate-200 dark:border-slate-700"
                onClick={() => setStep(1)}
              >
                <ChevronLeft size={16} />
                Back
              </Button>
              <Button
                disabled={!selectedCategoryId}
                className="flex-1 h-12 font-bold premium-gradient text-white border-none gap-2 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-40 disabled:scale-100"
                onClick={() => setStep(3)}
              >
                Continue
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Subcategory ── */}
        {step === 3 && selectedCategory && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Step 3 of 3</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Choose a Subcategory</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base">{selectedCategory.icon}</span>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{selectedCategory.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              {selectedCategory.subcategories.map((sub, idx) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`group w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${selectedSubcategory === sub
                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black transition-colors ${selectedSubcategory === sub
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                        }`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`text-sm font-semibold leading-snug ${selectedSubcategory === sub
                        ? "text-primary dark:text-primary"
                        : "text-slate-700 dark:text-slate-200"
                        }`}
                    >
                      {sub}
                    </span>
                    {selectedSubcategory === sub && (
                      <CheckCircle2 size={16} className="text-primary ml-auto flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Summary preview */}
            {selectedSubcategory && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 space-y-2 animate-in fade-in duration-200">
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Your Selection</p>
                {[
                  { label: "Teacher", value: selectedTeacher },
                  { label: "Category", value: `${selectedCategory.icon} ${selectedCategory.name}` },
                  { label: "Subcategory", value: selectedSubcategory },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2 text-xs">
                    <span className="font-black text-slate-400 w-20 flex-shrink-0">{label}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-12 font-bold gap-2 rounded-xl border-slate-200 dark:border-slate-700"
                onClick={() => setStep(2)}
              >
                <ChevronLeft size={16} />
                Back
              </Button>
              <Button
                disabled={!selectedSubcategory}
                className="flex-1 h-12 font-bold premium-gradient text-white border-none gap-2 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-40 disabled:scale-100"
                onClick={handleSubmit}
              >
                Submit Project
                <Play size={15} className="fill-current" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}