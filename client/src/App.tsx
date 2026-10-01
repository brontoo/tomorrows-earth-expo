import Gateway from "./pages/Gateway";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
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
// تمت إضافة مسار اللعبة كتحميل متأخر (Lazy-load)
const EcoJourneyPage          = lazy(() => import("./pages/EcoJourneyPage"));
// Sustainability missions & gamification (additive)
const Missions                = lazy(() => import("./pages/Missions"));
const MissionDetail           = lazy(() => import("./pages/MissionDetail"));
const MissionVerification     = lazy(() => import("./pages/MissionVerification"));
const MyJourney               = lazy(() => import("./pages/MyJourney"));
const Impact                  = lazy(() => import("./pages/Impact"));
const Explore                 = lazy(() => import("./pages/Explore"));
const ZoneDetail              = lazy(() => import("./pages/ZoneDetail"));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

/**
 * بطاقة الموقع في Gateway تحيل إلى /dashboard، وهذا المسار لم يكن معرّفًا
 * فيظهر خطأ 404. هنا نوجّه كل دور إلى لوحته الصحيحة.
 */
function DashboardRedirect() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuthContext();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login?redirectTo=%2Fdashboard");
      return;
    }
    const role = user?.role;
    setLocation(
      role === "admin"
        ? "/admin/dashboard"
        : role === "teacher"
          ? "/teacher/dashboard"
          : "/student/dashboard",
    );
  }, [isAuthenticated, user?.role, setLocation]);

  return <PageFallback />;
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Gateway} />
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
        {/* تمت إضافة مسار اللعبة هنا */}
        <Route path="/eco-journey" component={EcoJourneyPage} />
        {/* مسارات المهام والتلعيب (إضافية) */}
        <Route path="/missions" component={Missions} />
        <Route path="/missions/:id" component={MissionDetail} />
        <Route path="/impact" component={Impact} />
        {/* MyJourney يقبل خاصية embedded لذلك نمرّره كدالة عرض */}
        <Route path="/my-journey">{() => <MyJourney />}</Route>
        <Route path="/explore" component={Explore} />
        <Route path="/explore/:categorySlug" component={ZoneDetail} />
        <Route path="/teacher/mission-verification" component={MissionVerification} />
        {/* /dashboard كان مسارًا ميتًا يحيل إليه Gateway */}
        <Route path="/dashboard" component={DashboardRedirect} />
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
          <TooltipProvider>
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