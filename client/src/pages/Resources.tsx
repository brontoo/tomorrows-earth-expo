import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navigation from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Download, ExternalLink, FileText, HelpCircle, Wrench } from "lucide-react";

export default function Resources() {
  const { data: resources } = trpc.resources.getAll.useQuery();

  const toolkitResources = resources?.filter((r) => r.type === "toolkit") || [];
  const rubricResources = resources?.filter((r) => r.type === "rubric") || [];
  const faqResources = resources?.filter((r) => r.type === "faq") || [];
  const guideResources = resources?.filter((r) => r.type === "guide") || [];

  const defaultFAQs = [
    {
      question: "What file formats are supported for uploads?",
      answer: "Images: JPG, PNG, GIF (max 10MB each). Videos: MP4, MOV (max 100MB). For 3D models, we support Sketchfab embed links.",
    },
    {
      question: "When is the submission deadline?",
      answer: "All project submissions must be completed by May 5, 2026 at 11:59 PM. After this date, submissions will be automatically locked.",
    },
    {
      question: "Can I edit my project after submission?",
      answer: "Once submitted, projects can only be edited if returned by a teacher for revision. After approval, projects cannot be edited except by administrators.",
    },
    {
      question: "How many team members can work on a project?",
      answer: "Teams can have 1-5 members. All team members should be registered on the platform.",
    },
    {
      question: "What happens if my project is rejected?",
      answer: "If your project is rejected, you'll receive feedback from your teacher explaining what needs improvement. You can then revise and resubmit your project.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Resources & Guidelines</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create an outstanding project for Tomorrow's Earth Expo 2026
          </p>
        </div>

        {/* Digital Toolkit */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Wrench className="text-primary" size={32} />
            <h2 className="text-3xl font-bold">Digital Toolkit</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toolkitResources.length > 0 ? (
              toolkitResources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    {resource.description && (
                      <CardDescription>{resource.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {resource.fileUrl && (
                      <Button asChild className="w-full">
                        <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2" size={16} />
                          Access Tool
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Canva Design Templates</CardTitle>
                    <CardDescription>
                      Professional templates for posters and presentations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <a href="https://www.canva.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2" size={16} />
                        Access Tool
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Sketchfab 3D Models</CardTitle>
                    <CardDescription>
                      Create and embed interactive 3D models
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <a href="https://sketchfab.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2" size={16} />
                        Access Tool
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Google Scholar</CardTitle>
                    <CardDescription>
                      Research scientific papers and articles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <a href="https://scholar.google.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2" size={16} />
                        Access Tool
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </section>

        {/* Judging Rubric */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-primary" size={32} />
            <h2 className="text-3xl font-bold">Judging Rubric</h2>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Criteria</CardTitle>
              <CardDescription>
                Projects will be evaluated based on the following criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Scientific Method (25%)</h4>
                  <p className="text-sm text-muted-foreground">
                    Clear hypothesis, methodology, data collection, and analysis
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Innovation (25%)</h4>
                  <p className="text-sm text-muted-foreground">
                    Originality and creativity of the solution
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Impact (25%)</h4>
                  <p className="text-sm text-muted-foreground">
                    Potential to address environmental challenges
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Presentation (25%)</h4>
                  <p className="text-sm text-muted-foreground">
                    Quality of documentation, visuals, and communication
                  </p>
                </div>
              </div>
              {rubricResources.length > 0 && rubricResources[0]?.fileUrl && (
                <Button asChild className="w-full">
                  <a href={rubricResources[0].fileUrl} download>
                    <Download className="mr-2" size={16} />
                    Download Full Rubric (PDF)
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="text-primary" size={32} />
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {(faqResources.length > 0 ? faqResources : defaultFAQs).map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {"question" in item ? item.question : item.title}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {"answer" in item ? item.answer : item.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
