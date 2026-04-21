import { useEffect, useRef } from "react";

type GroupKind = "main" | "secondary" | "leaf";

type PreparedGroup = {
  kind: GroupKind;
  elements: SVGPathElement[];
  overlays: SVGPathElement[];
  lengths: number[];
  start: number;
  end: number;
};

type PreparedScene = {
  mode: "vector" | "raster";
  svg: SVGSVGElement;
  groups: PreparedGroup[];
};

type PathMeta = {
  element: SVGPathElement;
  color: string;
  length: number;
  centerY: number;
  score: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function sanitizeSvg(markup: string) {
  return markup
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .trim();
}

function parseSvgMarkup(markup: string) {
  const temp = document.createElement("div");
  temp.innerHTML = sanitizeSvg(markup);
  return temp.querySelector("svg") as SVGSVGElement | null;
}

function parseInlineStyles(styleText: string) {
  return styleText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex === -1) return accumulator;
      const key = entry.slice(0, separatorIndex).trim().toLowerCase();
      const value = entry.slice(separatorIndex + 1).trim();
      if (key) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
}

function normalizeColor(color: string | null | undefined) {
  if (!color) return null;
  const normalized = color.trim().toLowerCase();
  if (!normalized || normalized === "none" || normalized === "transparent") return null;
  return normalized;
}

function parseColor(color: string | null | undefined) {
  const normalized = normalizeColor(color);
  if (!normalized) return null;

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      const [r, g, b] = hex.split("").map((channel) => parseInt(channel + channel, 16));
      return { r, g, b };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
  if (!rgbMatch) return null;

  const parts = rgbMatch[1].split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;

  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
  };
}

function getElementColor(path: SVGPathElement) {
  const inlineStyles = parseInlineStyles(path.getAttribute("style") ?? "");
  return (
    normalizeColor(path.getAttribute("fill")) ||
    normalizeColor(inlineStyles.fill) ||
    normalizeColor(path.getAttribute("stroke")) ||
    normalizeColor(inlineStyles.stroke) ||
    "#2f6f5f"
  );
}

function isLeafLike(path: SVGPathElement, color: string) {
  const keywords = `${path.id} ${path.getAttribute("class") ?? ""}`.toLowerCase();
  if (/(leaf|foliage|petal|bud|flower)/.test(keywords)) return true;
  if (/(branch|twig|stem|trunk|vine|main|sub)/.test(keywords)) return false;

  const parsed = parseColor(color);
  if (!parsed) return false;

  return parsed.g > parsed.r * 0.8 && parsed.g > parsed.b * 0.9;
}

function buildMeta(paths: SVGPathElement[], viewBoxHeight: number) {
  return paths.flatMap<PathMeta>((path) => {
    try {
      const length = path.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return [];

      const bounds = path.getBBox();
      const color = getElementColor(path);
      const score = bounds.width * bounds.height + length * 4;

      return [{
        element: path,
        color,
        length,
        centerY: bounds.y + bounds.height / 2,
        score,
      }];
    } catch {
      return [];
    }
  }).map((meta) => ({
    ...meta,
    centerY: clamp(meta.centerY / viewBoxHeight, 0, 1),
  }));
}

function bucketMetas(metas: PathMeta[], bucketCount: number) {
  if (metas.length === 0) return [] as PathMeta[][];

  const buckets = Array.from({ length: Math.min(bucketCount, metas.length) }, () => [] as PathMeta[]);
  metas.forEach((meta, index) => {
    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.floor((index / Math.max(1, metas.length - 1 || 1)) * buckets.length)
    );
    buckets[bucketIndex].push(meta);
  });

  return buckets.filter((bucket) => bucket.length > 0);
}

