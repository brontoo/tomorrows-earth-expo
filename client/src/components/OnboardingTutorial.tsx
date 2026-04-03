import { useState } from "react";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialStep {
  title: string;
  description: string;
  tips: string[];
  icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to Tomorrow's Earth Expo",
    description:
      "This interactive platform allows you to develop, submit, and showcase sustainability innovation projects. You'll collaborate with teammates, receive feedback from teachers, and compete for the People's Choice Award through public voting.",
    tips: [
      "The expo runs from March to May 2026",
      "All projects must focus on environmental sustainability",
      "You can work individually or in teams of up to 4 students",
    ],
    icon: "🌍",
  },
  {
    title: "Navigate Your Dashboard",
    description:
      "Your Student Dashboard is your central hub. Here you can create new projects, view your project status, track teacher feedback, and access resources. The dashboard shows your projects organized by status: Draft, Submitted, Under Review, Approved, and Rejected.",
    tips: [
      "Click 'Create New Project' to start a project",
      "Your project status updates as your teacher reviews it",
      "You can edit projects while they're in Draft status",
      "Check your dashboard regularly for teacher feedback",
    ],
    icon: "📊",
  },
  {
    title: "Create Your Project",
    description:
      "Start by identifying an environmental problem you want to solve. Choose from 4 sustainability categories: Clean Energy, Water & Waste, Biodiversity, or Climate Action. Then select a specific subcategory that matches your project focus.",
    tips: [
      "Think about problems you see in your community",
      "Research similar projects to understand what's already been done",
      "Be specific - 'plastic pollution' is better than 'pollution'",
      "Consider what resources and expertise your team has",
    ],
    icon: "💡",
  },
  {
    title: "Develop Your Solution",
    description:
      "Design an innovative solution to your identified problem. Your solution should be creative, feasible, and grounded in science. Explain how it works, what resources it needs, and how it could be implemented in your community or beyond.",
    tips: [
      "Use data and research to support your solution",
      "Think about real-world constraints and challenges",
      "Consider how your solution could be scaled up",
      "Get feedback from teachers and peers as you develop",
    ],
    icon: "🔧",
  },
  {
    title: "Research & Gather Evidence",
    description:
      "Support your project with credible research and data. Use academic sources, government reports, environmental organizations, and scientific studies. Cite all your sources properly. Strong evidence makes your project more compelling and credible.",
    tips: [
      "Use Google Scholar for academic papers",
      "Check environmental organization websites (EPA, UNEP, etc.)",
      "Interview local experts or community members",
      "Always cite your sources using proper format",
    ],
    icon: "📚",
  },
  {
    title: "Submit Your Project",
    description:
      "When you're ready, submit your project for teacher review. Your teacher will evaluate it using a rubric covering problem identification, solution innovation, data analysis, reflection, and communication. You may receive feedback and be asked to revise.",
    tips: [
      "Make sure all team members have contributed",
      "Double-check your writing for clarity and grammar",
      "Include all required files and information",
      "Submit early to allow time for revisions",
    ],
    icon: "📤",
  },
  {
    title: "Receive Teacher Feedback",
    description:
      "Your teacher will review your project and provide detailed feedback. They may approve it for the Innovation Hub, request revisions, or provide suggestions for improvement. Check your dashboard regularly for feedback notifications.",
    tips: [
      "Read feedback carefully and ask for clarification if needed",
      "Make revisions based on teacher suggestions",
      "Resubmit your project after making improvements",
      "Use feedback as a learning opportunity",
    ],
    icon: "💬",
  },
  {
    title: "Get Approved & Go Public",
    description:
      "Once your teacher approves your project, it appears on the Innovation Hub where all students and the public can view it. Your project becomes eligible for voting when the voting period opens. Congratulations on sharing your innovation!",
    tips: [
      "Share your project with friends and family",
      "Encourage others to vote for your project",
      "Learn from other approved projects",
      "Celebrate your achievement!",
    ],
    icon: "🎉",
  },
  {
    title: "Vote for Your Favorites",
    description:
      "During the voting period, visit the Voting page to cast your vote for the project you think is the most innovative. Each student can vote once. The project with the most votes wins the People's Choice Award. Voting is open to students and the public.",
    tips: [
      "Read all project descriptions before voting",
      "Consider innovation, feasibility, and impact",
      "You can change your vote until voting closes",
      "Share your thoughts about why you voted for a project",
    ],
    icon: "🗳️",
  },
  {
    title: "Explore Resources & Learning",
    description:
      "Access the Resources section to find guides, rubrics, templates, and videos to help you develop your project. These materials cover research methods, solution development, scientific writing, and more. Use these resources throughout your project journey.",
    tips: [
      "Review the project rubric before starting",
      "Use templates to organize your thinking",
      "Watch instructional videos for guidance",
      "Reference guides when you need help",
    ],
    icon: "📖",
  },
  {
    title: "Watch Journey Cinema",
    description:
      "Explore inspiring sustainability documentaries and student videos in Journey Cinema. These films showcase real-world environmental challenges and solutions. They can inspire your project ideas and help you understand environmental issues more deeply.",
    tips: [
      "Watch videos for inspiration and ideas",
      "Take notes on interesting solutions",
      "Discuss videos with your team",
      "Consider how videos relate to your project",
    ],
    icon: "🎬",
  },
];

export function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setHasCompletedTutorial(true);
      setIsOpen(false);
      localStorage.setItem("tutorialCompleted", "true");
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-leaf-green to-digital-cyan p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{step.icon}</span>
            <div>
              <h2 className="text-2xl font-bold">{step.title}</h2>
              <p className="text-sm opacity-90">
                Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close tutorial"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Description */}
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              💡 Tips for Success
            </h3>
            <ul className="space-y-3">
              {step.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-leaf-green font-bold flex-shrink-0">
                    ✓
                  </span>
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Progress</span>
              <span className="text-sm text-gray-600">
                {Math.round(((currentStep + 1) / TUTORIAL_STEPS.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-leaf-green to-digital-cyan h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 flex items-center justify-between border-t">
          <Button
            onClick={handlePrevious}
            disabled={isFirstStep}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Previous
          </Button>

          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-leaf-green w-8"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gradient-to-r from-leaf-green to-digital-cyan hover:opacity-90"
          >
            {isLastStep ? "Complete" : "Next"}
            {!isLastStep && <ChevronRight size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
