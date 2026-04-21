import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import PremiumCountdown from "@/components/PremiumCountdown";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (videoRef.current) {
          entry.isIntersecting ? videoRef.current.play() : videoRef.current.pause();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { if (containerRef.current) observer.unobserve(containerRef.current); };
  }, []);

  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "teacher"
        ? "/teacher/dashboard"
        : "/student/dashboard";

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-black"
      style={{ minHeight: "clamp(32rem, 88svh, 62rem)" }}
    >
      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay muted loop playsInline
        poster="https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/fgcpZapzqcuUaiGf.jpg"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Fallback image */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/fgcpZapzqcuUaiGf.jpg"
        alt="TEE Hero"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/60" />

      {/* Content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
        style={{ paddingTop: "clamp(56px, 7vh, 92px)" }}
      >
        <div className="max-w-5xl mx-auto w-full space-y-8 animate-fade-in">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 text-white/90 text-xs font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Um Al-Emarat School · Abu Dhabi · UAE
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl lg:text-[6rem] font-extrabold text-white leading-[1.05] tracking-tighter drop-shadow-2xl">
            Tomorrow's{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
              Earth
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
              Expo 2026
            </span>
          </h1>

          {/* Countdown */}
          <PremiumCountdown className="w-full max-w-5xl mx-auto" />

          {/* Vision statement */}
          <p className="text-base md:text-lg lg:text-xl text-white/85 max-w-2xl mx-auto font-light italic leading-relaxed drop-shadow">
            Um Al-Emarat School's premier sustainability innovation showcase — where students design, build, and present real solutions for a better planet.
          </p>

          {/* ── CTA — auth-aware ── */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            {isAuthenticated ? (
              /* Logged in → single dashboard button */
              <Link href={dashboardPath}>
                <Button
                  size="lg"
                  className="premium-gradient text-white font-bold px-10 py-6 text-base rounded-full shadow-2xl shadow-green-900/40 hover:scale-105 active:scale-95 transition-transform duration-200 border-none gap-2"
                >
                  <LayoutDashboard size={18} />
                  Go to My Dashboard
                </Button>
              </Link>
            ) : (
              /* Not logged in → two buttons */
              <>
                <Link href="/innovation-hub">
                  <Button
                    size="lg"
                    className="premium-gradient text-white font-bold px-10 py-6 text-base rounded-full shadow-2xl shadow-green-900/40 hover:scale-105 active:scale-95 transition-transform duration-200 border-none"
                  >
                    Explore Innovation Hub
                  </Button>
                </Link>
                <Link href="/choose-role">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 backdrop-blur-md border-white/25 text-white font-bold px-10 py-6 text-base rounded-full hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-200"
                  >
                    Sign In To Participate
                  </Button>
                </Link>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-7 h-7 text-white/50" />
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
    </div>
  );
}
