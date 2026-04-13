/**
 * Scroll-scrubbed branch growth background for the home page.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ── SVG coordinate constants (from branches.svg viewBox="0 0 4961 3508") ──────
const SVG_W = 4961;
const SVG_H = 3508;

export default function BranchScrollAnimation() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let gsapCtx: ReturnType<typeof gsap.context> | null = null;
    let injectedSvg: SVGSVGElement | null = null;
    const abortCtrl = new AbortController();

    fetch("/branches.svg", { signal: abortCtrl.signal })
      .then((r) => r.text())
      .then((raw) => {
        if (!wrapperRef.current) return;

        // ── 1. Parse the SVG ────────────────────────────────────────────────
        const tmp = document.createElement("div");
        tmp.innerHTML = raw;
        const svg = tmp.querySelector("svg");
        if (!svg) return;
        injectedSvg = svg as SVGSVGElement;

        // Make it fill its container
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.display = "block";

        // ── 2. Ensure <defs> exists ─────────────────────────────────────────
        let defs = svg.querySelector("defs");
        if (!defs) {
          defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
          svg.insertBefore(defs, svg.firstChild);
        }

        // Reveal all filled geometry from top to bottom.
        const clipId = "branch-scroll-reveal-clip";
        const clipPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "clipPath"
        );
        clipPath.setAttribute("id", clipId);
        clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");

        const clipRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        clipRect.setAttribute("x", "0");
        clipRect.setAttribute("y", "0");
        clipRect.setAttribute("width", String(SVG_W));
        // Start height at 0 – the ScrollTrigger will grow it to SVG_H
        clipRect.setAttribute("height", "0");
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);

        // Group original geometry under one clipped group.
        const allPaths = Array.from(svg.querySelectorAll("path"));
        const branchGroup = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        branchGroup.setAttribute("clip-path", `url(#${clipId})`);
        allPaths.forEach((p) => branchGroup.appendChild(p));
        svg.appendChild(branchGroup);

        // Identify leaves/buds by color (#029d92).
        const leafPaths = allPaths.filter((p) => {
          const style = p.getAttribute("style") ?? "";
          const fill = p.getAttribute("fill") ?? "";
          return style.includes("029d92") || fill.includes("029d92");
        });

        // Create stroke overlays for the 3 main branch paths so dash drawing is explicit.
        const mainBranchPaths = allPaths.filter((p) => (p.getAttribute("id") ?? "").startsWith("main-branch"));
        const strokeOverlayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const strokeOverlays: SVGPathElement[] = [];

        mainBranchPaths.forEach((path) => {
          const clone = path.cloneNode(true) as SVGPathElement;
          clone.setAttribute("fill", "none");
          clone.setAttribute("stroke", "#147664");
          clone.setAttribute("stroke-width", "20");
          clone.setAttribute("stroke-linecap", "round");
          clone.setAttribute("stroke-linejoin", "round");
          clone.setAttribute("opacity", "0.95");
          strokeOverlayGroup.appendChild(clone);
          strokeOverlays.push(clone);
        });

        // Initial state for leaves.
        gsap.set(leafPaths, {
          transformBox: "fill-box",
          transformOrigin: "50% 50%",
          scale: 0,
          opacity: 0,
        });

        svg.appendChild(strokeOverlayGroup);

        // Attach SVG to wrapper.
        wrapperRef.current.appendChild(svg);

        const triggerElement = wrapper.parentElement ?? wrapper;

        // Build animations in GSAP context for clean teardown.
        gsapCtx = gsap.context(() => {
          // Global growth reveal for all filled shapes.
          gsap.to(clipRect, {
            attr: { height: SVG_H },
            ease: "none",
            scrollTrigger: {
              trigger: triggerElement,
              start: "top 80%",
              end: "bottom 20%",
              scrub: 1,
            },
          });

          // Dash-draw the primary branch paths.
          strokeOverlays.forEach((path, index) => {
            const length = path.getTotalLength();
            gsap.set(path, {
              strokeDasharray: length,
              strokeDashoffset: length,
            });

            gsap.to(path, {
              strokeDashoffset: 0,
              ease: "none",
              scrollTrigger: {
                trigger: triggerElement,
                start: "top 80%",
                end: "bottom 20%",
                scrub: 1,
              },
              delay: index * 0.04,
            });
          });

          // Leaf stagger reveal.
          if (leafPaths.length > 0) {
            const leafTl = gsap.timeline({
              scrollTrigger: {
                trigger: triggerElement,
                start: "top 80%",
                end: "bottom 20%",
                scrub: 1,
              },
            });

            leafTl.to(leafPaths, {
              scale: 1,
              opacity: 1,
              stagger: { each: 0.04, from: "random" },
              ease: "back.out(1.4)",
              duration: 1,
            });
          }
        }, wrapper);
      })
      .catch(() => {
        // Fetch was aborted on unmount or an error occurred – no action needed.
      });

    return () => {
      abortCtrl.abort();
      gsapCtx?.revert();
      if (injectedSvg && wrapperRef.current?.contains(injectedSvg)) {
        wrapperRef.current.removeChild(injectedSvg);
      }
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 0.65,
        mixBlendMode: "multiply",
      }}
    />
  );
}
