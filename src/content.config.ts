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

export const collections = {
  "character-profiles": characterProfiles
};
