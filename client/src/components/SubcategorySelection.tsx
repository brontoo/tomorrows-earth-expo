import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight } from "lucide-react";

interface SubcategorySelectionProps {
  categoryId: number;
  categoryName: string;
  onSelectSubcategory: (subcategoryId: number, subcategoryName: string) => void;
}

export default function SubcategorySelection({
  categoryId,
  categoryName,
  onSelectSubcategory,
}: SubcategorySelectionProps) {
  const [, navigate] = useLocation();
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch subcategories for the selected category
  const { data: subcategories, isLoading: isLoadingSubcategories } =
    trpc.subcategories.getByCategory.useQuery({ categoryId });

  const handleSelectSubcategory = (subcategoryId: number, subcategoryName: string) => {
    setSelectedSubcategory(subcategoryId);
    onSelectSubcategory(subcategoryId, subcategoryName);
  };

  const handleProceedToSubmission = () => {
    if (selectedSubcategory) {
      setIsLoading(true);
      // Navigate to project submission page with subcategory ID
      navigate(`/project-submission/${selectedSubcategory}`);
    }
  };

  if (isLoadingSubcategories) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Categories</span>
        <ChevronRight className="w-4 h-4" />
        <span className="font-semibold text-foreground">{categoryName}</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Select Your Focus Area</h2>
        <p className="text-muted-foreground">
          Choose a specific subcategory within {categoryName} to submit your project
        </p>
      </div>

      {/* Subcategories Grid */}
      {subcategories && subcategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subcategories.map((subcategory) => (
            <Card
              key={subcategory.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedSubcategory === subcategory.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleSelectSubcategory(subcategory.id, subcategory.name)}
            >
              <CardHeader>
                <CardTitle className="text-xl font-bold italic" style={{ fontFamily: "Times New Roman, serif" }}>
                  {subcategory.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {subcategory.description || "No description available"}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No subcategories available for this category</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end pt-6">
        <Button
          variant="outline"
          onClick={() => navigate("/innovation-hub")}
        >
          Back to Categories
        </Button>
        <Button
          onClick={handleProceedToSubmission}
          disabled={!selectedSubcategory || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Proceed to Submission
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
