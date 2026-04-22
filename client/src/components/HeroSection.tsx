import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import PremiumCountdown from "@/components/PremiumCountdown";

// SVG viewBox is 0 0 500 500; overlay renders at OVERLAY_PX × OVERLAY_PX
const OVERLAY_PX = 300;
const S = OVERLAY_PX / 500; // 0.3 — converts SVG units to rendered px

// Hub centres derived from the bearing-circle paths in widmill.svg
const HUBS: [number, number][] = [
  [128.056, 288],      // left   — fin-7/8/9
  [232.239, 231.116],  // centre — fin-4/5/6
  [342.608, 288],      // right  — fin-1/2/3
];

const WINDMILL_CSS = `
  @keyframes spinBlades {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes floatUp {
    0%   { transform: translateY(0)     scale(1); opacity: .85; }
    100% { transform: translateY(-50px) scale(0); opacity: 0;   }
  }
  @keyframes pulseHub {
    0%,100% { opacity: .55; transform: translate(-50%,-50%) scale(1);   }
    50%      { opacity: 0;   transform: translate(-50%,-50%) scale(2.2); }
  }
  @keyframes wmFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  #fin-1,#fin-2,#fin-3 {
    transform-box: view-box;
    transform-origin: 342.608px 288px;
    animation: spinBlades 4s linear infinite;
  }
  #fin-4,#fin-5,#fin-6 {
    transform-box: view-box;
    transform-origin: 232.239px 231.116px;
    animation: spinBlades 5s linear infinite;
  }
  #fin-7,#fin-8,#fin-9 {
    transform-box: view-box;
    transform-origin: 128.056px 288px;
    animation: spinBlades 3s linear infinite;
  }
`;

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    let cancelled = false;
    fetch('/widmill.svg')
      .then(r => r.text())
      .then(svg => {
        if (!cancelled && svgRef.current) svgRef.current.innerHTML = svg;
      });
    return () => { cancelled = true; };
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
      <style>{WINDMILL_CSS}</style>

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

      {/* Windmill overlay — bottom-right corner, blades animated via CSS */}
      <div
        className="absolute bottom-0 right-0 pointer-events-none select-none"
        style={{ width: OVERLAY_PX, height: OVERLAY_PX }}
        aria-hidden="true"
      >
        {/* SVG injected by fetch so CSS can target fin IDs */}
        <div
          ref={svgRef}
          style={{
            position: 'absolute',
            inset: 0,
            filter:
              'drop-shadow(0 0 5px rgba(74,222,128,.65)) drop-shadow(0 0 14px rgba(74,222,128,.22))',
            animation: 'wmFadeIn 2s ease-out forwards',
            opacity: 0,
          }}
        />

        {/* Pulsing glow disc at each hub centre */}
        {HUBS.map(([sx, sy], i) => (
          <div
            key={i}
            className="absolute rounded-full bg-green-400"
            style={{
              width: 10,
              height: 10,
              left: sx * S,
              top: sy * S,
              animation: `pulseHub ${1.8 + i * 0.4}s ease-out infinite ${i * 0.35}s`,
              opacity: 0,
            }}
          />
        ))}

        {/* Floating green particles rising from windmill bases */}
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-green-400"
            style={{
              width: 3,
              height: 3,
              left: 18 + i * 16,
              top: 143,
              animation: `floatUp ${1.3 + (i % 4) * 0.55}s ease-out infinite ${i * 0.42}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

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
