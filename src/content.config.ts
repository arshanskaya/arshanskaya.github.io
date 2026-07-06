import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string(),
    description: z.string().default(""),
    categories: z.array(z.string()).default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string(),
    description: z.string().default(""),
  }),
});

// Curated artworks for the medium index pages (design refresh). Edited by
// hand in src/data/works.json; entries without an image render as the
// design's striped placeholder slots.
const works = defineCollection({
  loader: file("src/data/works.json"),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      medium: z.string(),
      widthCm: z.number().optional(),
      heightCm: z.number().optional(),
      dimsNote: z.string().optional(),
      year: z.number().optional(),
      series: z.string().optional(),
      image: image().optional(),
      alt: z.string().default(""),
      order: z.number(),
    }),
});

export const collections = { posts, pages, works };
