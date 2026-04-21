import { useEffect, useRef } from "react";
import gsap from "gsap";

const LEAF_PATHS = [
  { d: "M14809 3236c20,-154 53,-295 66,-444c5,-58 7,-115 3,-173c-3,-38 -7,-76 -19,-114c-12,-40 -34,-77 -55,-117c-23,-41 -47,-77 -76,-117c-60,-85 -124,-150 -186,-237c0,-44 -68,-80 -150,-80c-83,0 -150,36 -150,80c-76,108 -142,193 -190,303c-30,68 -48,134 -51,203c-2,40 8,80 19,120c17,60 41,118 71,177c74,146 172,281 266,429c17,67 131,114 256,106c125,-9 213,-70 197,-137", opacity: 0.58 },
  { d: "M15738 3032c104,-101 236,-211 364,-340c44,-44 86,-89 123,-135c24,-30 47,-61 62,-92c21,-42 27,-82 38,-123c8,-30 7,-56 11,-85c10,-87 -3,-148 20,-218c45,-37 27,-87 -42,-111c-69,-25 -162,-15 -208,22c-149,53 -275,107 -425,196c-78,46 -143,96 -200,155c-30,32 -51,67 -70,102c-28,53 -47,105 -61,159c-39,150 -41,285 -53,403c-35,65 36,133 157,151c121,19 248,-19 282,-84", opacity: 0.5 },
  { d: "M20322 4713c-54,-129 -85,-251 -133,-380c-18,-48 -33,-94 -55,-141c-14,-30 -28,-60 -48,-89c-26,-37 -64,-69 -96,-105c-23,-26 -50,-46 -75,-71c-70,-69 -139,-117 -195,-191c3,-44 -63,-81 -145,-83c-83,-1 -152,34 -154,78c-56,61 -86,107 -123,171c-24,42 -34,77 -44,120c-17,68 -17,131 1,199c10,38 35,75 60,111c39,53 84,104 140,153c136,121 293,223 456,333c55,61 191,87 305,57c113,-29 161,-102 107,-163", opacity: 0.5 },
  { d: "M7108 10243c-165,-108 -262,-204 -368,-300c-42,-37 -76,-75 -117,-112c-27,-24 -53,-48 -84,-71c-41,-30 -91,-55 -139,-85c-34,-21 -69,-37 -107,-58c-99,-55 -186,-92 -297,-157c-26,-42 -111,-65 -190,-51c-78,14 -121,60 -95,102c-15,70 -24,118 -25,181c-2,68 14,121 36,182c15,42 40,80 72,117c32,38 76,73 125,105c96,64 204,121 336,171c168,64 346,115 576,170c100,41 243,31 320,-23c76,-54 58,-130 -42,-171", opacity: 0.44 },
  { d: "M6352 7687c-165,-108 -262,-204 -368,-300c-42,-37 -76,-75 -117,-112c-27,-24 -53,-48 -84,-71c-41,-30 -91,-55 -139,-85c-34,-21 -69,-37 -107,-58c-99,-55 -186,-92 -297,-157c-26,-42 -111,-65 -190,-51c-78,14 -121,60 -95,102c-15,70 -24,118 -25,181c-2,68 14,121 36,182c15,42 40,80 72,117c32,38 76,73 125,105c96,64 204,121 336,171c168,64 346,115 576,170c100,41 243,31 320,-23c76,-54 58,-130 -42,-171", opacity: 0.52 },
  { d: "M3239 13451c-165,-108 -262,-204 -368,-300c-42,-37 -76,-75 -117,-112c-27,-24 -53,-48 -84,-71c-41,-30 -91,-55 -139,-85c-34,-21 -69,-37 -107,-58c-99,-55 -186,-92 -297,-157c-26,-42 -111,-65 -190,-51c-78,14 -121,60 -95,102c-15,70 -24,118 -25,181c-2,68 14,121 36,182c15,42 40,80 72,117c32,38 76,73 125,105c96,64 204,121 336,171c168,64 346,115 576,170c100,41 243,31 320,-23c76,-54 58,-130 -42,-171", opacity: 0.45 },
  { d: "M2871 26792c-165,-108 -262,-204 -368,-300c-42,-37 -76,-75 -117,-112c-27,-24 -53,-48 -84,-71c-41,-30 -91,-55 -139,-85c-34,-21 -69,-37 -107,-58c-99,-55 -186,-92 -297,-157c-26,-42 -111,-65 -190,-51c-78,14 -121,60 -95,102c-15,70 -24,118 -25,181c-2,68 14,121 36,182c15,42 40,80 72,117c32,38 76,73 125,105c96,64 204,121 336,171c168,64 346,115 576,170c100,41 243,31 320,-23c76,-54 58,-130 -42,-171", opacity: 0.5 },
  { d: "M13787 31585c-165,-108 -262,-204 -368,-300c-42,-37 -76,-75 -117,-112c-27,-24 -53,-48 -84,-71c-41,-30 -91,-55 -139,-85c-34,-21 -69,-37 -107,-58c-99,-55 -186,-92 -297,-157c-26,-42 -111,-65 -190,-51c-78,14 -121,60 -95,102c-15,70 -24,118 -25,181c-2,68 14,121 36,182c15,42 40,80 72,117c32,38 76,73 125,105c96,64 204,121 336,171c168,64 346,115 576,170c100,41 243,31 320,-23c76,-54 58,-130 -42,-171", opacity: 0.44 },
  { d: "M2871 29460c-165,-108 -262,-204 -368,-300c-42,-37 -76,-75 -117,-112c-27,-24 -53,-48 -84,-71c-41,-30 -91,-55 -139,-85c-34,-21 -69,-37 -107,-58c-99,-55 -186,-92 -297,-157c-26,-42 -111,-65 -190,-51c-78,14 -121,60 -95,102c-15,70 -24,118 -25,181c-2,68 14,121 36,182c15,42 40,80 72,117c32,38 76,73 125,105c96,64 204,121 336,171c168,64 346,115 576,170c100,41 243,31 320,-23c76,-54 58,-130 -42,-171", opacity: 0.5 },
  { d: "M8619 31585c-165,-108 -262,-204 -368,-300c-42,-37 -76,-75 -117,-112c-27,-24 -53,-48 -84,-71c-41,-30 -91,-55 -139,-85c-34,-21 -69,-37 -107,-58c-99,-55 -186,-92 -297,-157c-26,-42 -111,-65 -190,-51c-78,14 -121,60 -95,102c-15,70 -24,118 -25,181c-2,68 14,121 36,182c15,42 40,80 72,117c32,38 76,73 125,105c96,64 204,121 336,171c168,64 346,115 576,170c100,41 243,31 320,-23c76,-54 58,-130 -42,-171", opacity: 0.44 },
] as const;

