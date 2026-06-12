export const site = {
  name: "Tristan Galcik",
  shortName: "Tristan Galcik",
  role: "Software Developer",
  email: "tristan.galcik@gmail.com",
  location: "United States",
  intro: "Full-stack software engineer based in Baltimore, MD",
  heroLineA: "Building",
  heroEmphasis: "creative",
  heroLineB: "things",
  avatarPath: "/images/avatar.jpg",
  aboutImagePath: "/images/about.jpg",
  bio: "Full stack, but with a soft spot for graphics",
  aboutIntro: "",
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
    // { label: "LinkedIn", href: "https://www.linkedin.com" },
    // { label: "GitHub", href: "https://github.com/tgalcik1" },
    { label: "YouTube", href: "https://www.youtube.com/@tristangamedev" },
    { label: "Email", href: "mailto:hello@tristangalcik.com" },
  ] as const,
};

export const featuredProjects = [] as const;
