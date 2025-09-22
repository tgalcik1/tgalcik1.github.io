import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Props = {
  items: string[];
  /** ms each label is shown */
  intervalMs?: number;
  className?: string;
};

export default function RotatingBadge({
  items,
  intervalMs = 2200,
  className = "",
}: Props) {
  const [idx, setIdx] = React.useState(0);
  const [w, setW] = React.useState<number | undefined>(undefined);
  const measRef = React.useRef<HTMLSpanElement | null>(null);
  const prefersReduced = useReducedMotion();

  // advance the label
  React.useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(
      () => setIdx((i) => (i + 1) % items.length),
      intervalMs
    );
    return () => clearInterval(id);
  }, [items, intervalMs]);

  // measure current label width and animate container to it
  const measure = React.useCallback(() => {
    if (!measRef.current) return;
    const rect = measRef.current.getBoundingClientRect();
    setW(rect.width);
  }, []);
  React.useEffect(() => {
    // measure on mount and whenever text changes
    requestAnimationFrame(measure);
    // also re-measure on resize
    const ro = new ResizeObserver(measure);
    if (measRef.current) ro.observe(measRef.current);
    return () => ro.disconnect();
  }, [idx, measure]);

  const variants = {
    enter: { opacity: 0, filter: "blur(8px)", y: 6 },
    center: { opacity: 1, filter: "blur(0px)", y: 0 },
    exit: { opacity: 0, filter: "blur(8px)", y: -6 },
  } as const;

  return (
    <span
      className={`inline-block rounded-full bg-gray-600/50 px-3 py-1.5 text-sm backdrop-blur-md ${className}`}
    >
      {/* Width-animating rail */}
      <motion.span
        className="relative inline-flex justify-center"
        style={{ width: w }} // smoothly animates to measured width
        animate={{ width: w }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Stacked labels (overlap) — prevents blank gap */}
        <AnimatePresence initial={false}>
          <motion.span
            key={idx}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
            variants={prefersReduced ? undefined : variants}
            initial={prefersReduced ? undefined : "enter"}
            animate={prefersReduced ? undefined : "center"}
            exit={prefersReduced ? undefined : "exit"}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "opacity, filter, transform" }}
          >
            {items[idx]}
          </motion.span>
        </AnimatePresence>

        {/* Hidden measurer for current text width */}
        <span ref={measRef} aria-hidden className="invisible whitespace-nowrap">
          {items[idx]}
        </span>
      </motion.span>
    </span>
  );
}
