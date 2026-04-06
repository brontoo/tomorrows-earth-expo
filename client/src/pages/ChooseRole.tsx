// src/pages/ChooseRole.tsx
// تظهر للمستخدم الجديد غير المعروف بعد تسجيل الدخول
// يختار: طالب (يسجل مشروعه) أم زائر (يصوّت فقط)

import { useState } from "react";
import { BookOpen, ThumbsUp, ArrowRight } from "lucide-react";

export default function ChooseRole() {
  const [selected, setSelected] = useState<"student" | "visitor" | null>(null);

  const confirm = () => {
    if (!selected) return;

    // حدّث mock-user بالدور المختار
    try {
      const u = JSON.parse(localStorage.getItem("mock-user") || "{}");
      u.role = selected;
      localStorage.setItem("mock-user", JSON.stringify(u));
      localStorage.setItem("selectedRole", selected);
    } catch {}

    window.location.href =
      selected === "student" ? "/student/dashboard" : "/vote";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-3xl">🌍</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Welcome!</h1>
          <p className="text-sm text-slate-500 font-medium">
            How will you be participating in Tomorrow's Earth Expo?
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-4 mb-8">

          {/* Student */}
          <button
            onClick={() => setSelected("student")}
            className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              selected === "student"
                ? "border-green-500 bg-green-50 shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selected === "student" ? "bg-green-100" : "bg-slate-100"
              }`}>
                <BookOpen size={22} className={selected === "student" ? "text-green-600" : "text-slate-500"} />
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm">I'm a Student</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  I want to submit my sustainability project
                </p>
              </div>
              {selected === "student" && (
                <div className="ml-auto w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px]">✓</span>
                </div>
              )}
            </div>
          </button>

          {/* Visitor / Parent */}
          <button
            onClick={() => setSelected("visitor")}
            className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              selected === "visitor"
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selected === "visitor" ? "bg-blue-100" : "bg-slate-100"
              }`}>
                <ThumbsUp size={22} className={selected === "visitor" ? "text-blue-600" : "text-slate-500"} />
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm">I'm a Visitor / Parent</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  I want to explore projects and vote for the best
                </p>
              </div>
              {selected === "visitor" && (
                <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px]">✓</span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Confirm button */}
        <button
          onClick={confirm}
          disabled={!selected}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            selected
              ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:scale-[1.01] shadow-lg shadow-green-200"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          Continue
          <ArrowRight size={16} />
        </button>

        <p className="text-center text-xs text-slate-400 font-medium mt-5">
          You can always change this later from your profile
        </p>
      </div>
    </div>
  );
}