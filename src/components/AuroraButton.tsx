// src/components/AuroraButton.tsx
import React, { useEffect } from "react";
import {
  motion,
  animate,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";

const DEFAULT_COLORS = ["#13FFAA", "#1E67C6", "#CE84CF", "#DD335C"] as const;

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  className?: string;
  /** Color cycle for a standalone button (only used if useSharedBrand=false) */
  colors?: readonly string[];
  /** sm | md | lg padding presets */
  size?: "sm" | "md" | "lg";
  /** Optional trailing icon (e.g., <FiArrowRight/>) */
  icon?: React.ReactNode;
  /** Make the button take the full available width */
  fullWidth?: boolean;
  /** Use the shared brand color from CSS var --brand (default: true) */
  useSharedBrand?: boolean;
  /** Multiplier for outer glow blur radius (0 = none, 1 = default 24px) */
  outerGlow?: number;
};

export default function AuroraButton({
  children,
  href,
  onClick,
  className = "",
  colors = DEFAULT_COLORS,
  size = "md",
  icon,
  fullWidth = false,
  useSharedBrand = true,
  outerGlow = 1, // NEW
}: Props) {
  // clamp to avoid negatives/NaN
  const glowMult = Number.isFinite(outerGlow) ? Math.max(0, outerGlow) : 1;
  const glowPx = 24 * glowMult; // base blur radius = 24px

  // Path A: use shared brand color from AuroraBackground (keeps everything in sync)
  if (useSharedBrand) {
    const brandVar = "var(--brand, #13FFAA)"; // fallback before hydration

    const padding =
      size === "sm"
        ? "px-3 py-1.5 text-sm"
        : size === "lg"
        ? "px-6 py-3 text-base"
        : "px-4 py-2 text-sm";

    const base = `group inline-flex items-center gap-1.5 rounded-full
      bg-white/5 backdrop-blur-lg
      text-gray-50 hover:bg-gray-950/50
      transition-colors ${padding} ${
      fullWidth ? "w-full justify-center" : "w-fit"
    } ${className}`;

    const style: React.CSSProperties = {
      border: `1px solid ${brandVar}`,
      boxShadow: glowPx > 0 ? `0px 4px ${glowPx}px ${brandVar}` : "none",
    };

    const content = (
      <>
        <span>{children}</span>
        {icon ? (
          <span className="transition-transform group-hover:-rotate-45 group-active:-rotate-12">
            {icon}
          </span>
        ) : null}
      </>
    );

    return href ? (
      <motion.a
        href={href}
        style={style}
        className={base}
        onClick={onClick}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
      >
        {content}
      </motion.a>
    ) : (
      <motion.button
        type="button"
        style={style}
        className={base}
        onClick={onClick}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
      >
        {content}
      </motion.button>
    );
  }

  // Path B: animate locally if not using shared brand
  const color = useMotionValue(colors[0]);
  useEffect(() => {
    const controls = animate(color, colors as string[], {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
    return () => controls.stop();
  }, [color, colors]);

  const border = useMotionTemplate`1px solid ${color}`;
  const boxShadow =
    glowPx > 0 ? useMotionTemplate`0px 4px ${glowPx}px ${color}` : undefined;

  const padding =
    size === "sm"
      ? "px-3 py-1.5 text-sm"
      : size === "lg"
      ? "px-6 py-3 text-base"
      : "px-4 py-2 text-sm";

  const base = `group inline-flex items-center gap-1.5 rounded-full
    bg-white/5 backdrop-blur-lg
    text-gray-50 hover:bg-gray-950/50
    transition-colors ${padding} ${
    fullWidth ? "w-full justify-center" : "w-fit"
  } ${className}`;

  const commonProps = {
    style: { border, boxShadow },
    className: base,
    onClick,
    whileHover: { scale: 1.015 },
    whileTap: { scale: 0.985 },
  } as const;

  return href ? (
    <motion.a href={href} {...commonProps}>
      <span>{children}</span>
      {icon ? (
        <span className="transition-transform group-hover:-rotate-45 group-active:-rotate-12">
          {icon}
        </span>
      ) : null}
    </motion.a>
  ) : (
    <motion.button type="button" {...commonProps}>
      <span>{children}</span>
      {icon ? (
        <span className="transition-transform group-hover:-rotate-45 group-active:-rotate-12">
          {icon}
        </span>
      ) : null}
    </motion.button>
  );
}
