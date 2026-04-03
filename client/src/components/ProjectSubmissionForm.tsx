import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const projectSubmissionSchema = z.object({
  title: z.string().min(5, "Project title must be at least 5 characters"),
  description: z.string().min(20, "Project description must be at least 20 characters"),
  supervisorId: z.string().min(1, "Please select a supervisor teacher"),
});

type ProjectSubmissionFormData = z.infer<typeof projectSubmissionSchema>;

interface ProjectSubmissionFormProps {
  subcategoryId?: number;
  subcategoryName?: string;
  categoryName?: string;
  categoryId?: string;
  onSubmitSuccess?: (projectId: number) => void;
}

export default function ProjectSubmissionForm({
  subcategoryId,
  subcategoryName,
  categoryName,
  categoryId,
  onSubmitSuccess,
}: ProjectSubmissionFormProps) {
  const [, navigate] = useLocation();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all teachers for supervisor selection
  const { data: teachers, isLoading: isLoadingTeachers } = trpc.teachers.getAll.useQuery();

  // Mutation for project submission
  const submitProjectMutation = trpc.projects.submitProject.useMutation({
    onSuccess: (data) => {
      toast.success("Project submitted successfully!");
      navigate(`/my-projects/${data.projectId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit project");
    },
  });

  const form = useForm<ProjectSubmissionFormData>({
    resolver: zodResolver(projectSubmissionSchema),
    defaultValues: {
      title: "",
      description: "",
      supervisorId: "",
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "application/msword"];
      const validSize = file.size <= 10 * 1024 * 1024; // 10MB max

      if (!validTypes.includes(file.type)) {
        toast.error(`File type not supported: ${file.name}`);
        return false;
      }
      if (!validSize) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        return false;
      }
      return true;
    });

    setUploadedFiles([...uploadedFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProjectSubmissionFormData) => {
    setIsSubmitting(true);
    try {
      // In a real implementation, upload files to S3 first
      // For now, we'll submit with document URLs as empty
      if (!subcategoryId) {
        throw new Error("Subcategory ID is required");
      }
      const result = await submitProjectMutation.mutateAsync({
        title: data.title,
        description: data.description,
        subcategoryId,
        supervisorId: parseInt(data.supervisorId),
        documentUrls: [], // TODO: Upload files to S3 and get URLs
      });
      if (onSubmitSuccess && result?.projectId) {
        onSubmitSuccess(result.projectId);
      } else {
        navigate("/student/dashboard");
      }
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Categories</span>
        <span>/</span>
        <span>{categoryName}</span>
        <span>/</span>
        <span className="font-semibold text-foreground">{subcategoryName}</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Submit Your Project</h1>
        <p className="text-muted-foreground text-lg">
          Share your innovation in {subcategoryName}
        </p>
      </div>

      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Fill in all required fields to submit your project for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Project Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your project title"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive title for your project (5+ characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project, its goals, and approach"
                        className="min-h-32"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a comprehensive overview of your project (20+ characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Supervisor Selection */}
              <FormField
                control={form.control}
                name="supervisorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisor Teacher *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your supervisor teacher" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingTeachers ? (
                          <SelectItem value="loading" disabled>
                            Loading teachers...
                          </SelectItem>
                        ) : teachers && teachers.length > 0 ? (
                          teachers.map((teacher: any) => (
                            <SelectItem key={teacher.id} value={teacher.userId.toString()}>
                              {/* Note: This will need to be updated to show teacher name from users table */}
                              Teacher ID: {teacher.userId}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No teachers available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the teacher who will supervise your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <FormItem>
                <FormLabel>Upload Documents (Optional)</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        disabled={isSubmitting}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOC, DOCX, JPG, PNG (max 10MB each)
                        </p>
                      </label>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Uploaded Files:</p>
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024 / 1024).toFixed(2)}MB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
              </FormItem>

              {/* Submit Button */}
              <div className="flex gap-4 justify-end pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/innovation-hub")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || submitProjectMutation.isPending}
                  className="gap-2"
                >
                  {isSubmitting || submitProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Project"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">What happens after submission?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            ✓ Your project will be assigned to your selected supervisor for review
          </p>
          <p>
            ✓ The supervisor will provide feedback and approval status
          </p>
          <p>
            ✓ You can track your project status in the "My Projects" dashboard
          </p>
          <p>
            ✓ Approved projects will be displayed in the Innovation Hub gallery
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
