import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import InnovationHub from "./pages/InnovationHub";
import ProjectDetail from "./pages/ProjectDetail";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import JourneyCinema from "./pages/JourneyCinema";
import Resources from "./pages/Resources";
import WallMode from "./pages/WallMode";
import Vote from "./pages/Vote";
import ProjectSubmissionPage from "./pages/ProjectSubmissionPage";
import SubcategoriesPage from "./pages/SubcategoriesPage";
import SubcategoryDetailPage from "./pages/SubcategoryDetailPage";
import ChooseRole from "./pages/ChooseRole";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import { UserWelcomeToast } from "./components/UserWelcomeToast";
import PageNavigation from "./components/PageNavigation";
import AuthCallback from "@/pages/AuthCallback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth/callback" component={AuthCallback} />
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <UserWelcomeToast />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
