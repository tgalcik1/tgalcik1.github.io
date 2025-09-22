// src/components/SkillsSection.tsx
import * as React from "react";
import { motion } from "framer-motion";

/** Primary slug per display name (first try) */
const ICON_SLUG: Record<string, string> = {
  AWS: "amazonaws",
  HTML: "html5",
  CSS: "css3",
  JavaScript: "javascript",
  TypeScript: "typescript",
  Node: "nodedotjs",
  ExpressJS: "express",
  Vue: "vuedotjs",
  React: "react",
  Nuxt: "nuxtdotjs",
  NextJS: "nextdotjs",
  Tailwind: "tailwindcss",
  Unity: "unity",
  "Unreal Engine": "unrealengine",
  OpenGL: "opengl",
  Docker: "docker",
  "C++": "cplusplus",
  "C#": "csharp",
  Python: "python",
  Blender: "blender",
  // AWS services
  DynamoDB: "amazondynamodb",
  Cognito: "amazoncognito",
  Lambda: "awslambda",
  S3: "amazons3",
  EC2: "amazonec2",
  // VCS
  Git: "git",
  GitHub: "github",
};

/** Extra candidates we’ll try if the primary fails to load */
const ICON_FALLBACKS: Record<string, string[]> = {
  Nuxt: ["nuxt", "nuxtdotjs"],
  AWS: ["amazonaws"],
  EC2: ["amazonec2", "amazonaws"],
  S3: ["amazons3", "amazonaws"],
  DynamoDB: ["amazondynamodb", "amazonaws"],
  Cognito: ["amazoncognito", "amazonaws"],
  Lambda: ["awslambda", "amazonaws"],
  CSS: ["css3"],
  "C#": ["csharp"],
};

function candidatesFor(name: string) {
  const primary = ICON_SLUG[name] ?? name.toLowerCase().replace(/\s+/g, "");
  const extras = ICON_FALLBACKS[name] ?? [];
  const seen = new Set<string>();
  return [primary, ...extras].filter((s) =>
    seen.has(s) ? false : (seen.add(s), true)
  );
}

type SkillGroup = { title: string; items: string[] };

const GROUPS: SkillGroup[] = [
  {
    title: "Languages",
    items: ["JavaScript", "TypeScript", "C++", "C#", "Python", "HTML", "CSS"],
  },
  { title: "Frontend", items: ["React", "Vue", "NextJS", "Nuxt", "Tailwind"] },
  { title: "Backend & DevOps", items: ["Node", "ExpressJS", "Docker"] },
  {
    title: "AWS & Cloud",
    items: ["AWS", "EC2", "Lambda", "S3", "DynamoDB", "Cognito"],
  },
  {
    title: "3D, Engines & Shaders",
    items: ["Unity", "Unreal Engine", "OpenGL", "Blender"],
  },
  { title: "Version Control", items: ["Git", "GitHub"] },
];

/* ------------------------------- Perf hints ------------------------------- */
let perfHintsInjected = false;
function injectPerfHints() {
  if (typeof document === "undefined" || perfHintsInjected) return;
  perfHintsInjected = true;
  const links: Array<[string, string, boolean?]> = [
    ["preconnect", "https://cdn.simpleicons.org", true],
    ["dns-prefetch", "https://cdn.simpleicons.org"],
    ["preconnect", "https://cdn.jsdelivr.net", true],
    ["dns-prefetch", "https://cdn.jsdelivr.net"],
    ["preconnect", "https://unpkg.com", true],
    ["dns-prefetch", "https://unpkg.com"],
  ];
  for (const [rel, href, xo] of links) {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    if (xo) link.crossOrigin = "";
    document.head.appendChild(link);
  }
}

/* ------------------------ White icon pipeline (reliable) ------------------------ */
const SRC_CACHE = new Map<string, string>();
const PENDING = new Map<string, Promise<string | null>>();

function whiteCdnUrls(slug: string) {
  return [`https://cdn.simpleicons.org/${slug}/ffffff`];
}
function rawSvgUrls(slug: string) {
  return [
    `https://cdn.jsdelivr.net/npm/simple-icons/icons/${slug}.svg`,
    `https://unpkg.com/simple-icons/icons/${slug}.svg`,
  ];
}

