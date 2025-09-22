import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  animate,
} from "framer-motion";

type Props = {
  radialGradient?: boolean;
  className?: string;
  children?: React.ReactNode;
  opacity?: number; // 0..1
  blurPx?: number; // px
};

const COLORS_TOP = ["#13FFAA", "#1E67C6", "#CE84CF", "#DD335C"];

export default function AuroraBackground({
  radialGradient = true,
  className = "",
  children,
  opacity = 0.35,
  blurPx = 8,
}: Props) {
  const color = useMotionValue(COLORS_TOP[0]);

  React.useEffect(() => {
    const controls = animate(color, COLORS_TOP, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
    return () => controls.stop();
  }, [color]);

  const backgroundImage = useMotionTemplate`
    radial-gradient(125% 125% at 50% 0%, #020617 50%, ${color})
  `;

  return (
    // ⬇️ swap <div> -> <motion.div> and expose --brand
    <motion.div
      style={{ ["--brand" as any]: color }}
      className={["relative min-h-[100svh] text-white", className].join(" ")}
    >
      {/* FIXED gradient (does not scroll) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage,
          opacity,
          filter: `blur(${blurPx}px)`,
          ...(radialGradient
            ? {
                WebkitMaskImage:
                  "radial-gradient(ellipse at 100% 0%, white 12%, transparent 72%)",
                maskImage:
                  "radial-gradient(ellipse at 100% 0%, white 12%, transparent 72%)",
              }
            : {}),
        }}
      />

      {/* FIXED stars, still behind content */}
      <div className="pointer-events-none fixed inset-0 z-10">
        <Canvas
          className="absolute inset-0"
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(0x000000, 0);
            // @ts-expect-error three typings allow null
            scene.background = null;
          }}
        ></Canvas>
      </div>

      {/* SCROLLING content above the fixed background */}
      <div className="relative z-20">{children}</div>
    </motion.div>
  );
}
