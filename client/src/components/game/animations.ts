// src/animations.ts
// مطابق لملف animations.js في المشروع المحلي:
//  - initFloatingParallax: استخدام قيم data-speed لكل عنصر (بدل أنيميشن GSAP المتعارض)
//  - initConstellationCanvas: نجوم بيضاء متوهجة فقط، بدون خطوط دائمة

export function initFloatingParallax(selector: string): void {
  const elements = document.querySelectorAll<HTMLElement>(selector);

  window.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    elements.forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-speed') || '') || 0.05;
      const moveX = (clientX - centerX) * speed;
      const moveY = (clientY - centerY) * speed;

      el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0px) rotate(${moveX * 0.02}deg)`;
    });
  });
}

export function initConstellationCanvas(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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
  window.addEventListener('resize', () => {
    resize();
    draw();
  });
}
