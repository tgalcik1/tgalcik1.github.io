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
  bio: "Full stack, but with a soft spot for graphics work",
  aboutIntro:
    "I'm a developer interested in the overlap between product engineering, graphics, and systems that feel intentional in use.",
  aboutParagraphs: [
    "Hi, I'm Tristan! I'm a developer based in Baltimore, Maryland. I have a background in full-stack product engineering, but I also have a strong interest in graphics programming, shader development, and just about anything that lets me explore visual ideas with code.",
    "I started learning coding with game development in Unity, and found myself moreso drawn to the graphics and systems side of things than the gameplay scripting. I later went on to work in product engineering roles, but I still find myself drawn back to graphics experiments and visual projects in my free time.",
    "This site is a place for me to share/document what I'm working on in my free time and write about the things I'm learning. Thanks for stopping by!",
  ] as const,
  aboutFacts: [
    { label: "Focus", value: "Product engineering, graphics, interaction" },
    { label: "Stack", value: "Typescript, Python, Unity/Godot, HLSL, C#" },
    {
      label: "Interests",
      value: "Shaders, procedural generation, art, music",
    },
    { label: "Based", value: "Baltimore, MD" },
  ] as const,
  socialLinks: [
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
