import React from "react";
// src/components/VineBackdrop.tsx
// صورة الكرمة — خلفية تزيينية للصفحة الرئيسية
// تأثيرات: scroll-driven opacity + mouse parallax + CSS grow animation
// لا تؤثر على الأداء: passive listeners + will-change + transform فقط

import { useEffect, useRef, useCallback } from "react";
import vineImg from "@/assets/illustrations/Gemini_Generated_Image_m5j9c9m5j9c9m5j9.png";

interface VineBackdropProps {
  style?: React.CSSProperties;
}

export default function VineBackdrop({ style }: VineBackdropProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef    = useRef<HTMLImageElement>(null);

  // ── Scroll-driven opacity (8% → 30%) ────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const img     = imgRef.current;
    if (!wrapper || !img) return;

    const onScroll = () => {
      // progress based on entire page scroll: 0 = top, 1 = bottom
      const scrolled = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrolled / maxScroll));

      // opacity: 0.08 at top → 0.30 at bottom of page
      const opacity = 0.08 + progress * 0.22;
      img.style.opacity = String(opacity.toFixed(3));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Mouse parallax (luxury subtle drift) ────────────────────────────────────
  const rafId = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  const animateParallax = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    // Smooth lerp toward target
    current.current.x += (target.current.x - current.current.x) * 0.06;
    current.current.y += (target.current.y - current.current.y) * 0.06;

    img.style.transform =
      `translate(${current.current.x.toFixed(2)}px, ${current.current.y.toFixed(2)}px)`;

    rafId.current = requestAnimationFrame(animateParallax);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Map mouse to ±18px drift
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      target.current.x = ((e.clientX - cx) / cx) * 18;
      target.current.y = ((e.clientY - cy) / cy) * 10;
    };

    const handleMouseLeave = () => {
      target.current = { x: 0, y: 0 };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    rafId.current = requestAnimationFrame(animateParallax);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [animateParallax]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="vine-backdrop"
      style={style}
    >
      <img
        ref={imgRef}
        src={vineImg}
        alt=""
        draggable={false}
        className="vine-img"
      />
    </div>
  );
}