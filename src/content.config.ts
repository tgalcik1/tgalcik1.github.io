import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    publishedAt: z.date(),
    readTime: z.string(),
    category: z.string(),
    featured: z.boolean().default(false),
    accent: z.string().default("teal")
  })
});

export const collections = { blog };
