export const site = {
  name: "Tristan Galcik",
  shortName: "Tristan Galcik",
  role: "Software Developer",
  email: "hello@tristangalcik.com",
  location: "United States",
  intro:
    "I build products with solid systems underneath and visual ideas that feel considered instead of ornamental.",
  heroLineA: "Building",
  heroEmphasis: "creative",
  heroLineB: "things",
  avatarPath: "/images/avatar.jpg",
  aboutImagePath: "/images/about.jpg",
  bio: "Developer working across product engineering, graphics, and interactive experiments. I like shipping useful things that still have a point of view.",
  aboutIntro:
    "I'm a developer interested in the overlap between product engineering, graphics, and systems that feel intentional in use.",
  aboutParagraphs: [
    "A lot of the work I like sits between disciplines. I care about shipping useful software, but I also care about how it feels to move through, how clearly it communicates itself, and whether the visual decisions actually support the system underneath.",
    "That usually means I end up working across product thinking, frontend implementation, realtime interaction, and visual experiments. Sometimes that turns into full-stack product work. Sometimes it becomes a shader study, a generative tool, or a technical write-up to understand something more deeply.",
    "This site is meant to hold both sides of that work: the practical engineering side and the more exploratory graphics side. They are not really separate tracks for me.",
  ] as const,
  aboutFacts: [
    { label: "Focus", value: "Product engineering, graphics, interaction" },
    { label: "Stack", value: "TypeScript, React, Astro, WebGL" },
    {
      label: "Interests",
      value: "Shaders, design systems, tooling, live demos",
    },
    { label: "Based", value: "United States" },
  ] as const,
  socialLinks: [
    { label: "GitHub", href: "https://github.com/tgalcik1" },
    { label: "LinkedIn", href: "https://www.linkedin.com" },
    { label: "Email", href: "mailto:hello@tristangalcik.com" },
  ] as const,
};

export const featuredProjects = [
  {
    id: "01",
    title: "Noise Field Lab",
    date: "2024 - 2025",
    category: "Shader",
    stack: "WebGL · GLSL · React",
    description:
      "A live playground for layered noise, palette tuning, and motion studies used to prototype visual identities.",
    accent: "warm",
    preview: { type: "shader", label: "Live shader study" },
  },
  {
    id: "02",
    title: "Realtime Canvas",
    date: "01/2024 - 06/2024",
    category: "Full-stack",
    stack: "Astro · Node · WebSocket",
    description:
      "Collaborative drawing and annotation built around low-latency updates, resilient sessions, and clean interaction design.",
    accent: "sage",
    preview: { type: "ui", label: "Realtime canvas UI" },
  },
  {
    id: "03",
    title: "Generative Letterforms",
    date: "09/2023",
    category: "Creative",
    stack: "Canvas · Geometry · Tooling",
    description:
      "A type experiment where mathematical fields distort characters into expressive, repeatable compositions.",
    accent: "plum",
    preview: { type: "typography", label: "Generative type study" },
  },
  {
    id: "04",
    title: "Shader Notes",
    date: "2025",
    category: "Writing",
    stack: "MDX · Live Demos · Astro",
    description:
      "A blog workflow for technical writing with interactive shader embeds and room for code-heavy breakdowns.",
    accent: "teal",
    preview: { type: "editorial", label: "Article layout preview" },
  },
] as const;
