import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Vote,
  MessageSquare,
  BookOpen,
  Settings,
  Menu,
  X,
  Home,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface StudentDashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function StudentDashboardLayout({
  children,
  activeTab = "dashboard",
  onTabChange,
}: StudentDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "My Projects", icon: FileText },
    { id: "voting", label: "Voting Area", icon: Vote, href: "/vote" },
    { id: "resources", label: "Resources", icon: BookOpen, href: "/resources" },
    { id: "profile", label: "Profile Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-leaf-green/10 via-background to-background">
      {/* Mobile Menu Button */}
      <div className="lg:hidden sticky top-0 z-40 glass-card rounded-none border-b border-border/40 p-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-600 hover:text-slate-900"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block w-64 glass-card border-r border-white/10 min-h-[calc(100vh-80px)] sticky top-0`}
        >
          <div className="p-6">
            {/* User Profile Section */}
            <div className="mb-8 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 premium-gradient shadow-lg rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground tracking-tight truncate">{user?.name}</p>
                  <p className="text-xs font-medium text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                const handleClick = (e: React.MouseEvent) => {
                  setSidebarOpen(false);
                  if (!item.href && onTabChange) {
                    e.preventDefault();
                    onTabChange(item.id);
                  }
                };

                const linkElement = (
                  <a
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-white/10 text-primary font-bold shadow-sm"
                        : "text-muted-foreground font-medium hover:bg-white/5 hover:text-foreground"
                    }`}
                    onClick={handleClick}
                  >
                    <IconComponent size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                    <span>{item.label}</span>
                  </a>
                );

                return item.href ? (
                  <Link key={item.id} href={item.href}>
                    {linkElement}
                  </Link>
                ) : (
                  <div key={item.id}>{linkElement}</div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 relative">
          <div className="absolute top-4 right-4 lg:top-8 lg:right-8 z-10 w-auto">
            <Link href="/">
              <Button variant="outline" className="glass-card border-white/20 hover:bg-white/10 font-bold gap-2">
                <Home size={16} />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
            </Link>
          </div>
          <div className="p-4 lg:p-8 pt-20 lg:pt-8 w-full max-w-[100vw] lg:max-w-none overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
