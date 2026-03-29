import { useEffect, useRef } from "react";

export default function HeroCube() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let scrollOffset = 0;

    const points = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ] as const;

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ] as const;

    let frame = 0;
    const start = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(canvas.clientWidth * ratio);
      const height = Math.floor(canvas.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const updateScroll = () => {
      const rect = canvas.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const heroCenter = rect.top + rect.height * 0.5;
      const viewportCenter = viewportHeight * 0.5;
      const normalized = (heroCenter - viewportCenter) / viewportHeight;
      scrollOffset = Math.max(-1, Math.min(1, normalized));
    };

    const project = (
      point: readonly [number, number, number],
      angleX: number,
      angleY: number,
      angleZ: number,
    ) => {
      const [x0, y0, z0] = point;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosZ = Math.cos(angleZ);
      const sinZ = Math.sin(angleZ);

      let x = x0;
      let y = y0 * cosX - z0 * sinX;
      let z = y0 * sinX + z0 * cosX;

      const xY = x * cosY + z * sinY;
      const zY = -x * sinY + z * cosY;
      x = xY;
      z = zY;

      const xZ = x * cosZ - y * sinZ;
      const yZ = x * sinZ + y * cosZ;
      x = xZ;
      y = yZ;

      const perspective = 1 / (z + 4.4);
      return {
        x: x * perspective,
        y: y * perspective,
        z,
      };
    };

    const render = () => {
      resize();

      const width = canvas.width;
      const height = canvas.height;
      const elapsed = (performance.now() - start) / 1000;

      context.clearRect(0, 0, width, height);

      const squareSize = Math.min(width, height) * 0.52;
      const parallaxY = scrollOffset * height * -0.5;
      const centerX = width * 0.5;
      const centerY = height * 0.38 + parallaxY;
      const scale = squareSize * 0.34;

      const angleX = elapsed * 0.7;
      const angleY = elapsed * 0.95;
      const angleZ = elapsed * 0.35;

      const projected = points.map((point) =>
        project(point, angleX, angleY, angleZ),
      );

      const glow = context.createRadialGradient(
        centerX,
        centerY,
        scale * 0.08,
        centerX,
        centerY,
        squareSize * 0.95,
      );
      glow.addColorStop(0, "rgba(157, 212, 241, 0.18)");
      glow.addColorStop(0.42, "rgba(122, 184, 223, 0.1)");
      glow.addColorStop(1, "rgba(122, 184, 223, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(centerX, centerY);
      context.scale(scale, scale);

      context.lineWidth = 1 / scale;
      context.strokeStyle = "rgba(173, 217, 255, 0.72)";
      context.shadowColor = "rgba(122, 184, 223, 0.35)";
      context.shadowBlur = 28;

      for (const [a, b] of edges) {
        context.beginPath();
        context.moveTo(projected[a].x, projected[a].y);
        context.lineTo(projected[b].x, projected[b].y);
        context.stroke();
      }

      context.fillStyle = "rgba(232, 238, 251, 0.9)";
      for (const point of projected) {
        context.beginPath();
        context.arc(point.x, point.y, 0.02, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();

      frame = window.requestAnimationFrame(render);
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
