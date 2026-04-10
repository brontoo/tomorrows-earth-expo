import { useEffect, useRef } from "react";

interface DecorativeTreeSystemProps {
  startDate: string;
  endDate: string;
}

interface LeafParticle {
  id: number;
  x: number;
  y: number;
  speedY: number;
  driftX: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  phase: number;
  amplitude: number;
  hueShift: number;
  el: HTMLDivElement;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function DecorativeTreeSystem({ startDate, endDate }: DecorativeTreeSystemProps) {
  const treeRef = useRef<HTMLDivElement | null>(null);
  const leavesLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const treeEl = treeRef.current;
    const leavesLayerEl = leavesLayerRef.current;
    if (!treeEl || !leavesLayerEl) return;

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const totalMs = Math.max(1, endMs - startMs);

    let rafId = 0;
    let leafId = 0;
    let lastFrameTs = performance.now();
    let lastSpawnTs = 0;
    let lastScrollY = window.scrollY;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const leaves: LeafParticle[] = [];

    let targetWind = 0;
    let currentWind = 0;
    let targetParallax = 0;
    let currentParallax = 0;
    let currentGrowth = 0.2;

    const setTreeTransforms = (growth: number, parallaxPx: number, swayDeg: number) => {
      treeEl.style.setProperty("--tree-growth", growth.toFixed(4));
      treeEl.style.setProperty("--tree-parallax", `${parallaxPx.toFixed(2)}px`);
      treeEl.style.setProperty("--tree-sway", `${swayDeg.toFixed(3)}deg`);
    };

    const spawnLeaf = (timestamp: number) => {
      if (prefersReducedMotion) return;
      if (leaves.length > 70) return;
      if (timestamp - lastSpawnTs < 90) return;
      lastSpawnTs = timestamp;

      const el = document.createElement("div");
      el.className = "eco-leaf";
      leavesLayerEl.appendChild(el);

      const size = 8 + Math.random() * 8;
      const hueShift = -8 + Math.random() * 20;

      const particle: LeafParticle = {
        id: leafId,
        x: window.innerWidth - (80 + Math.random() * 210),
        y: 120 + Math.random() * 170,
        speedY: 44 + Math.random() * 55,
        driftX: -8 + Math.random() * 16,
        rotation: Math.random() * 360,
        rotationSpeed: -90 + Math.random() * 180,
        size,
        phase: Math.random() * Math.PI * 2,
        amplitude: 5 + Math.random() * 11,
        hueShift,
        el,
      };

      el.style.width = `${size.toFixed(1)}px`;
      el.style.height = `${(size * (0.68 + Math.random() * 0.25)).toFixed(1)}px`;
      el.style.setProperty("--leaf-hue-shift", `${hueShift.toFixed(2)}deg`);

      leaves.push(particle);
      leafId += 1;
    };

    const onMouseMove = (event: MouseEvent) => {
      const normalized = (event.clientX / window.innerWidth) * 2 - 1;
      // Wind is normalized to [-1, 1] and then smoothed in the RAF loop.
      targetWind = clamp(normalized, -1, 1);
    };

    const onScroll = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;

      // Parallax is intentionally subtle to keep the tree elegant.
      targetParallax = clamp(scrollY * 0.14, -40, 260);

      if (delta > 3) {
        spawnLeaf(performance.now());
      }

      lastScrollY = scrollY;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const animate = (timestamp: number) => {
      const frameDelta = Math.min(64, timestamp - lastFrameTs);
      const deltaScale = frameDelta / 16.6667;
      lastFrameTs = timestamp;

      const now = Date.now();
      const progress = clamp((now - startMs) / totalMs, 0, 1);
      const growthTarget = 0.2 + progress * 0.8;

      // Lerp smoothing gives inertia to both wind and growth, avoiding jitter.
      currentWind += (targetWind - currentWind) * 0.06 * deltaScale;
      currentParallax += (targetParallax - currentParallax) * 0.09 * deltaScale;
      currentGrowth += (growthTarget - currentGrowth) * 0.035 * deltaScale;

      const swayDeg = currentWind * 1.85;

      // Transform composition is centralized in CSS variables to avoid transform overrides.
      setTreeTransforms(currentGrowth, currentParallax, swayDeg);

      for (let i = leaves.length - 1; i >= 0; i -= 1) {
        const leaf = leaves[i];

        leaf.y += leaf.speedY * deltaScale;
        leaf.x += (leaf.driftX + currentWind * 16) * deltaScale;
        leaf.rotation += leaf.rotationSpeed * deltaScale;

        const wave = Math.sin(leaf.y * 0.02 + leaf.phase + timestamp * 0.0012) * leaf.amplitude;
        const composedX = leaf.x + wave;

        leaf.el.style.transform = `translate3d(${composedX.toFixed(2)}px, ${leaf.y.toFixed(2)}px, 0) rotate(${leaf.rotation.toFixed(2)}deg)`;

        if (leaf.y > window.innerHeight + 70 || leaf.x < -90 || leaf.x > window.innerWidth + 90) {
          leaf.el.remove();
          leaves.splice(i, 1);
        }
      }

      rafId = window.requestAnimationFrame(animate);
    };

    onScroll();
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(rafId);

      for (const leaf of leaves) {
        leaf.el.remove();
      }
    };
  }, [startDate, endDate]);

  return (
    <>
      <div aria-hidden="true" className="eco-tree-system">
        <div ref={treeRef} className="eco-tree-root">
          <svg className="eco-tree-svg" viewBox="0 0 380 1900" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ecoTrunkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(129, 230, 151, 0.05)" />
                <stop offset="48%" stopColor="rgba(74, 222, 128, 0.34)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.46)" />
              </linearGradient>
              <linearGradient id="ecoBranchGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(167, 243, 208, 0.56)" />
                <stop offset="100%" stopColor="rgba(52, 211, 153, 0.20)" />
              </linearGradient>
              <radialGradient id="ecoCanopyGlow" cx="50%" cy="30%" r="50%">
                <stop offset="0%" stopColor="rgba(134, 239, 172, 0.32)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
              </radialGradient>
              <filter id="ecoTreeBlur" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7.6" />
              </filter>
            </defs>

            <ellipse cx="206" cy="430" rx="132" ry="250" fill="url(#ecoCanopyGlow)" filter="url(#ecoTreeBlur)" />

            <path
              d="M198 1770 C 208 1470, 214 1180, 200 860 C 190 650, 198 480, 210 300"
              stroke="url(#ecoTrunkGradient)"
              strokeWidth="20"
              strokeLinecap="round"
              fill="none"
            />

            <path d="M201 1325 C 138 1235, 123 1106, 135 972" stroke="url(#ecoBranchGradient)" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M206 1210 C 268 1110, 280 962, 259 818" stroke="url(#ecoBranchGradient)" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M203 1045 C 153 950, 138 862, 160 744" stroke="url(#ecoBranchGradient)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M205 920 C 248 835, 260 760, 248 668" stroke="url(#ecoBranchGradient)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M208 788 C 181 705, 177 618, 193 538" stroke="url(#ecoBranchGradient)" strokeWidth="5" strokeLinecap="round" fill="none" />

            <g fill="rgba(167, 243, 208, 0.55)">
              <ellipse cx="153" cy="972" rx="14" ry="7" transform="rotate(-24 153 972)" />
              <ellipse cx="257" cy="820" rx="13" ry="6" transform="rotate(18 257 820)" />
              <ellipse cx="161" cy="748" rx="12" ry="6" transform="rotate(-15 161 748)" />
              <ellipse cx="246" cy="668" rx="11" ry="5" transform="rotate(30 246 668)" />
              <ellipse cx="196" cy="530" rx="10" ry="5" transform="rotate(-10 196 530)" />
            </g>

            <path d="M195 1785 C 152 1770, 118 1762, 88 1760" stroke="rgba(20, 184, 166, 0.38)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M209 1788 C 246 1774, 284 1765, 319 1762" stroke="rgba(16, 185, 129, 0.34)" strokeWidth="6" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>
      <div aria-hidden="true" ref={leavesLayerRef} className="eco-leaf-layer" />
    </>
  );
}
