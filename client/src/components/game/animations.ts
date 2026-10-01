import gsap from 'gsap';

export function initConstellationCanvas(canvas: HTMLCanvasElement, points: {x: number, y: number}[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // رسم الخطوط
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for(let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // رسم النجوم
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.fill();
    });
  };

  const animate = () => {
    points.forEach((p, i) => {
      p.y += Math.sin(Date.now() * 0.001 + i) * 0.2;
      p.x += Math.cos(Date.now() * 0.001 + i) * 0.1;
    });
    draw();
    requestAnimationFrame(animate);
  };
  animate();
}