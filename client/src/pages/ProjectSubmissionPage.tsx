"use client";

import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Home, LayoutDashboard } from "lucide-react";
import PageNavigation from "@/components/PageNavigation";
import Navigation from "@/components/Navigation";
import { AssignmentWizard } from "@/components/AssignmentWizard";
import ProjectForm from "@/components/ProjectForm";

// ─── Setup check ──────────────────────────────────────────────────────────────
function getSetup() {
  try {
    return JSON.parse(localStorage.getItem("project-setup") || "{}");
  } catch {
    return {};
  }
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
          Project Submitted! 🎉
        </h1>
        <p className="text-sm text-slate-400 font-medium mb-8 leading-relaxed">
          Your project has been submitted and is now under review by your supervisor. You'll be notified when they respond.
        </p>
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/student/dashboard")}
            className="w-full premium-gradient text-white border-none rounded-xl font-bold gap-2"
            size="lg"
          >
            <LayoutDashboard size={16} />
            Go to My Dashboard
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full rounded-xl font-bold gap-2"
          >
            <Home size={16} />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectSubmissionPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);

  // Check if wizard was already completed (setup saved in localStorage)
  useEffect(() => {
    const setup = getSetup();
    setHasSetup(!!(setup.teacher && (setup.subcategory || setup.categoryId)));
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <LayoutDashboard size={28} className="text-slate-400" />
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Login Required</h1>
          <p className="text-sm text-slate-400 font-medium">
            You must be logged in as a student to submit a project.
          </p>
          <Button onClick={() => navigate("/choose-role")} className="w-full premium-gradient text-white border-none rounded-xl font-bold">
            Select Role & Sign In
          </Button>
        </div>
      </div>
    );
  }

  // ── Wrong role ──
  if (user?.role !== "student") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Access Denied</h1>
          <p className="text-sm text-slate-400 font-medium">Only students can submit projects.</p>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl font-bold">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (submitted) return <SuccessScreen />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />

      {/* Page header */}
      <div
        className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        style={{ paddingTop: "80px" }}
      >
        <div className="container py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/student/dashboard")}
            className="mb-4 gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                Submit Your Project
              </h1>
              <p className="text-sm text-slate-400 font-medium mt-0.5">
                {hasSetup
                  ? "Complete your project details below"
                  : "Start by selecting your teacher and category"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container py-12">
        {!hasSetup ? (
          /* ── STEP A: Wizard (teacher + category + subcategory) ── */
          <div className="max-w-xl mx-auto space-y-6">
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-5 py-4 flex gap-3">
              <span className="text-xl flex-shrink-0">👋</span>
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                Before submitting, please select your supervising teacher and choose your project's category and subcategory.
              </p>
            </div>

            <AssignmentWizard />
          </div>
        ) : (
          /* ── STEP B: Project Form ── */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Setup summary badge */}
            {(() => {
              const setup = getSetup();
              return setup.teacher ? (
                <div className="rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 p-4 flex flex-wrap gap-3 items-center">
                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                  <span className="text-xs font-black text-green-700 dark:text-green-300 uppercase tracking-wide">Setup confirmed</span>
                  {[
                    { label: "Teacher", value: setup.teacher },
                    { label: "Category", value: setup.categoryName },
                    { label: "Subcategory", value: setup.subcategory },
                  ].map(({ label, value }) => value && (
                    <div key={label} className="flex items-center gap-1.5 bg-white dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full px-3 py-1">
                      <span className="text-[9px] font-black text-green-600 uppercase">{label}:</span>
                      <span className="text-xs font-semibold text-green-800 dark:text-green-200">{value}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      localStorage.removeItem("project-setup");
                      setHasSetup(false);
                    }}
                    className="ml-auto text-[10px] text-slate-400 hover:text-red-500 font-bold transition-colors underline"
                  >
                    Change
                  </button>
                </div>
              ) : null;
            })()}

            <ProjectForm
              onSuccess={() => setSubmitted(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}