/**
 * BranchScrollAnimation
 *
 * Loads branches.svg inline, then drives two scroll-scrubbed GSAP animations:
 *   1. Branch paths (fill #147664) – progressive reveal via SVG clipPath
 *      (simulates the stroke-dashoffset "drawing" effect on filled paths).
 *   2. Leaf/bud shapes (fill #029d92) – scale + fade-in with random stagger.
 *
 * The component is absolutely positioned so it sits as a background layer
 * behind all content in its nearest `position: relative` ancestor.
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

        // ── 3. Create the clipPath that drives the "drawing" reveal ─────────
        const clipId = "branch-scroll-reveal-clip";
        const clipPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "clipPath"
        );
        clipPath.setAttribute("id", clipId);

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

        // ── 4. Move all paths into a <g> with the clipPath applied ──────────
        const allPaths = Array.from(svg.querySelectorAll("path"));
        const branchGroup = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        branchGroup.setAttribute("clip-path", `url(#${clipId})`);
        allPaths.forEach((p) => branchGroup.appendChild(p));
        svg.appendChild(branchGroup);

        // ── 5. Identify leaf/bud paths (fill #029d92) ───────────────────────
        const leafPaths = allPaths.filter((p) => {
          const style = p.getAttribute("style") ?? "";
          const fill = p.getAttribute("fill") ?? "";
          return style.includes("029d92") || fill.includes("029d92");
        });

        // ── 6. Set initial state for leaves (hidden, scaled to 0) ───────────
        gsap.set(leafPaths, {
          transformBox: "fill-box",
          transformOrigin: "50% 50%",
          scale: 0,
          opacity: 0,
        });

        // ── 7. Attach SVG to the DOM wrapper ────────────────────────────────
        wrapperRef.current.appendChild(svg);

        // ── 8. Build GSAP animations inside a context for clean teardown ────
        gsapCtx = gsap.context(() => {
          // ── 8a. Branch drawing: grow the clipRect height 0 → SVG_H ────────
          gsap.to(clipRect, {
            attr: { height: SVG_H },
            ease: "none",
            scrollTrigger: {
              trigger: wrapper,
              start: "top 80%",
              end: "bottom 20%",
              scrub: 1,
            },
          });

          // ── 8b. Leaf stagger: scale + fade-in after branch growth begins ──
          if (leafPaths.length > 0) {
            const leafTl = gsap.timeline({
              scrollTrigger: {
                trigger: wrapper,
                start: "top 60%",
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

    // ── Cleanup ──────────────────────────────────────────────────────────────
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
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
        // Subtle opacity so the decorative layer doesn't overpower content
        opacity: 0.18,
      }}
    />
  );
}
