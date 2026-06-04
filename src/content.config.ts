import { defineCollection, z } from "astro:content";

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
  type: "content",
  schema: z.object({}).passthrough()
});

export const collections = {
  "character-profiles": characterProfiles,
  "session-recaps": sessionRecaps
};
