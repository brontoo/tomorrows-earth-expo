import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronDown, Shield } from "lucide-react";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateCountdown = () => {
      const expoDate = new Date('2026-05-14T00:00:00').getTime();
      const now = new Date().getTime();
      const distance = expoDate - now;

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (videoRef.current) {
          if (entry.isIntersecting) {
            videoRef.current.play();
            setIsVisible(true);
          } else {
            videoRef.current.pause();
            setIsVisible(false);
          }
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen min-h-screen overflow-hidden bg-black"
    >
      {/* Background Video with Fallback */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/fgcpZapzqcuUaiGf.jpg"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Fallback Image */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663327629652/fgcpZapzqcuUaiGf.jpg"
        alt="Tomorrow's Earth Expo Hero"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: videoRef.current?.error ? "block" : "none" }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {/* Title */}
          <h1 className="text-5xl md:text-7xl lg:text-9xl font-extrabold text-white hero-text-glow leading-tight tracking-tighter">
            Tomorrow's Earth <span className="text-transparent bg-clip-text bg-gradient-to-r from-leaf-green to-digital-cyan">Expo 2026</span>
          </h1>

          {/* Countdown Timer */}
          <div className="my-10 flex border-none justify-center gap-4 md:gap-8">
            {[
              { label: "Days", value: countdown.days },
              { label: "Hours", value: countdown.hours.toString().padStart(2, '0') },
              { label: "Minutes", value: countdown.minutes.toString().padStart(2, '0') },
              { label: "Seconds", value: countdown.seconds.toString().padStart(2, '0') }
            ].map((item, idx, arr) => (
              <div key={item.label} className="flex items-center gap-4 md:gap-8">
                <div className="glass-card px-4 py-3 md:px-6 md:py-4 rounded-2xl min-w-[70px] md:min-w-[100px] border-white/10">
                  <div className="text-3xl md:text-5xl font-bold text-white mb-1">{item.value}</div>
                  <div className="text-[10px] md:text-xs text-white/60 uppercase tracking-[0.2em] font-medium">{item.label}</div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="text-2xl md:text-4xl text-white/30 font-light">:</div>
                )}
              </div>
            ))}
          </div>

          {/* Vision Statement - Italic */}
          <p className="text-lg md:text-xl lg:text-2xl text-white/95 drop-shadow-md max-w-3xl mx-auto font-light italic leading-relaxed">
            TEE 2026 is Um Al-Emarat School's premier sustainability innovation showcase — where students design, build, and present real solutions for a better planet. May 14, 2026 | Um Al-Emarat School
          </p>

          {/* Simplified CTA Buttons */}
          <div className="pt-10 flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/innovation-hub">
              <Button
                size="lg"
                className="premium-gradient hover:opacity-90 text-white font-bold px-10 py-7 text-lg rounded-full shadow-2xl shadow-primary/20 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                Explore Innovation Hub
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="glass-card hover:bg-white/10 text-white border-white/20 font-bold px-10 py-7 text-lg rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                Sign In To Participate
              </Button>
            </Link>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-white/70" />
          </div>
        </div>
      </div>

      {/* Gradient Fade at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none" />
    </div>
  );
}
