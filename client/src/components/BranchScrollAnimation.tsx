/**
 * Scroll-scrubbed branch growth background for the home page.
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

        const tmp = document.createElement("div");
        tmp.innerHTML = raw;
        const svg = tmp.querySelector("svg");
        if (!svg) return;
        injectedSvg = svg as SVGSVGElement;

        // Responsive sizing so the artwork stays visible across screen sizes.
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "auto");
        svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
        svg.classList.add("tree-animation-svg");
        svg.style.display = "block";

        const allPaths = Array.from(svg.querySelectorAll("path"));
        const mainBranchPaths = ["main-branch", "main-branch1", "main-branch2"]
          .map((id) => svg.querySelector<SVGPathElement>(`#${id}`))
          .filter((path): path is SVGPathElement => Boolean(path));

        // Identify leaves by fill color (#029d92).
        const leafPaths = allPaths.filter((p) => {
          const style = p.getAttribute("style") ?? "";
          const fill = p.getAttribute("fill") ?? "";
          return style.includes("029d92") || fill.includes("029d92");
        });

        // Create stroke overlays so the branch visibly draws with dashoffset.
        const strokeOverlayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const strokeOverlays: SVGPathElement[] = [];

        mainBranchPaths.forEach((path) => {
          const clone = path.cloneNode(true) as SVGPathElement;
          clone.setAttribute("fill", "none");
          clone.setAttribute("stroke", "#147664");
          clone.setAttribute("stroke-width", "18");
          clone.setAttribute("stroke-linecap", "round");
          clone.setAttribute("stroke-linejoin", "round");
          clone.setAttribute("opacity", "1");
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

        gsap.set(mainBranchPaths, { opacity: 0.2 });

        svg.appendChild(strokeOverlayGroup);

        wrapperRef.current.appendChild(svg);

        const triggerElement = wrapper.parentElement ?? wrapper;

        gsapCtx = gsap.context(() => {
          if (strokeOverlays.length === 0) return;

          // Prepare stroke drawing values.
          strokeOverlays.forEach((path) => {
            const length = path.getTotalLength();
            gsap.set(path, {
              strokeDasharray: length,
              strokeDashoffset: length,
            });
          });

          // Group leaves by nearest branch segment, then reveal each group
          // right after its branch segment finishes drawing.
          const branchCenters = mainBranchPaths.map((path) => {
            const box = path.getBBox();
            return box.x + box.width / 2;
          });

          const leafGroups = strokeOverlays.map(() => [] as SVGPathElement[]);
          leafPaths.forEach((leaf) => {
            const box = leaf.getBBox();
            const cx = box.x + box.width / 2;

            let bestIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;
            branchCenters.forEach((branchCx, idx) => {
              const d = Math.abs(cx - branchCx);
              if (d < bestDistance) {
                bestDistance = d;
                bestIndex = idx;
              }
            });

            leafGroups[bestIndex].push(leaf);
          });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "top 80%",
              end: "bottom 20%",
              scrub: true,
            },
          });

          strokeOverlays.forEach((strokePath, index) => {
            tl.to(strokePath, {
              strokeDashoffset: 0,
              duration: 1,
              ease: "none",
            });

            tl.to(
              mainBranchPaths[index],
              {
                opacity: 1,
                duration: 0.08,
                ease: "none",
              },
              "<"
            );

            const groupedLeaves = leafGroups[index] ?? [];
            if (groupedLeaves.length > 0) {
              tl.to(groupedLeaves, {
                scale: 1,
                opacity: 1,
                stagger: 0.05,
                duration: 0.55,
                ease: "power2.out",
              });
            }
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
      id="tree-animation-container"
      ref={wrapperRef}
      aria-hidden="true"
    />
  );
}
