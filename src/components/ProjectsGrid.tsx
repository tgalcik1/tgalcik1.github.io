// src/components/ProjectsGrid.tsx
import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import AuroraButton from "./AuroraButton";
import { FiArrowRight } from "react-icons/fi";

/* ============================================================================
   Types
============================================================================ */
export type Project = {
  id: string;
  title: string;
  date: string;
  href?: string; // optional now, so we can hide the action entirely
  mediaType: "image" | "video";
  src: string;
  category:
    | "Graphics/Engines"
    | "Shaders"
    | "Fullstack / Frontend"
    | "Creative Apps";
  featured?: boolean; // only used for Graphics/Engines main project

  /** Optional CTA customization */
  ctaLabel?: string; // e.g., "Read", "Play", "View", "Open", etc.
  hideCta?: boolean; // set true to remove the button entirely
};

type Props = { projects: Project[] };

/* ============================================================================
   Animation
============================================================================ */
const container = {
  off: {},
  on: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const cardIn = {
  off: { opacity: 0, y: 24, scale: 0.98 },
  on: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] },
  },
};

/* ---------- configurable “scroll off top” FX with center safe-zone ---------- */
type FxOpts = {
  offsetStart?: string; // default "start 85%"
  offsetEnd?: string; // default "end 15%"
  safeStart?: number; // fraction where effect=0 starts (default 0.00)
  safeEnd?: number; // fraction where effect still 0 (default 0.60)
  rampEnd?: number; // fraction where effect hits 100% (default 1.00)
  maxBlur?: number; // px
  maxTilt?: number; // deg
  maxZ?: number; // px (negative = away)
  maxLift?: number; // px
  minOpacity?: number; // don’t fade past this (default 0.75)
};

function useScrollFX(
  ref: React.RefObject<HTMLElement>,
  {
    offsetStart = "start 85%",
    offsetEnd = "end 15%",
    safeStart = 0.0,
    safeEnd = 0.6,
    rampEnd = 1.0,
    maxBlur = 6,
    maxTilt = 0,
    maxZ = -80,
    maxLift = -8,
    minOpacity = 0.75,
  }: FxOpts = {}
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [offsetStart, offsetEnd],
  });

  // piecewise: 0..safeEnd stays 0, then ramps to 1 by rampEnd
  const ramp = useTransform(
    scrollYProgress,
    [safeStart, safeEnd, rampEnd],
    [0, 0, 1]
  );

  const opacity = useTransform(ramp, [0, 1], [1, minOpacity]);
  const blurPx = useTransform(ramp, [0, 1], [0, maxBlur]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  const rotateX = useTransform(ramp, [0, 1], [0, maxTilt]);
  const transZ = useTransform(ramp, [0, 1], [0, maxZ]);
  const transY = useTransform(ramp, [0, 1], [0, maxLift]);
  const transform3d = useMotionTemplate`
    translateY(${transY}px) translateZ(${transZ}px) rotateX(${rotateX}deg)
  `;

  return { opacity, filter, transform3d };
}

/* ---------- Title: LATE trigger + bigger safe-zone (stays crisp near center) ---------- */
function TitleFX({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLHeadingElement | null>(null);

  const { opacity, filter, transform3d } = useScrollFX(ref, {
    // Only start measuring as the title approaches the top
    offsetStart: "start 75%", // when title top hits 75% viewport height
    offsetEnd: "start -5%", // when title top reaches 5% from top
    // Keep it untouched through most of the range
    safeEnd: 0.85, // 0..0.85 => no fade/blur
    rampEnd: 1.0, // ramp only in the last 15%
    // Very mild when it finally ramps
    maxBlur: 4,
    maxTilt: 2,
    maxZ: -60,
    maxLift: -6,
    minOpacity: 0.9, // don’t fade past 90% for the heading
  });

  return (
    <motion.h2
      ref={ref}
      className="text-2xl md:text-3xl font-semibold text-center"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.8 }}
      transition={{ duration: 0.45 }}
      style={{
        opacity,
        filter,
        transform: transform3d,
        transformStyle: "preserve-3d",
        willChange: "opacity, filter, transform",
      }}
    >
      {children}
    </motion.h2>
  );
}

/* ---------- Section paragraph (fades in gently) ---------- */
function SectionParagraph({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      className="mx-auto mt-2 max-w-2xl text-center text-sm text-white/80 md:text-base"
      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: false, amount: 0.8 }}
      transition={{ duration: 0.45, delay: 0.05 }}
    >
      {children}
    </motion.p>
  );
}

