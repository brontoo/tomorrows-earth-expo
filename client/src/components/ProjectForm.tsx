import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const projectFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  teamName: z.string().min(2, "Team name must be at least 2 characters").max(100),
  categoryId: z.string().min(1, "Please select a category"),
  grade: z.string().min(1, "Please select a grade"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ProjectFormValues>;
}

export default function ProjectForm({ onSuccess, initialData }: ProjectFormProps) {
  const [step, setStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);

  const { data: categories } = trpc.categories.getAll.useQuery();
  const createProjectMutation = trpc.projects.create.useMutation();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData || {
      title: "",
      teamName: "",
      categoryId: "",
      grade: "",
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      await createProjectMutation.mutateAsync({
        title: data.title,
        teamName: data.teamName,
        categoryId: parseInt(data.categoryId),
        grade: data.grade,
      });
      form.reset();
      setStep(1);
      setUploadedImages([]);
      setUploadedVideos([]);
      toast.success("Project created successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project. Please try again.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedImages((prev) => [...prev, ...files]);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedVideos((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setUploadedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step >= stepNum
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div
                  className={`w-20 h-1 mx-2 transition-colors ${
                    step > stepNum ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Basic Info</span>
          <span>Media Upload</span>
          <span>Review</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Project Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your project title" {...field} />
                      </FormControl>
                      <FormDescription>
                        A clear, descriptive title for your project (5-200 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your team name" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of your student team (2-100 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="9">Grade 9</SelectItem>
                          <SelectItem value="10">Grade 10</SelectItem>
                          <SelectItem value="11">Grade 11</SelectItem>
                          <SelectItem value="12">Grade 12</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select your current grade level
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sustainability Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the sustainability category that best fits your project
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Media Upload */}
          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Images */}
                  <div>
                    <FormLabel>Project Images</FormLabel>
                    <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload or drag and drop
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <Button type="button" variant="outline" asChild>
                          <span>Choose Images</span>
                        </Button>
                      </label>
                    </div>
                    {uploadedImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {uploadedImages.map((file, index) => (
                          <div
                            key={index}
                            className="relative bg-muted rounded-lg p-3 flex items-center justify-between"
                          >
                            <span className="text-sm truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="ml-2"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Videos */}
                  <div>
                    <FormLabel>Project Videos</FormLabel>
                    <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload MP4 videos (max 500MB each)
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="video/mp4"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload">
                        <Button type="button" variant="outline" asChild>
                          <span>Choose Videos</span>
                        </Button>
                      </label>
                    </div>
                    {uploadedVideos.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {uploadedVideos.map((file, index) => (
                          <div
                            key={index}
                            className="relative bg-muted rounded-lg p-3 flex items-center justify-between"
                          >
                            <span className="text-sm truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeVideo(index)}
                              className="ml-2"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Review Summary */}
                <Card className="bg-muted">
                  <CardHeader>
                    <CardTitle className="text-base">Submission Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">Title:</span> {form.getValues("title")}
                    </div>
                    <div>
                      <span className="font-semibold">Team Name:</span> {form.getValues("teamName")}
                    </div>
                    <div>
                      <span className="font-semibold">Grade:</span> {form.getValues("grade")}
                    </div>
                    <div>
                      <span className="font-semibold">Category:</span>{" "}
                      {categories?.find((c) => c.id.toString() === form.getValues("categoryId"))
                        ?.name || "Not selected"}
                    </div>
                    <div>
                      <span className="font-semibold">Images:</span> {uploadedImages.length} files
                    </div>
                    <div>
                      <span className="font-semibold">Videos:</span> {uploadedVideos.length} files
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    By submitting this project, you confirm that all information is accurate and complete. You can edit your project until the submission deadline (April 30, 2026).
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              Previous
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 3}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="min-w-32"
              >
                {createProjectMutation.isPending ? "Submitting..." : "Submit Project"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
