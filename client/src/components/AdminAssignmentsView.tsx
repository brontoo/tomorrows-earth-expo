import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";

export function AdminAssignmentsView() {
  const { data: assignments = [], refetch, isLoading } = trpc.assignments.getAll.useQuery();
  const resetMutation = trpc.assignments.resetAssignment.useMutation({
    onSuccess: () => {
      toast.success("Assignment reset successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset assignment");
    },
  });

  const handleReset = (studentId: number) => {
    if (window.confirm("Are you sure you want to reset this student's assignment?")) {
      resetMutation.mutate({ studentId });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading assignments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Assignments</CardTitle>
        <CardDescription>
          Manage student teacher and category assignments. Total: {assignments.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No student assignments yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Category ID</TableHead>
                  <TableHead>Subcategory ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.studentId}</TableCell>
                    <TableCell className="max-w-xs truncate">{assignment.teacherName}</TableCell>
                    <TableCell>{assignment.mainCategoryId}</TableCell>
                    <TableCell>{assignment.subcategoryId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assignment.status === "assigned"
                            ? "default"
                            : assignment.status === "unlocked"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(assignment.assignedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(assignment.studentId)}
                        disabled={resetMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