function createOverlay(path: SVGPathElement, color: string, width: number) {
  const overlay = path.cloneNode(true) as SVGPathElement;
  overlay.removeAttribute("id");
  overlay.removeAttribute("class");
  overlay.setAttribute("fill", "none");
  overlay.setAttribute("stroke", color);
  overlay.setAttribute("stroke-width", String(width));
  overlay.setAttribute("stroke-linecap", "round");
  overlay.setAttribute("stroke-linejoin", "round");
  overlay.setAttribute("vector-effect", "non-scaling-stroke");
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  return overlay;
}

function createBranchGroup(metas: PathMeta[], kind: "main" | "secondary", overlayLayer: SVGGElement) {
  const averageY = metas.reduce((sum, meta) => sum + meta.centerY, 0) / metas.length;
  const startBase = kind === "main" ? 0.04 : 0.12;
  const span = kind === "main" ? 0.23 : 0.18;
  const start = clamp(startBase + averageY * 0.68, 0.02, 0.86);
  const end = clamp(start + span, start + 0.08, 0.98);
  const overlayWidth = kind === "main" ? 8 : 5;

  const overlays = metas.map((meta) => {
    const overlay = createOverlay(meta.element, meta.color, overlayWidth);
    overlay.setAttribute("stroke-dasharray", String(meta.length));
    overlay.setAttribute("stroke-dashoffset", String(meta.length));
    overlayLayer.appendChild(overlay);
    meta.element.style.opacity = kind === "main" ? "0.05" : "0";
    return overlay;
  });

  return {
    kind,
    elements: metas.map((meta) => meta.element),
    overlays,
    lengths: metas.map((meta) => meta.length),
    start,
    end,
  } satisfies PreparedGroup;
}

function createLeafGroup(metas: PathMeta[]) {
  const averageY = metas.reduce((sum, meta) => sum + meta.centerY, 0) / metas.length;
  const start = clamp(0.16 + averageY * 0.74, 0.12, 0.92);
  const end = clamp(start + 0.16, start + 0.06, 1);

  metas.forEach((meta) => {
    meta.element.style.opacity = "0";
    meta.element.style.transformBox = "fill-box";
    meta.element.style.transformOrigin = "50% 50%";
    meta.element.style.transform = "translate3d(0, 6px, 0) scale(0.88)";
    meta.element.style.willChange = "opacity, transform";
  });

  return {
    kind: "leaf",
    elements: metas.map((meta) => meta.element),
    overlays: [],
    lengths: [],
    start,
    end,
  } satisfies PreparedGroup;
}

function prepareScene(svg: SVGSVGElement, host: HTMLDivElement) {
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
  svg.classList.add("branch-animation-svg");

  const allPaths = Array.from(svg.querySelectorAll("path"));
  if (allPaths.length < 2) {
    svg.classList.add("is-raster-fallback");
    host.appendChild(svg);
    return {
      mode: "raster",
      svg,
      groups: [],
    } satisfies PreparedScene;
  }

  const viewBoxHeight = svg.viewBox.baseVal.height || 1;
  const metas = buildMeta(allPaths, viewBoxHeight);
  if (metas.length < 2) {
    svg.classList.add("is-raster-fallback");
    host.appendChild(svg);
    return {
      mode: "raster",
      svg,
      groups: [],
    } satisfies PreparedScene;
  }

  const leafMetas = metas
    .filter((meta) => isLeafLike(meta.element, meta.color))
    .sort((left, right) => left.centerY - right.centerY);
  const branchMetas = metas
    .filter((meta) => !leafMetas.includes(meta))
    .sort((left, right) => left.centerY - right.centerY);

  if (branchMetas.length === 0) {
    svg.classList.add("is-raster-fallback");
    host.appendChild(svg);
    return {
      mode: "raster",
      svg,
      groups: [],
    } satisfies PreparedScene;
  }

  const mainBranchCount = clamp(Math.round(branchMetas.length * 0.26), 2, 10);
  const mainBranchSet = new Set(
    [...branchMetas]
      .sort((left, right) => right.score - left.score)
      .slice(0, mainBranchCount)
      .map((meta) => meta.element)
  );

  const mainBranches = branchMetas.filter((meta) => mainBranchSet.has(meta.element));
  const secondaryBranches = branchMetas.filter((meta) => !mainBranchSet.has(meta.element));

  const overlayLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlayLayer.classList.add("branch-overlay-layer");

  const groups: PreparedGroup[] = [];
  mainBranches.forEach((meta) => {
    groups.push(createBranchGroup([meta], "main", overlayLayer));
  });

  bucketMetas(secondaryBranches, 12).forEach((bucket) => {
    groups.push(createBranchGroup(bucket, "secondary", overlayLayer));
  });

  bucketMetas(leafMetas, 16).forEach((bucket) => {
    groups.push(createLeafGroup(bucket));
  });

  svg.appendChild(overlayLayer);
  host.appendChild(svg);

  return {
    mode: "vector",
    svg,
    groups,
  } satisfies PreparedScene;
}