function svgToWhiteDataUrl(svg: string) {
  let s = svg;
  s = s.replace(/<svg(\s+[^>]*)?>/i, (m) =>
    m.includes("fill=") ? m : m.replace(">", ` fill="#fff">`)
  );
  s = s.replace(/fill="[^"]*"/gi, 'fill="#fff"');
  s = s.replace(/stroke="[^"]*"/gi, 'stroke="#fff"');
  const encoded = encodeURIComponent(s);
  return `data:image/svg+xml;utf8,${encoded}`;
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    credentials: "omit",
    mode: "cors",
    cache: "force-cache",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function tryLoadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

async function resolveWhiteIcon(name: string): Promise<string | null> {
  const slugs = candidatesFor(name);

  for (const slug of slugs) {
    for (const url of whiteCdnUrls(slug)) {
      try {
        const ok = await tryLoadImage(url);
        return ok;
      } catch {}
    }
  }
  for (const slug of slugs) {
    for (const url of rawSvgUrls(slug)) {
      try {
        const raw = await fetchText(url);
        if (!raw.trim().startsWith("<svg")) continue;
        const dataUrl = svgToWhiteDataUrl(raw);
        await tryLoadImage(dataUrl);
        return dataUrl;
      } catch {}
    }
  }
  return null;
}

function preloadIconSrc(name: string): Promise<string | null> {
  if (SRC_CACHE.has(name)) return Promise.resolve(SRC_CACHE.get(name)!);
  if (PENDING.has(name)) return PENDING.get(name)!;

  const p = resolveWhiteIcon(name).then((ok) => {
    if (ok) SRC_CACHE.set(name, ok);
    PENDING.delete(name);
    return ok;
  });

  PENDING.set(name, p);
  return p;
}

/** Hook: resolves an icon src (white) and reports status */
function useResolvedIcon(name: string) {
  const [src, setSrc] = React.useState<string | null>(
    SRC_CACHE.get(name) ?? null
  );
  const [status, setStatus] = React.useState<"idle" | "ready" | "error">(
    SRC_CACHE.has(name) ? "ready" : "idle"
  );

  React.useEffect(() => {
    let alive = true;
    setStatus(SRC_CACHE.has(name) ? "ready" : "idle");
    preloadIconSrc(name).then((ok) => {
      if (!alive) return;
      if (ok) {
        setSrc(ok);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    });
    return () => {
      alive = false;
    };
  }, [name]);

  return { src, status };
}

/** Prewarm a list of names ASAP (best-effort) */
function prewarmIcons(names: string[]) {
  names.forEach((n) => void preloadIconSrc(n));
}

/* --------------------------------- UI --------------------------------- */

function placeholderText(name: string) {
  const cleaned = name.replace(/[^A-Za-z#+]/g, "");
  if (cleaned.length <= 2) return cleaned.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

/**
 * LogoTile now uses CSS mask so we can color it and animate to aurora color.
 * Normal state: white; Hover: var(--brand). Also scales on hover.
 */
function LogoTile({ name, eager = false }: { name: string; eager?: boolean }) {
  const { src, status } = useResolvedIcon(name);
  const showImg = status === "ready";

  return (
    <div
      className={[
        "relative grid place-items-center",
        "h-12 w-12 md:h-14 md:w-14",
        // smooth scale on group hover
        "transition-transform duration-200 ease-out",
        "group-hover:scale-110",
      ].join(" ")}
      role="img"
      aria-label={name}
    >
      {!showImg ? (
        <div
          className={[
            "grid h-full w-full place-items-center rounded-md",
            "text-white/80 text-[11px] md:text-xs font-medium select-none",
            "transition-colors duration-200 ease-out",
            "group-hover:text-[var(--brand)]",
          ].join(" ")}
          aria-hidden="true"
        >
          {placeholderText(name)}
        </div>
      ) : (
        // Masked block so we can color via bg and animate it
        <div
          aria-hidden="true"
          // Use the icon as a mask; tint via background-color
          style={{
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
          className={[
            "h-8 w-8 md:h-10 md:w-10",
            "bg-white", // default color
            // animate to aurora color from AuroraBackground (--brand)
            "transition-colors duration-200 ease-out",
            "group-hover:bg-[var(--brand)]",
          ].join(" ")}
        />
      )}

      {/* Preload hint for eager tiles (kept from your original) */}
      {eager && showImg && (
        <link rel="preload" as="image" href={src!} fetchpriority="high" />
      )}
    </div>
  );
}

/** Compute max columns that fit based on actual widths, then avoid widows. */
function chooseColsDynamic(el: HTMLUListElement, n: number) {
  const cs = getComputedStyle(el);
  const gap = parseFloat(cs.columnGap || "40") || 40;

  // We now give each <li> a fixed width, so use that for stable math
  const firstLi = el.querySelector<HTMLElement>("li");
  const tileW = (
    firstLi?.clientWidth && firstLi.clientWidth > 0 ? firstLi.clientWidth : 96
  ) as number; // ~w-24

  const colW = tileW + gap;
  const W = el.clientWidth;
  let cols = Math.max(2, Math.min(n, Math.floor((W + gap) / colW)));

  while (cols > 2 && n % cols === 1) cols--;
  if (cols >= 6 && n >= cols * 2 && n % cols === 2) cols--;

  return cols;
}

/** Grid that centers rows and mathematically avoids orphan rows. */
function SmartCenteredGrid({
  items,
  render,
  className = "",
}: {
  items: string[];
  render: (name: string, index: number) => React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLUListElement | null>(null);
  const [cols, setCols] = React.useState(3);

  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const calc = () => setCols(chooseColsDynamic(el, items.length));
    calc();

    const ro = new ResizeObserver(calc);
    ro.observe(el);

    const onResize = () => calc();
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [items.length]);

  return (
    <ul
      className={[
        // flex rows that wrap; each line is centered
        "flex flex-wrap justify-center",
        // consistent gaps
        "gap-x-10 gap-y-8",
        className,
      ].join(" ")}
    >
      {items.map((n, i) => (
        <li
          key={n}
          className={[
            "group flex flex-col items-center",
            // fixed cell width so rows stay perfectly centered
            "w-24 md:w-28",
            // prevent shrinking so centering math stays stable
            "shrink-0",
          ].join(" ")}
        >
          {render(n, i)}
        </li>
      ))}
    </ul>
  );
}

export default function SkillsSection() {
  React.useEffect(() => {
    injectPerfHints();
  }, []);

  React.useEffect(() => {
    const all = GROUPS.flatMap((g) => g.items);
    prewarmIcons(all);
  }, []);

  return (
    <section id="skills" className="py-24">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h2
          className="text-center text-2xl md:text-3xl font-semibold"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.45 }}
        >
          Skills
        </motion.h2>

        <motion.p
          className="mt-3 mx-auto max-w-3xl text-center text-sm md:text-base text-white/70 leading-relaxed"
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          I design and ship performant web apps and graphics-heavy experiences.
          Frontend: modern frameworks and polish. Backend &amp; cloud:
          reliability and speed to ship. Realtime: shaders, tools, and
          interactive scenes.
        </motion.p>

        <div className="mt-10 space-y-12">
          {GROUPS.map((g, groupIdx) => (
            <motion.div
              key={g.title}
              initial="off"
              whileInView="on"
              viewport={{ once: false, amount: 0.2 }}
              variants={{
                off: {},
                on: { transition: { staggerChildren: 0.05 } },
              }}
            >
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-white/60 text-center">
                {g.title}
              </h3>

              <SmartCenteredGrid
                items={g.items}
                render={(name) => (
                  <motion.div
                    key={name}
                    className="flex flex-col items-center"
                    variants={{
                      off: { opacity: 0, y: 10 },
                      on: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.35 }}
                    aria-label={name}
                  >
                    <LogoTile name={name} eager={groupIdx === 0} />
                    <span className="mt-2 text-xs md:text-sm text-white/80 tracking-tight text-center">
                      {name}
                    </span>
                  </motion.div>
                )}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
