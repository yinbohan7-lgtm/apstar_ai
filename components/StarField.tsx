"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
  active: boolean;
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const stars: Star[] = Array.from({ length: 250 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.8 + 0.2,
      opacity: Math.random(),
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    const shootingStars: ShootingStar[] = Array.from({ length: 3 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      length: Math.random() * 120 + 80,
      speed: Math.random() * 6 + 4,
      opacity: 0,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      active: false,
    }));

    let frame = 0;
    let animId: number;

    function resetShootingStar(s: ShootingStar) {
      s.x = Math.random() * canvas.width * 0.7;
      s.y = Math.random() * canvas.height * 0.3;
      s.opacity = 1;
      s.active = true;
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        const t = frame * star.twinkleSpeed + star.twinkleOffset;
        const opacity = 0.3 + 0.7 * ((Math.sin(t) + 1) / 2);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 230, 255, ${opacity})`;
        ctx.fill();
      });

      if (frame % 180 === 0) {
        const inactive = shootingStars.find((s) => !s.active);
        if (inactive) resetShootingStar(inactive);
      }

      shootingStars.forEach((s) => {
        if (!s.active) return;
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.015;
        if (s.opacity <= 0) {
          s.active = false;
          return;
        }
        const grad = ctx.createLinearGradient(
          s.x,
          s.y,
          s.x - Math.cos(s.angle) * s.length,
          s.y - Math.sin(s.angle) * s.length
        );
        grad.addColorStop(0, `rgba(150, 230, 255, ${s.opacity})`);
        grad.addColorStop(1, "rgba(150, 230, 255, 0)");
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(
          s.x - Math.cos(s.angle) * s.length,
          s.y - Math.sin(s.angle) * s.length
        );
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      frame++;
      animId = requestAnimationFrame(animate);
    }

    animate();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "transparent" }}
    />
  );
}