function applyScene(scene: PreparedScene, progress: number, pointerEnergy: number) {
  if (scene.mode === "raster") {
    const eased = easeOutCubic(progress);
    const energy = clamp(pointerEnergy, 0, 1);
    const reveal = clamp(8 + eased * 82 + energy * 10, 8, 100);
    const driftX = (1 - eased) * -28 + energy * 6;
    const driftY = (1 - eased) * 18 - energy * 4;
    const scale = 0.9 + eased * 0.13 + energy * 0.015;
    const shadowOpacity = 0.1 + eased * 0.2 + energy * 0.08;
    const blur = 0.4 + (1 - eased) * 1.8 - energy * 0.25;
    const brightness = 0.92 + eased * 0.12 + energy * 0.05;
    const clipTop = clamp(2.5 - eased * 2, 0, 2.5);
    const clipBottom = clamp(6 - eased * 4.5, 1, 6);

    scene.svg.style.opacity = String(0.1 + eased * 0.38 + energy * 0.06);
    scene.svg.style.clipPath = `inset(${clipTop}% ${100 - reveal}% ${clipBottom}% 0 round 0)`;
    scene.svg.style.transformOrigin = "left top";
    scene.svg.style.transform = `translate3d(${driftX}px, ${driftY}px, 0) scale(${scale})`;
    scene.svg.style.filter = `blur(${Math.max(0, blur)}px) saturate(${1 + eased * 0.18 + energy * 0.08}) contrast(${1 + eased * 0.08}) brightness(${brightness}) drop-shadow(0 22px 34px rgba(31, 94, 63, ${shadowOpacity}))`;
    return;
  }

  scene.groups.forEach((group) => {
    const local = clamp((progress - group.start) / Math.max(0.001, group.end - group.start), 0, 1);

    if (group.kind === "leaf") {
      const eased = easeOutCubic(local);
      const fadeTail = 1 - clamp((progress - group.end) / 0.18, 0, 1) * 0.22;
      const opacity = eased * fadeTail;
      group.elements.forEach((element) => {
        element.style.opacity = String(opacity);
        element.style.transform = `translate3d(0, ${(1 - eased) * 6}px, 0) scale(${0.88 + eased * 0.12})`;
      });
      return;
    }

    const eased = easeInOutCubic(local);
    const baseOpacity = group.kind === "main" ? 0.08 : 0.02;
    const maxOpacity = group.kind === "main" ? 0.96 : 0.78;

    group.elements.forEach((element) => {
      element.style.opacity = String(baseOpacity + eased * maxOpacity);
    });

    group.overlays.forEach((overlay, index) => {
      overlay.style.opacity = String(0.12 + eased * (group.kind === "main" ? 0.82 : 0.54));
      overlay.style.strokeDashoffset = String(group.lengths[index] * (1 - eased));
    });
  });
}

