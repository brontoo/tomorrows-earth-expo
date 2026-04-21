// src/pages/ChooseRole.tsx
// ???? ???????? ?????? ??? ????? ??????
// ?????: ????? ????? ????? ?? ????/??? ???

import { useState, type ComponentType } from "react";
import { BookOpen, ThumbsUp, Shield, Users, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";

type RequestedRole = "student" | "teacher" | "admin" | "visitor";

const ROLE_CARDS: Array<{
  value: RequestedRole;
  title: string;
  description: string;
  accent: "green" | "blue" | "purple" | "amber";
  icon: ComponentType<{ size: number; className?: string }>;
}> = [
  {
    value: "student",
    title: "I'm a Student",
    description: "I want to submit my sustainability project.",
    accent: "green",
    icon: BookOpen,
  },
  {
    value: "visitor",
    title: "I'm a Visitor / Parent",
    description: "I want to explore projects and vote for the best.",
    accent: "blue",
    icon: ThumbsUp,
  },
  {
    value: "teacher",
    title: "I'm a Teacher",
    description: "I want to mentor students and review project submissions.",
    accent: "purple",
    icon: Users,
  },
  {
    value: "admin",
    title: "I'm an Admin",
    description: "I want to manage the expo and approve content.",
    accent: "amber",
    icon: Shield,
  },
];

export default function ChooseRole() {
  const [selected, setSelected] = useState<RequestedRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const syncUser = trpc.auth.syncUser.useMutation();

  const confirm = async () => {
    if (!selected) return;

    const dashboardMap: Record<RequestedRole, string> = {
      admin: "/admin/dashboard",
      teacher: "/teacher/dashboard",
      student: "/student/dashboard",
      visitor: "/vote",
    };

    // Check if user is already logged in
    const mockUserStr = localStorage.getItem("mock-user");
    if (mockUserStr) {
      try {
        setIsLoading(true);
        const mockUser = JSON.parse(mockUserStr);

        // Persist role to backend DB
        try {
          const syncResult = await syncUser.mutateAsync({
            email: mockUser.email,
            name: mockUser.name,
            openId: mockUser.openId || mockUser.id,
            role: selected === "visitor" ? undefined : selected,
          });
          // Use role returned from backend
          mockUser.role = syncResult.user?.role || selected;
        } catch {
          mockUser.role = selected;
        }

        // Also update Supabase metadata
        try {
          await supabase.auth.updateUser({ data: { role: selected } });
        } catch { /* non-blocking */ }

        localStorage.setItem("mock-user", JSON.stringify(mockUser));
        localStorage.removeItem("requestedRole");
        window.location.href = dashboardMap[selected];
        return;
      } catch (err) {
        console.error("Error updating user role", err);
        setIsLoading(false);
      }
    }

    // User not logged in - save intended role and go to login
    localStorage.setItem("requestedRole", selected);

    if (selected === "visitor") {
      window.location.href = "/vote";
      return;
    }

    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-3xl">??</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Welcome!</h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            How will you be participating in Tomorrow's Earth Expo?
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-10">
          {ROLE_CARDS.map(({ value, title, description, accent, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={`group rounded-3xl border-2 p-6 text-left transition-all duration-200 shadow-sm ${
                selected === value
                  ? "border-current bg-white shadow-lg"
                  : "border-slate-200 bg-slate-50/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  selected === value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                } ${accent === "green" ? "text-emerald-600" : accent === "blue" ? "text-blue-600" : accent === "purple" ? "text-violet-600" : "text-amber-600"}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-900 text-sm md:text-base">{title}</h2>
                    {selected === value && (
                      <span className="text-[10px] uppercase tracking-[0.35em] font-bold text-white bg-slate-900 px-2 py-1 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-5">{description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={confirm}
          disabled={!selected || isLoading}
          className={`w-full py-4 rounded-3xl text-sm font-black uppercase transition-all duration-200 ${
            selected && !isLoading
              ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-xl hover:scale-[1.01]"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isLoading ? "Saving..." : "Continue"}
          {!isLoading && <ArrowRight size={18} className="ml-2 inline-block" />}
        </button>

        <p className="text-center text-xs text-slate-500 mt-5">
          This is only your preferred portal. Your actual access is checked securely after login.
        </p>
      </div>
    </div>
  );
}
