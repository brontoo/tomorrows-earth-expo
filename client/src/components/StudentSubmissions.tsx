import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function StudentSubmissions() {
  const { data: submissions, isLoading } = trpc.teacher.getStudentSubmissions.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-2">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No student submissions yet</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "approved":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "draft":
        return "bg-gray-500/10 text-gray-700 border-gray-200";
      default:
        return "bg-blue-500/10 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Student Submissions</h2>
        <p className="text-muted-foreground">
          Total submissions: {submissions.length}
        </p>
      </div>

      <div className="space-y-4">
        {submissions.map((project: any) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {project.title}
                    </h3>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    Team: {project.teamName} • Grade: {project.grade}
                  </p>

                  {project.abstract && (
                    <p className="text-sm text-foreground line-clamp-2 mb-3">
                      {project.abstract}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {project.submittedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.submittedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <Link href={`/project/${project.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
