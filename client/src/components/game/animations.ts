// src/animations.ts
// مطابق لملف animations.js في المشروع المحلي:
//  - initFloatingParallax: استخدام قيم data-speed لكل عنصر (بدل أنيميشن GSAP المتعارض)
//  - initConstellationCanvas: نجوم بيضاء متوهجة فقط، بدون خطوط دائمة

export function initFloatingParallax(selector: string): () => void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(pointer: fine)');
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, previous = 0;
  const draw = (now: number) => {
    frame = 0;
    const dt = previous ? Math.min(.05, (now - previous) / 1000) : 1 / 60; previous = now;
    // Frame-rate independent damping, bounded at 12px even on wide monitors.
    const follow = 1 - Math.exp(-9 * dt);
    x += (targetX - x) * follow; y += (targetY - y) * follow;
    for (const el of elements) {
      const depth = Math.min(1, (Number(el.dataset.speed) || .05) / .08);
      el.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0) rotate(${x * depth * .06}deg)`;
    }
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .02) frame = requestAnimationFrame(draw);
    else previous = 0;
  };
  const wake = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); };
  const move = (event: PointerEvent) => {
    if (media.matches || !pointer.matches) return;
    targetX = (event.clientX / innerWidth - .5) * 24;
    targetY = (event.clientY / innerHeight - .5) * 18; wake();
  };
  const reset = () => { targetX = 0; targetY = 0; wake(); };
  const visibility = () => {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    if (!document.hidden) reset();
  };
  window.addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);
  media.addEventListener('change', reset);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', move);
    document.documentElement.removeEventListener('pointerleave', reset);
    media.removeEventListener('change', reset);
    document.removeEventListener('visibilitychange', visibility);
    elements.forEach(el => el.style.removeProperty('transform'));
  };
}

export function initConstellationCanvas(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[]
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FFFFFF';
    });
  };

  resize();
  draw();
  const handleResize = () => { resize(); draw(); };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}