const CANVAS_SIZE = 62000;

function createClusterGrid(
  cols: number,
  rows: number,
  offsetX: number,
  offsetY: number,
  jitterX: number,
  jitterY: number,
  baseScale: number,
  scaleVariance: number,
) {
  const clusters: string[] = [];
  const stepX = CANVAS_SIZE / cols;
  const stepY = CANVAS_SIZE / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = row * 37 + col * 53;
      const jx = ((seed % 11) - 5) * jitterX;
      const jy = ((seed % 13) - 6) * jitterY;
      const scale = baseScale + ((seed % 7) - 3) * scaleVariance;
      const rotation = ((seed % 17) - 8) * 1.3;
      const x = Math.max(1200, col * stepX + offsetX + jx);
      const y = Math.max(1200, row * stepY + offsetY + jy);

      clusters.push(`translate(${Math.round(x)} ${Math.round(y)}) scale(${scale.toFixed(3)}) rotate(${rotation.toFixed(1)})`);
    }
  }

  return clusters;
}

const LEAF_CLUSTERS = createClusterGrid(7, 8, 1400, 1200, 180, 220, 0.33, 0.01);
const LEAF_BACKGROUND_CLUSTERS = createClusterGrid(6, 7, 2600, 2000, 260, 280, 0.38, 0.012);

