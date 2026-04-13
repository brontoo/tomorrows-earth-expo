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
    const abortCtrl = new AbortController();
    const segmentCount = 8;

    fetch("/branches.svg", { signal: abortCtrl.signal })
      .then((r) => r.text())
      .then((raw) => {
        if (!wrapperRef.current) return;
        wrapperRef.current.innerHTML = "";

        const triggerElement = wrapper.parentElement ?? wrapper;

        gsapCtx = gsap.context(() => {
          for (let i = 0; i < segmentCount; i += 1) {
            const segment = document.createElement("div");
            segment.className = "tree-zigzag-segment";
            if (i % 2 === 1) segment.classList.add("tree-zigzag-flipped");
            segment.style.top = `${(i * 100) / segmentCount}%`;
            segment.style.height = `${100 / segmentCount + 6}%`;

            const tmp = document.createElement("div");
            tmp.innerHTML = raw;
            const svg = tmp.querySelector("svg");
            if (!svg) continue;

            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "auto");
            svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
            svg.classList.add("tree-animation-svg");
            svg.style.display = "block";
            segment.appendChild(svg);
            wrapper.appendChild(segment);

            const allPaths = Array.from(svg.querySelectorAll("path"));
            const mainBranchPaths = ["main-branch", "main-branch1", "main-branch2"]
              .map((id) => svg.querySelector<SVGPathElement>(`#${id}`))
              .filter((path): path is SVGPathElement => Boolean(path));

            if (mainBranchPaths.length === 0) continue;

            const leafPaths = allPaths.filter((p) => {
              const style = p.getAttribute("style") ?? "";
              const fill = p.getAttribute("fill") ?? "";
              return style.includes("029d92") || fill.includes("029d92");
            });

            const strokeOverlayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const strokeOverlays: SVGPathElement[] = [];

            mainBranchPaths.forEach((path) => {
              const clone = path.cloneNode(true) as SVGPathElement;
              clone.setAttribute("fill", "none");
              clone.setAttribute("stroke", "#147664");
              clone.setAttribute("stroke-width", "18");
              clone.setAttribute("stroke-linecap", "round");
              clone.setAttribute("stroke-linejoin", "round");
              clone.setAttribute("opacity", "0.95");
              strokeOverlayGroup.appendChild(clone);
              strokeOverlays.push(clone);
            });

            svg.appendChild(strokeOverlayGroup);

            gsap.set(leafPaths, {
              transformBox: "fill-box",
              transformOrigin: "50% 50%",
              scale: 0,
              opacity: 0,
            });
            gsap.set(mainBranchPaths, { opacity: 0.22 });

            strokeOverlays.forEach((path) => {
              const length = path.getTotalLength();
              gsap.set(path, {
                strokeDasharray: length,
                strokeDashoffset: length,
              });
            });

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
                const distance = Math.abs(cx - branchCx);
                if (distance < bestDistance) {
                  bestDistance = distance;
                  bestIndex = idx;
                }
              });

              leafGroups[bestIndex].push(leaf);
            });

            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: triggerElement,
                start: "top 90%",
                end: "bottom 20%",
                scrub: true,
              },
            });

            strokeOverlays.forEach((strokePath, idx) => {
              tl.to(strokePath, {
                strokeDashoffset: 0,
                duration: 1,
                ease: "none",
              });

              tl.to(
                mainBranchPaths[idx],
                {
                  opacity: 1,
                  duration: 0.1,
                  ease: "none",
                },
                "<"
              );

              const groupedLeaves = leafGroups[idx] ?? [];
              if (groupedLeaves.length > 0) {
                tl.to(
                  groupedLeaves,
                  {
                    scale: 1,
                    opacity: 1,
                    stagger: 0.045,
                    duration: 0.65,
                    ease: "power2.out",
                  },
                  "<+0.18"
                );
              }
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
      if (wrapperRef.current) wrapperRef.current.innerHTML = "";
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