/* ---------- Cards: keep the gentler defaults ---------- */
function CardFX({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const { opacity, filter, transform3d } = useScrollFX(ref, {
    offsetStart: "start 85%",
    offsetEnd: "end 15%",
    safeEnd: 0.7,
    rampEnd: 1.0,
    maxBlur: 6,
    maxTilt: 3,
    maxZ: -80,
    maxLift: -8,
    minOpacity: 0.8,
  });

  return (
    <motion.div
      ref={ref}
      style={{
        opacity,
        filter,
        transform: transform3d,
        transformStyle: "preserve-3d",
        willChange: "opacity, filter, transform",
      }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Project card (supports big variant for featured + configurable CTA) ---------- */
function ProjectCard(p: Project & { big?: boolean }) {
  const mediaClass = p.big
    ? "h-[32rem] w-full object-cover"
    : "h-64 w-full object-cover";

  const showCta = !!p.href && !p.hideCta;
  const ctaText = p.ctaLabel ?? "View";

  return (
    <motion.article
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
      variants={cardIn}
      whileHover={{ y: -2 }}
    >
      {p.mediaType === "image" ? (
        <img
          src={p.src}
          alt={p.title}
          className={`${mediaClass} transition duration-500 group-hover:scale-[1.03]`}
          loading="lazy"
        />
      ) : (
        <video
          src={p.src}
          className={`${mediaClass} transition duration-500 group-hover:scale-[1.03]`}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* Top-right: Action button (AuroraButton) — configurable label & visibility */}
      {showCta && (
        <div className="absolute right-3 top-3 z-10">
          <AuroraButton
            href={p.href!}
            size="sm"
            icon={<FiArrowRight />}
            outerGlow={0}
            className="!px-3 !py-1.5"
          >
            {ctaText}
          </AuroraButton>
        </div>
      )}

      {/* Bottom meta row */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-3">
        <h3 className="text-white text-sm drop-shadow">{p.title}</h3>
        <time className="font-geistmono text-white/85 text-[10px] tracking-tight">
          {p.date}
        </time>
      </div>
    </motion.article>
  );
}

/* ============================================================================
   Grouping + Rendering
============================================================================ */
const ORDER: Project["category"][] = [
  "Graphics/Engines",
  "Shaders",
  "Fullstack / Frontend",
  "Creative Apps",
];

const DESCRIPTIONS: Record<Project["category"], string> = {
  "Graphics/Engines":
    "Low-level rendering work, real-time techniques, and engine-style tooling. This section highlights the 3D Pixel Art Engine as a flagship with related explorations beneath it.",
  Shaders:
    "Focused shader studies exploring form, light, and motion — from raymarching to stylized post-processing and material effects.",
  "Fullstack / Frontend":
    "End-to-end product development: UI systems, component libraries, data models, and backend integrations for production applications.",
  "Creative Apps":
    "Playable or interactive projects where code and design meet — small apps and toys that showcase craft and personality.",
};

function groupByCategory(items: Project[]) {
  const map = new Map<Project["category"], Project[]>();
  for (const p of items) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category)!.push(p);
  }
  return ORDER.filter((cat) => map.has(cat)).map((cat) => ({
    category: cat,
    items: map.get(cat)!,
  }));
}

/* ============================================================================
   Component
============================================================================ */
export default function ProjectsGrid({ projects }: Props) {
  const sections = groupByCategory(projects);

  return (
    <section id="work" className="py-24">
      <div className="max-w-7xl mx-auto px-4 space-y-14">
        {sections.map(({ category, items }) => {
          const isGraphics = category === "Graphics/Engines";
          const featured = isGraphics
            ? items.find((i) => i.featured)
            : undefined;
          const rest = featured
            ? items.filter((i) => i.id !== featured.id)
            : items;

          // If a card is by itself on the LAST row, make it full width at sm+.
          const lastSpansFull = rest.length > 1 && rest.length % 2 === 1;

          return (
            <div key={category}>
              {/* Clear header + paragraph */}
              <TitleFX>{category}</TitleFX>
              <SectionParagraph>{DESCRIPTIONS[category]}</SectionParagraph>

              {/* Featured big card for Graphics/Engines */}
              {featured && (
                <div className="mt-8">
                  <CardFX>
                    <ProjectCard {...featured} big />
                  </CardFX>
                </div>
              )}

              {/* Grid of remaining items */}
              {rest.length > 0 && (
                <motion.div
                  className={`mt-6 grid gap-6 ${
                    rest.length === 1
                      ? "grid-cols-1"
                      : "grid-cols-1 sm:grid-cols-2"
                  }`}
                  variants={container}
                  initial="off"
                  whileInView="on"
                  viewport={{ once: false, amount: 0.3 }}
                >
                  {rest.map((p, idx) => {
                    const isLast = idx === rest.length - 1;
                    const span = lastSpansFull && isLast ? "sm:col-span-2" : "";
                    return (
                      <div key={p.id} className={span}>
                        <CardFX>
                          <ProjectCard {...p} />
                        </CardFX>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
