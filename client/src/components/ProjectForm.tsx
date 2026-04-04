import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { nanoid } from "nanoid";

// ─── Schema ───────────────────────────────────────────────────────────────────
// categoryId is NOT in the schema — it comes from AssignmentWizard setup
const projectFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  teamName: z.string().min(2, "Team name must be at least 2 characters").max(100),
  description: z.string().min(20, "Please describe your project in at least 20 characters"),
  grade: z.string().min(1, "Please select a grade"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

// ─── Upload helpers ───────────────────────────────────────────────────────────
const BUCKET = "project-files"; // Create this bucket in Supabase Dashboard → Storage

interface UploadedFile {
  file: File;
  url: string | null;       // null = not uploaded yet
  uploading: boolean;
  error: string | null;
  preview?: string;         // for images
}

async function uploadToSupabase(
  file: File,
  folder: "images" | "videos" | "documents",
  userId: string
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${userId}/${nanoid()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── DropZone sub-component ───────────────────────────────────────────────────
function DropZone({
  accept,
  label,
  hint,
  icon: Icon,
  files,
  onAdd,
  onRemove,
  maxFiles = 10,
}: {
  accept: string;
  label: string;
  hint: string;
  icon: any;
  files: UploadedFile[];
  onAdd: (f: File[]) => void;
  onRemove: (i: number) => void;
  maxFiles?: number;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      accept.split(",").some((a) => f.type.match(a.trim().replace("*", ".*")))
    );
    onAdd(dropped);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-slate-500" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-xs text-slate-400 ml-auto">{files.length}/{maxFiles}</span>
      </div>

      {/* Drop area */}
      <label
        htmlFor={`upload-${label}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-200 ${dragging
          ? "border-primary bg-primary/5"
          : "border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
      >
        <Upload size={24} className="text-slate-400" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">{hint}</p>
        <span className="text-xs text-primary font-bold">Click to browse</span>
        <input
          id={`upload-${label}`}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => onAdd(Array.from(e.target.files || []))}
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3"
            >
              {/* Image preview */}
              {f.preview && (
                <img src={f.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}

              {/* File name */}
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate flex-1">
                {f.file.name}
              </span>

              {/* Status */}
              <div className="flex-shrink-0">
                {f.uploading && <Loader2 size={16} className="animate-spin text-primary" />}
                {!f.uploading && f.url && <CheckCircle2 size={16} className="text-green-500" />}
                {!f.uploading && f.error && (
                  <span title={f.error}>
                    <AlertCircle size={16} className="text-red-500" />
                  </span>
                )}
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ["Basic Info", "Media Upload", "Review & Submit"];
  return (
    <div className="mb-8">
      <div className="flex items-center mb-3">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${step > i + 1
                  ? "bg-green-500 text-white"
                  : step === i + 1
                    ? "bg-primary text-white ring-4 ring-primary/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
              >
                {step > i + 1 ? <CheckCircle2 size={18} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide mt-1 hidden sm:block ${step === i + 1 ? "text-primary" : "text-slate-400"
                  }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-4 transition-colors duration-500 ${step > i + 1 ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700"
                  }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ProjectFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ProjectFormValues>;
}

export default function ProjectForm({ onSuccess, initialData }: ProjectFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  // Read pre-selected category/subcategory/teacher from AssignmentWizard
  const setup = (() => {
    try {
      return JSON.parse(localStorage.getItem("project-setup") || "{}");
    } catch {
      return {};
    }
  })();

  // ── File states ──
  const [images, setImages] = useState<UploadedFile[]>([]);
  const [videos, setVideos] = useState<UploadedFile[]>([]);
  const [documents, setDocuments] = useState<UploadedFile[]>([]);

  const createProjectMutation = trpc.projects.submitProject.useMutation({
    retry: false,
    // @ts-ignore
    onError: () => { },
  });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData || {
      title: "",
      teamName: "",
      description: "",
      grade: "",
    },
  });

  // ── Add files helper ──
  const addFiles = useCallback(
    (
      newFiles: File[],
      setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
      folder: "images" | "videos" | "documents"
    ) => {
      const wrapped: UploadedFile[] = newFiles.map((file) => ({
        file,
        url: null,
        uploading: false,
        error: null,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));
      setter((prev) => [...prev, ...wrapped]);

      // Upload each immediately
      wrapped.forEach((_, i) => {
        const idx = (setter === setImages ? images : setter === setVideos ? videos : documents).length + i;
        uploadFile(newFiles[i], folder, setter, idx);
      });
    },
    [images, videos, documents]
  );

  const uploadFile = async (
    file: File,
    folder: "images" | "videos" | "documents",
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    idx: number
  ) => {
    if (!user?.id) return;

    setter((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, uploading: true, error: null } : f))
    );

    try {
      const url = await uploadToSupabase(file, folder, String(user.id));
      setter((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, uploading: false, url } : f))
      );
    } catch (err: any) {
      setter((prev) =>
        prev.map((f, i) =>
          i === idx ? { ...f, uploading: false, error: err.message || "Upload failed" } : f
        )
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const removeFile = (
    idx: number,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => setter((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ──
  const onSubmit = async (data: ProjectFormValues) => {
    const anyUploading = [...images, ...videos, ...documents].some((f) => f.uploading);
    if (anyUploading) {
      toast.error("Please wait for all files to finish uploading.");
      return;
    }

    // تأكد أن setup فيه subcategoryId
    if (!setup.subcategoryId) {
      toast.error("Please complete the setup wizard first (select teacher and category).");
      return;
    }

    setIsUploading(true);
    try {
      const imageUrls = images.filter((f) => f.url).map((f) => f.url!);
      const videoUrls = videos.filter((f) => f.url).map((f) => f.url!);
      const documentUrls = documents.filter((f) => f.url).map((f) => f.url!);

      await createProjectMutation.mutateAsync({
        title: data.title,
        teamName: data.teamName,           // ✅ كان ناقصًا
        description: data.description,
        grade: data.grade,                 // ✅ كان ناقصًا
        subcategoryId: setup.subcategoryId,
        supervisorId: setup.supervisorId || 1,
        documentUrls: [...imageUrls, ...videoUrls, ...documentUrls],
      });

      toast.success("🎉 Project submitted successfully!");
      localStorage.removeItem("project-setup");
      form.reset();
      setStep(1);
      setImages([]);
      setVideos([]);
      setDocuments([]);
      onSuccess?.();

    } catch (err: any) {
      // ✅ بدل الحفظ محلياً، نعرض الخطأ الحقيقي
      const message = err?.message || "Submission failed. Please try again.";
      toast.error(`❌ ${message}`);
      console.error("Project submission error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const allUploading = [...images, ...videos, ...documents].some((f) => f.uploading);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <StepBar step={step} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ══ STEP 1: Basic Info ══ */}
          {step === 1 && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Project Basic Information
                </CardTitle>
                {setup.teacher && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Teacher", value: setup.teacher },
                      { label: "Category", value: setup.categoryName },
                      { label: "Subcategory", value: setup.subcategory },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-3 py-1">
                        <span className="text-[10px] font-black text-green-600 uppercase">{label}:</span>
                        <span className="text-xs font-semibold text-green-800 dark:text-green-200">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-5">

                <FormField control={form.control} name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Project Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Solar-Powered Water Purifier" className="h-11" {...field} />
                      </FormControl>
                      <FormDescription>A clear, descriptive title (5–200 characters)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Team Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Green Innovators" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Project Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your project, the problem it solves, and your approach..."
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Minimum 20 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4">
                  <FormField control={form.control} name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Grade Level *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["9", "10", "11", "12"].map((g) => (
                              <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══ STEP 2: Media Upload ══ */}
          {step === 2 && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Upload Project Media
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Files upload to Supabase Storage automatically after selection. ✓ = uploaded.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">

                <DropZone
                  accept="image/*"
                  label="Project Photos"
                  hint="JPG, PNG, WEBP — photos of your project stages and results"
                  icon={ImageIcon}
                  files={images}
                  onAdd={(f) => addFiles(f, setImages, "images")}
                  onRemove={(i) => removeFile(i, setImages)}
                  maxFiles={10}
                />

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <DropZone
                    accept="video/mp4,video/mov,video/webm"
                    label="Project Video"
                    hint="MP4 or MOV — a short video presenting your project (max 500MB)"
                    icon={Video}
                    files={videos}
                    onAdd={(f) => addFiles(f, setVideos, "videos")}
                    onRemove={(i) => removeFile(i, setVideos)}
                    maxFiles={2}
                  />
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <DropZone
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    label="Documents (Optional)"
                    hint="PDF, Word, PowerPoint — research papers or presentations"
                    icon={FileText}
                    files={documents}
                    onAdd={(f) => addFiles(f, setDocuments, "documents")}
                    onRemove={(i) => removeFile(i, setDocuments)}
                    maxFiles={5}
                  />
                </div>

                {allUploading && (
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Loader2 size={16} className="animate-spin" />
                    Uploading files to Supabase Storage...
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ══ STEP 3: Review ══ */}
          {step === 3 && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Review & Submit
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">

                {/* Summary */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                  {[
                    { label: "Title", value: form.getValues("title") },
                    { label: "Team", value: form.getValues("teamName") },
                    { label: "Description", value: form.getValues("description") },
                    { label: "Grade", value: `Grade ${form.getValues("grade")}` },
                    { label: "Teacher", value: setup.teacher },
                    { label: "Category", value: setup.categoryName },
                    { label: "Subcategory", value: setup.subcategory },
                  ].map(({ label, value }) => value && (
                    <div key={label} className="flex gap-3 text-sm">
                      <span className="font-black text-slate-400 w-24 flex-shrink-0">{label}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Media summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: ImageIcon, label: "Photos", count: images.filter((f) => f.url).length, total: images.length },
                    { icon: Video, label: "Videos", count: videos.filter((f) => f.url).length, total: videos.length },
                    { icon: FileText, label: "Documents", count: documents.filter((f) => f.url).length, total: documents.length },
                  ].map(({ icon: Icon, label, count, total }) => (
                    <div key={label} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-center">
                      <Icon size={20} className="mx-auto text-slate-400 mb-1" />
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100">{count}</p>
                      <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">{label}</p>
                      {total > count && (
                        <p className="text-[10px] text-amber-500 font-bold">{total - count} still uploading</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Image previews */}
                {images.filter((f) => f.preview && f.url).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.filter((f) => f.preview && f.url).slice(0, 6).map((f, i) => (
                      <img key={i} src={f.preview} alt="" className="w-full h-20 object-cover rounded-xl" />
                    ))}
                  </div>
                )}

                {/* Disclaimer */}
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                    By submitting, you confirm all information is accurate. You may edit your project until the submission deadline — <strong>April 30, 2026</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══ Navigation buttons ══ */}
          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="rounded-xl px-6"
            >
              Back
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={async () => {
                  if (step === 1) {
                    const ok = await form.trigger(["title", "teamName", "description", "grade"]);
                    if (!ok) return;
                  }
                  setStep(step + 1);
                }}
                className="rounded-xl px-8 premium-gradient text-white border-none"
              >
                Continue →
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createProjectMutation.isPending || isUploading || allUploading}
                className="rounded-xl px-8 premium-gradient text-white border-none min-w-36"
              >
                {(createProjectMutation.isPending || isUploading) ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Submitting...</>
                ) : allUploading ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Uploading files...</>
                ) : (
                  "Submit Project 🚀"
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}