import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  baseX?: number;
  baseY?: number;
}

export interface ParticleConfig {
  count: number;
  colors: string[];
  speed: number;
  shape: 'scattered' | 'heart';
}

function heartPosition(t: number, scale: number): { x: number; y: number } {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: -y * scale };
}

function createParticles(
  canvas: HTMLCanvasElement,
  config: ParticleConfig
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < config.count; i++) {
    let x: number;
    let y: number;
    let baseX: number | undefined;
    let baseY: number | undefined;

    if (config.shape === 'heart') {
      const t = (i / config.count) * Math.PI * 2;
      const pos = heartPosition(t, 8);
      x = canvas.width / 2 + pos.x + (Math.random() - 0.5) * 30;
      y = canvas.height / 2 + pos.y + (Math.random() - 0.5) * 30;
      baseX = x;
      baseY = y;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    }

    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * config.speed,
      vy: (Math.random() - 0.5) * config.speed,
      radius: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      baseX,
      baseY,
    });
  }
  return particles;
}

export function useParticleCanvas(config: ParticleConfig) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatingRef = useRef(false);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const particles = createParticles(canvas, config);

    if (reducedMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * 0.6;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      return () => window.removeEventListener('resize', resize);
    }

    animatingRef.current = true;

    const animate = () => {
      if (!animatingRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        if (p.baseX !== undefined && p.baseY !== undefined) {
          p.x = p.baseX + Math.sin(Date.now() * 0.001 + p.baseX * 0.01) * 1.5;
          p.y = p.baseY + Math.cos(Date.now() * 0.001 + p.baseY * 0.01) * 1.5;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => {
      animatingRef.current = false;
      window.removeEventListener('resize', resize);
    };
  }, [config, reducedMotion]);

  return { canvasRef };
}
