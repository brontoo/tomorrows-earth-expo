import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Hide / Show on scroll ──────────────────────────────────────────────────
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;

      if (current <= 10) {
        // Always show at top of page
        setVisible(true);
      } else if (current < lastScrollY.current) {
        // Scrolling UP → show
        setVisible(true);
      } else if (current > lastScrollY.current + 8) {
        // Scrolling DOWN (with 8px threshold to avoid jitter) → hide
        setVisible(false);
        setMobileMenuOpen(false); // close mobile menu when hiding
      }

      lastScrollY.current = current;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/innovation-hub", label: "Innovation Hub" },
    { href: "/vote", label: "Vote" },
    { href: "/journey-cinema", label: "Journey Cinema" },
    { href: "/resources", label: "Resources" },
  ];

  const getDashboardLink = () => {
    if (!user) return null;
    switch (user.role) {
      case "admin": return { href: "/admin/dashboard", label: "Admin Dashboard" };
      case "teacher": return { href: "/teacher/dashboard", label: "Teacher Dashboard" };
      case "student": return { href: "/student/dashboard", label: "My Projects" };
      default: return null;
    }
  };

  const dashboardLink = getDashboardLink();

  return (
    <nav
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 glass-card rounded-2xl py-2 px-4 transition-all duration-300 ${visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-[calc(100%+2rem)] opacity-0 pointer-events-none"
        }`}
    >
      <div className="container px-0">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-leaf-green to-digital-cyan rounded-full blur opacity-25 group-hover:opacity-50 transition duration-300" />
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663327629652/4H46x9AiKyJYDgF5KtC5JK/tee-logo-icon-c4HyST3WbgCi982xP8aQdA.webp"
                alt="Tomorrow's Earth Expo"
                className="relative h-10 w-10 object-contain"
              />
            </div>
            <span className="hidden sm:inline text-foreground font-bold text-lg tracking-tight">
              TEE-2026
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                variant={location === link.href ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            {dashboardLink && (
              <Button
                variant={location === dashboardLink.href ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={dashboardLink.href}>{dashboardLink.label}</Link>
              </Button>
            )}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent/10">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-leaf-green to-digital-cyan text-white text-xs">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card mt-2">
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {dashboardLink && (
                    <Link href={dashboardLink.href}>
                      <DropdownMenuItem className="cursor-pointer">
                        {dashboardLink.label}
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                className="rounded-full px-6 premium-gradient border-none text-white hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                <Link href="/choose-role">Get Started</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  variant={location === link.href ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
              {dashboardLink && (
                <Button
                  variant={location === dashboardLink.href ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href={dashboardLink.href}>{dashboardLink.label}</Link>
                </Button>
              )}
              <div className="pt-4 border-t border-border mt-4">
                {isAuthenticated && user ? (
                  <>
                    <div className="px-4 py-2 text-sm">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                      <p className="text-muted-foreground capitalize">Role: {user.role}</p>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-white"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = "/choose-role";
                    }}
                  >
                    Login
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}