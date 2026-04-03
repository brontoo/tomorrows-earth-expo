"use client";

import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ProjectSubmissionForm from "@/components/ProjectSubmissionForm";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import PageNavigation from "@/components/PageNavigation";

const categoryData: Record<string, { name: string; icon: string }> = {
  environmental: {
    name: "Environmental Protection & Climate Action",
    icon: "🌍",
  },
  community: {
    name: "Sustainable Communities & Social Well-Being",
    icon: "🤝",
  },
  innovation: {
    name: "Innovation, Technology & Green Economy",
    icon: "💡",
  },
  education: {
    name: "Education, Awareness & Sustainable Behavior",
    icon: "📚",
  },
};

export default function ProjectSubmissionPage() {
  const params = useParams<{ categoryId?: string; subcategoryName?: string }>();
  const categoryId = params?.categoryId as string | undefined;
  const subcategoryName = params?.subcategoryName
    ? decodeURIComponent(params.subcategoryName as string)
    : undefined;

  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submittedProjectId, setSubmittedProjectId] = useState<number | null>(null);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <PageNavigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Login Required</h1>
          <p className="text-muted-foreground">
            You must be logged in as a student to submit a project
          </p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
          </div>
        </div>
      </>
    );
  }

  if (user?.role !== "student") {
    return (
      <>
        <PageNavigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            Only students can submit projects
          </p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
          </div>
        </div>
      </>
    );
  }

  const category = categoryId ? categoryData[categoryId] : null;

  // Show success confirmation
  if (submitted && submittedProjectId) {
    return (
      <>
        <PageNavigation />
        <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="text-6xl">✅</div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Project Submitted Successfully!</h1>
            <p className="text-muted-foreground">
              Your project has been submitted and is now under review by your supervisor.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/student/dashboard")}
              className="w-full"
              variant="default"
            >
              View My Projects
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="w-full"
              variant="outline"
            >
              Back to Home
            </Button>
          </div>
        </Card>
        </div>
      </>
    );
  }

  // Show submission form
  return (
    <>
      <PageNavigation />
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 dark:to-slate-900">
      {/* Header with Navigation */}
      <div className="border-b bg-white dark:bg-slate-950">
        <div className="container py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
            <button
              onClick={() => navigate("/")}
              className="hover:text-foreground transition-colors"
            >
              Home
            </button>
            {category && (
              <>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigate(`/category/${categoryId}`)}
                  className="hover:text-foreground transition-colors"
                >
                  {category.name}
                </button>
              </>
            )}
            {subcategoryName && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-semibold">{subcategoryName}</span>
              </>
            )}
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-semibold">Submit Project</span>
          </div>

          {/* Page Header */}
          <div className="flex items-start gap-4">
            {category && <div className="text-5xl">{category.icon}</div>}
            <div>
              <h1 className="text-3xl font-bold mb-2">Submit Your Project</h1>
              {category && (
                <p className="text-muted-foreground">
                  {category.name}
                  {subcategoryName && ` - ${subcategoryName}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Form */}
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          <ProjectSubmissionForm
            categoryId={categoryId || ""}
            subcategoryName={subcategoryName || ""}
            onSubmitSuccess={(projectId: number) => {
              setSubmittedProjectId(projectId);
              setSubmitted(true);
            }}
          />
        </div>
      </div>
    </div>
    </>
  );
}
