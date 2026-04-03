import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Home } from "lucide-react";

export default function PageNavigation() {
  const [location] = useLocation();

  // Don't show on home page
  if (location === "/") {
    return null;
  }

  return (
    <div className="fixed top-20 left-0 right-0 flex items-center justify-between px-6 z-30 pointer-events-none">
      {/* Back Button - Left Side */}
      <button
        onClick={() => window.history.back()}
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-leaf-green to-digital-cyan text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 pointer-events-auto"
        title="Go Back"
        aria-label="Go back to previous page"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Go Back
        </span>
      </button>

      {/* Home Button - Right Side */}
      <Button
        asChild
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-digital-cyan to-leaf-green text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 p-0 pointer-events-auto"
        title="Go Home"
        aria-label="Go to home page"
      >
        <Link href="/">
          <Home className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Home
          </span>
        </Link>
      </Button>
    </div>
  );
}
