import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function ProjectReviewCenter() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [score, setScore] = useState(0);
  const [needsRevision, setNeedsRevision] = useState(false);

  const { data: pendingReviews, isLoading, refetch } = trpc.teacher.getPendingReviews.useQuery();
  const createFeedbackMutation = trpc.teacher.createFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback created successfully!");
      setFeedbackText("");
      setScore(0);
      setNeedsRevision(false);
      setSelectedProjectId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create feedback: ${error.message}`);
    },
  });

  const sendFeedbackMutation = trpc.teacher.sendFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback sent to student!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send feedback: ${error.message}`);
    },
  });

  const handleSubmitFeedback = async () => {
    if (!selectedProjectId) return;
    
    if (!feedbackText.trim()) {
      toast.error("Please enter feedback text");
      return;
    }

    await createFeedbackMutation.mutateAsync({
      projectId: selectedProjectId,
      feedbackText,
      score: score || undefined,
      needsRevision,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!pendingReviews || pendingReviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>No projects pending review</p>
        </CardContent>
      </Card>
    );
  }

  const selectedProject = pendingReviews.find((p: any) => p.id === selectedProjectId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Projects List */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-lg font-semibold">Projects for Review ({pendingReviews.length})</h3>
        <div className="space-y-2">
          {pendingReviews.map((project: any) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`w-full p-4 rounded-lg border transition-colors text-left ${
                selectedProjectId === project.id
                  ? "bg-primary/10 border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <p className="font-medium text-sm line-clamp-1">{project.title}</p>
              <p className="text-xs text-muted-foreground">{project.teamName}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Review Form */}
      <div className="lg:col-span-2">
        {selectedProject ? (
          <Card>
            <CardHeader>
              <CardTitle>Review Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Info */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedProject.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedProject.abstract}
                </p>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{selectedProject.teamName}</Badge>
                  <Badge variant="outline">Grade {selectedProject.grade}</Badge>
                </div>
              </div>

              {/* Score Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Feedback Textarea */}
              <div>
                <label className="block text-sm font-medium mb-2">Feedback</label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide detailed feedback for the student..."
                  className="min-h-32"
                />
              </div>

              {/* Revision Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsRevision}
                  onChange={(e) => setNeedsRevision(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">Needs Revision</span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={createFeedbackMutation.isPending}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Save Feedback
                </Button>
                <Button variant="outline" className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button variant="destructive" className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a project to review</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
