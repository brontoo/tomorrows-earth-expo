import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserWelcomeToast } from "./components/UserWelcomeToast";

// Eagerly load only the most-visited pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";

// Lazy-load everything else (code splitting)
const InnovationHub      = lazy(() => import("./pages/InnovationHub"));
const ProjectDetail      = lazy(() => import("./pages/ProjectDetail"));
const StudentDashboard   = lazy(() => import("./pages/StudentDashboard"));
const TeacherDashboard   = lazy(() => import("./pages/TeacherDashboard"));
const AdminDashboard     = lazy(() => import("./pages/AdminDashboard"));
const JourneyCinema      = lazy(() => import("./pages/JourneyCinema"));
const Resources          = lazy(() => import("./pages/Resources"));
const WallMode           = lazy(() => import("./pages/WallMode"));
const Vote               = lazy(() => import("./pages/Vote"));
const ProjectSubmissionPage   = lazy(() => import("./pages/ProjectSubmissionPage"));
const SubcategoriesPage       = lazy(() => import("./pages/SubcategoriesPage"));
const SubcategoryDetailPage   = lazy(() => import("./pages/SubcategoryDetailPage"));
const ChooseRole              = lazy(() => import("./pages/ChooseRole"));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={SignUp} />
        <Route path="/choose-role" component={ChooseRole} />
        <Route path="/innovation-hub" component={InnovationHub} />
        <Route path="/innovation-hub/:categorySlug" component={InnovationHub} />
        <Route path="/project/:id" component={ProjectDetail} />
        <Route path="/student/dashboard" component={StudentDashboard} />
        <Route path="/teacher/dashboard" component={TeacherDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/journey-cinema" component={JourneyCinema} />
        <Route path="/resources" component={Resources} />
        <Route path="/wall-mode" component={WallMode} />
        <Route path="/vote" component={Vote} />
        <Route path="/project-submission" component={ProjectSubmissionPage} />
        <Route path="/project-submission/:categoryId" component={ProjectSubmissionPage} />
        <Route path="/category/:categoryId" component={SubcategoriesPage} />
        <Route path="/category/:categoryId/subcategory/:subcategoryName" component={SubcategoryDetailPage} />
        <Route path="/category/:categoryId/subcategory/:subcategoryName/submit" component={ProjectSubmissionPage} />
        <Route path="/my-projects" component={StudentDashboard} />
        <Route path="/my-projects/:projectId" component={ProjectDetail} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider style={{position: 'relative', zIndex: 10}}>
            <Toaster />
            <UserWelcomeToast />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
