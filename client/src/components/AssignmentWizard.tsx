import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const TEACHERS = [
  "Amna Hasan Abdulla Alshamsi",
  "Muneera Mabkhot Saeed Al Kqahali",
  "Neama Mohamed Ibrahim Elgamil",
  "Fatima Abdulla Salem Manea Alseiari",
  "Salha Sulaiman Sheikhmus",
  "Nadya Mustafa Matawa",
  "Amna Mustafa Abdulla Mustafa Alhashmi",
  "Asmaa Abdulla Ibrahim Jasem Alhammadi",
  "Sameya Hasan Omar",
  "Rosaila Abdel Hamid Hasan Souri",
  "Abir Abdel Fattah Ali Hegazy",
  "Hanan Fawwaz Mahmoud Tayfour",
  "Abeer M A Shalash",
  "Salsabeel Bassam Shehadeh Naser",
  "Yasmeen Omar Hussein Hamida",
  "Maryam Salem Farhan Alhammadi",
  "Anoud Mousa Ibrahim Abdulla Alblooshi",
  "Reema Chhetri",
  "Norhan Khaled Marzouk Amin Elsayed",
  "Riham Saleh Elsaid Ahmed Hassan",
  "Zahinabath Sakeya Abdul Rahiman Sali",
  "Arti Thakur",
  "Rasha Saleh Ahmed Hasan Almessabi",
  "Naledi Noxolo Bhengu",
  "Salma Shahnawaz Shaikh",
  "Huda Hasan Mohamed Kamal Alali",
  "Holly Catherine Myburgh",
  "Sajida Bibi Younus",
  "Liesil Elizabeth Williams",
  "Sumeera Nazir Ahmed Shuroo",
  "Kholiwe Mangazha",
];

interface AssignmentWizardProps {
  onComplete?: () => void;
}

export function AssignmentWizard({ onComplete }: AssignmentWizardProps) {
  const [step, setStep] = useState<"teacher" | "category" | "subcategory" | "confirm">("teacher");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Fetch categories and subcategories
  const { data: categories = [] } = trpc.categories.getAll.useQuery();
  const { data: subcategories = [] } = trpc.subcategories.getByCategory.useQuery(
    selectedCategory ? { categoryId: selectedCategory } : skipToken
  );

  // Filter teachers based on search
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch) return TEACHERS;
    return TEACHERS.filter((teacher) =>
      teacher.toLowerCase().includes(teacherSearch.toLowerCase())
    );
  }, [teacherSearch]);

  // Create assignment mutation
  const createAssignmentMutation = trpc.assignments.create.useMutation({
    onSuccess: () => {
      toast.success("Assignment saved successfully!");
      setStep("confirm");
      onComplete?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save assignment");
    },
  });

  const handleTeacherSelect = (teacher: string) => {
    setSelectedTeacher(teacher);
  };

  const nextToCategory = () => {
    if (selectedTeacher) {
      setStep("category");
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
  };

  const nextToSubcategory = () => {
    if (selectedCategory) {
      setStep("subcategory");
    }
  };

  const handleSubcategorySelect = (subcategoryId: number) => {
    setSelectedSubcategory(subcategoryId);
  };

  const handleConfirm = async () => {
    if (!selectedTeacher || !selectedCategory || !selectedSubcategory) {
      toast.error("Please complete all selections");
      return;
    }

    createAssignmentMutation.mutate({
      teacherName: selectedTeacher,
      mainCategoryId: selectedCategory,
      subcategoryId: selectedSubcategory,
    });
  };

  const selectedCategoryName = categories.find((c: any) => c.id === selectedCategory)?.name;
  const selectedSubcategoryName = subcategories.find((s: any) => s.id === selectedSubcategory)?.name;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Teacher Selection */}
      {step === "teacher" && (
        <Card className="glass-card border-white/10 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Select Your Teacher</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Choose your assigned teacher from the dropdown below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select value={selectedTeacher} onValueChange={handleTeacherSelect}>
              <SelectTrigger className="w-full h-12 bg-white/5 border-white/20 hover:bg-white/10 transition-colors font-medium">
                <SelectValue placeholder="Select a teacher..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {TEACHERS.map((teacher) => (
                  <SelectItem key={teacher} value={teacher} className="cursor-pointer">
                    {teacher}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full font-bold premium-gradient"
              disabled={!selectedTeacher}
              onClick={nextToCategory}
            >
              Continue to Categories
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Selection */}
      {step === "category" && (
        <Card className="glass-card border-white/10 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Select Main Category</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Choose your main sustainability category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((category: any) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className={`justify-start text-left h-auto py-4 px-4 font-bold transition-all ${
                    selectedCategory === category.id 
                      ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <span className="text-sm">{category.name}</span>
                </Button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTeacher("");
                  setStep("teacher");
                }}
                className="flex-[0.4] glass-card border-white/20 hover:bg-white/10 font-bold"
              >
                Back
              </Button>
              <Button
                className="flex-1 font-bold premium-gradient"
                disabled={!selectedCategory}
                onClick={nextToSubcategory}
              >
                Continue to Subcategories
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subcategory Selection */}
      {step === "subcategory" && (
        <Card className="glass-card border-white/10 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Select Subcategory</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Choose your specific subcategory within <span className="font-bold text-foreground">{selectedCategoryName}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subcategories.map((subcategory: any) => (
                <Button
                  key={subcategory.id}
                  variant={selectedSubcategory === subcategory.id ? "default" : "outline"}
                  className={`justify-start text-left h-auto py-4 px-4 font-bold transition-all ${
                    selectedSubcategory === subcategory.id 
                      ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                  onClick={() => handleSubcategorySelect(subcategory.id)}
                >
                  <span className="text-sm">{subcategory.name}</span>
                </Button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory(null);
                  setStep("category");
                }}
                className="flex-[0.4] glass-card border-white/20 hover:bg-white/10 font-bold"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedSubcategory || createAssignmentMutation.isPending}
                className="flex-1 font-bold premium-gradient"
              >
                {createAssignmentMutation.isPending ? "Configuring Dashboard..." : "Confirm & Setup Dashboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation */}
      {step === "confirm" && (
        <Card className="glass-card border-leaf-green/30 bg-leaf-green/5 rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl bg-leaf-green w-32 h-32 rounded-full"></div>
          <CardHeader>
            <CardTitle className="text-2xl font-black text-leaf-green">Assignment Confirmed!</CardTitle>
            <CardDescription className="text-leaf-green/80 font-medium">Your platform experience has been successfully tailored.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Teacher</p>
                <p className="font-bold text-foreground text-sm">{selectedTeacher}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Main Category</p>
                <p className="font-bold text-foreground text-sm">{selectedCategoryName}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Subcategory</p>
                <p className="font-bold text-foreground text-sm">{selectedSubcategoryName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