export default function LeafBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const leaves = gsap.utils.toArray<SVGPathElement>(container.querySelectorAll(".leaf-shape"));
    const backLeaves = gsap.utils.toArray<SVGPathElement>(container.querySelectorAll(".leaf-shape-back"));
    const allLeaves = [...backLeaves, ...leaves];
    const leafMeta = allLeaves.map((leaf) => {
      const box = leaf.getBBox();
      const baseOpacity = Number(leaf.getAttribute("opacity") ?? "0.4");
      return {
        leaf,
        centerX: box.x + box.width / 2,
        centerY: box.y + box.height / 2,
        baseOpacity,
      };
    });

    let mouseX = 0;
    let mouseY = 0;
    let rafId: number | null = null;

    const ctx = gsap.context(() => {
      leaves.forEach((leaf, index) => {
        const depth = ((index % 5) + 1) / 5;
        leaf.dataset.depth = String(depth);
        leaf.dataset.parallax = "front";

        if (!prefersReducedMotion) {
          gsap.to(leaf, {
            // Slightly stronger wind-like drift for a more organic idle feel.
            xPercent: `random(${-2.3 * depth}, ${2.3 * depth})`,
            yPercent: `random(${-3.4 * depth}, ${3.4 * depth})`,
            rotation: `random(${-1.2 * depth}, ${1.2 * depth})`,
            duration: `random(${3.4 + depth}, ${8.6 + depth})`,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * 0.04,
          });
        }
      });

      backLeaves.forEach((leaf, index) => {
        const depth = ((index % 4) + 1) / 4;
        leaf.dataset.depth = String(depth);
        leaf.dataset.parallax = "back";

        if (!prefersReducedMotion) {
          gsap.to(leaf, {
            // Back layer drifts more subtly to preserve depth illusion.
            xPercent: `random(${-1.4 * depth}, ${1.4 * depth})`,
            yPercent: `random(${-2.2 * depth}, ${2.2 * depth})`,
            rotation: `random(${-0.8 * depth}, ${0.8 * depth})`,
            duration: `random(${6.8 + depth * 2}, ${14 + depth * 2})`,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * 0.06,
          });
        }
      });
    }, container);

    const processMouseMove = () => {
      rafId = null;
      if (prefersReducedMotion) return;
      const svg = svgRef.current;
      if (!svg) return;

      const nx = (mouseX / window.innerWidth - 0.5) * 2;
      const ny = (mouseY / window.innerHeight - 0.5) * 2;
      const rect = svg.getBoundingClientRect();
      const localX = mouseX - rect.left;
      const localY = mouseY - rect.top;
      const mx = (localX / rect.width) * CANVAS_SIZE;
      const my = (localY / rect.height) * CANVAS_SIZE;

      leafMeta.forEach(({ leaf, centerX, centerY, baseOpacity }) => {
        const depth = Number(leaf.dataset.depth ?? 0.5);
        const isBackLayer = leaf.dataset.parallax === "back";
        const dx = centerX - mx;
        const dy = centerY - my;
        const distanceSq = dx * dx + dy * dy;

        // Bigger interaction radius so leaves start reacting earlier.
        const radius = isBackLayer ? 5200 : 6800;
        const radiusSq = radius * radius;

        // Smooth Gaussian-style falloff for premium, non-linear response.
        const influence = Math.exp(-distanceSq / radiusSq);
        const angle = Math.atan2(dy, dx);

        // Stronger base parallax with clear front/back depth separation.
        const baseX = -nx * (isBackLayer ? 12 + depth * 16 : 32 + depth * 48);
        const baseY = -ny * (isBackLayer ? 9 + depth * 13 : 24 + depth * 34);

        // Repulsion increased ~30-50% versus previous tuning.
        const repel = influence * (isBackLayer ? 22 + depth * 20 : 34 + depth * 40);
        const repelX = Math.cos(angle) * repel;
        const repelY = Math.sin(angle) * repel;

        // Rotation reacts to both cursor direction and repulsion proximity.
        const directionalTilt = nx * (isBackLayer ? 3 + depth * 4 : 6 + depth * 8) + ny * (isBackLayer ? 1.6 : 2.4);
        const repelTwist = Math.sin(angle) * influence * (isBackLayer ? 6 : 11);

        gsap.to(leaf, {
          x: baseX + repelX,
          y: baseY + repelY,
          rotation: directionalTilt + repelTwist,
          scale: 1 + influence * (isBackLayer ? 0.07 : 0.12),
          opacity: Math.min(0.95, baseOpacity + influence * (isBackLayer ? 0.2 : 0.28)),
          // Magnetic lag: responsive but not snapping.
          duration: isBackLayer ? 0.36 : 0.28,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    };

    const onMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(processMouseMove);
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    // Pause GSAP during navigation to free up main thread
    const handleRouteChange = () => gsap.globalTimeline.pause();
    const handleRouteIdle = () => gsap.globalTimeline.resume();
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("popstate", handleRouteIdle, { once: false });

    // Resume after 400ms to allow new page to paint first
    let resumeTimer: ReturnType<typeof setTimeout>;
    const onPop = () => {
      gsap.globalTimeline.pause();
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => gsap.globalTimeline.resume(), 400);
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("popstate", handleRouteChange);
      window.removeEventListener("popstate", handleRouteIdle);
      window.removeEventListener("popstate", onPop);
      clearTimeout(resumeTimer);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 62000 62000"
        className="absolute inset-0 h-full w-full scale-[1.08] opacity-70 md:opacity-80"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMin slice"
        style={{ willChange: "transform", contain: "strict" }}
      >
        {LEAF_BACKGROUND_CLUSTERS.map((transform, clusterIndex) => (
          <g key={`back-${transform}`} transform={transform}>
            {LEAF_PATHS.map((leaf, leafIndex) => (
              <path
                key={`back-${clusterIndex}-${leafIndex}`}
                className="leaf-shape-back"
                d={leaf.d}
                fill="#a4d65e"
                opacity={Math.max(0.2, leaf.opacity - 0.25)}
              />
            ))}
          </g>
        ))}

        {LEAF_CLUSTERS.map((transform, clusterIndex) => (
          <g key={transform} transform={transform}>
            {LEAF_PATHS.map((leaf, leafIndex) => (
              <path
                key={`${clusterIndex}-${leafIndex}`}
                className="leaf-shape"
                d={leaf.d}
                fill="#c6ec55"
                opacity={leaf.opacity}
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
