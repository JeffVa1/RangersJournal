import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const characterProfiles = defineCollection({
  type: "data",
  schema: z
    .object({
      order: z.number().optional(),
      name: z.string()
    })
    .passthrough()
});

const sessionRecaps = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/session-recaps" }),
  schema: z.object({}).passthrough()
});

export const collections = {
  "character-profiles": characterProfiles,
  "session-recaps": sessionRecaps
};