export default function BranchScrollAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const layer = layerRef.current;
    const scope = container?.parentElement;
    if (!container || !layer || !scope) return;

    const containerElement = container;
    const layerElement = layer;
    const scopeElement = scope;

    let disposed = false;
    let frameId = 0;
    let scene: PreparedScene | null = null;
    const abortController = new AbortController();
    const state = {
      armed: false,
      progress: 0,
      targetProgress: 0,
      pointerEnergy: 0,
      targetPointerEnergy: 0,
      parallaxX: 0,
      parallaxY: 0,
      targetParallaxX: 0,
      targetParallaxY: 0,
      lastPointerX: null as number | null,
      lastPointerY: null as number | null,
    };

    function measureProgress() {
      const rect = scopeElement.getBoundingClientRect();
      const total = rect.height + window.innerHeight;
      return clamp((window.innerHeight - rect.top) / Math.max(1, total), 0, 1);
    }

    function armAnimation() {
      state.armed = true;
      containerElement.dataset.armed = "true";
    }

    function handlePointerMove(event: PointerEvent) {
      armAnimation();
      const centeredX = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const centeredY = event.clientY / Math.max(window.innerHeight, 1) - 0.5;

      if (state.lastPointerX !== null && state.lastPointerY !== null) {
        const deltaX = Math.abs(event.clientX - state.lastPointerX);
        const deltaY = Math.abs(event.clientY - state.lastPointerY);
        const boost = clamp((deltaX + deltaY) / 140, 0.16, 1);
        state.targetPointerEnergy = Math.max(state.targetPointerEnergy, boost);
      } else {
        state.targetPointerEnergy = 0.35;
      }

      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
      state.targetParallaxX = centeredX * 36;
      state.targetParallaxY = centeredY * 20;
    }

    function handleWheel() {
      armAnimation();
      state.targetPointerEnergy = Math.max(state.targetPointerEnergy, 0.28);
    }

    function resetParallax() {
      state.targetParallaxX = 0;
      state.targetParallaxY = 0;
      state.targetPointerEnergy = 0;
      state.lastPointerX = null;
      state.lastPointerY = null;
    }

    function renderFrame() {
      if (disposed || !scene) return;

      state.targetProgress = measureProgress();
      const nextProgress = state.armed ? state.targetProgress : 0;
      state.progress += (nextProgress - state.progress) * 0.14;
      state.pointerEnergy += (state.targetPointerEnergy - state.pointerEnergy) * 0.12;
      state.parallaxX += (state.targetParallaxX - state.parallaxX) * 0.1;
      state.parallaxY += (state.targetParallaxY - state.parallaxY) * 0.1;
      state.targetPointerEnergy *= 0.94;

      applyScene(scene, state.progress, state.pointerEnergy);
      layerElement.style.transform = `translate3d(${state.parallaxX.toFixed(2)}px, ${state.parallaxY.toFixed(2)}px, 0)`;

      frameId = window.requestAnimationFrame(renderFrame);
    }

    function mountSceneFromMarkup(markup: string) {
      const svg = parseSvgMarkup(markup);
      if (!svg) return null;

      layerElement.replaceChildren();
      return prepareScene(svg, layerElement);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("pointerleave", resetParallax, { passive: true });

    fetch("/branches.svg", { signal: abortController.signal })
      .then((response) => response.text())
      .then((rawMarkup) => {
        if (disposed) return;

        scene = mountSceneFromMarkup(rawMarkup);

        if (!scene) {
          containerElement.dataset.mode = "missing";
          return;
        }

        containerElement.dataset.mode = scene.mode;
        frameId = window.requestAnimationFrame(renderFrame);
      })
      .catch(() => {
        containerElement.dataset.mode = "missing";
      });

    return () => {
      disposed = true;
      abortController.abort();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("pointerleave", resetParallax);
      layerElement.replaceChildren();
    };
  }, []);

  return (
    <div id="tree-animation-container" ref={containerRef} aria-hidden="true" data-mode="idle">
      <div className="branch-animation-stage">
        <div ref={layerRef} className="branch-animation-layer" />
      </div>
    </div>
  );
}
