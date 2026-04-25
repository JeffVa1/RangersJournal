import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const characterProfiles = defineCollection({
  loader: glob({
    base: "./src/content/character-profiles",
    pattern: "*/profile.json",
    generateId: ({ entry }) => entry.split(/[\\/]/)[0]
  }),
  schema: z
    .object({
      order: z.number().optional(),
      name: z.string().optional(),
      race: z.string().optional(),
      species: z.string().optional(),
      className: z.string().optional(),
      class: z.string().optional(),
      subclass: z.string().optional(),
      level: z.number().optional(),
      levelLabel: z.string().optional(),
      background: z.string().optional(),
      alignment: z.string().optional(),
      age: z.union([z.string(), z.number()]).optional(),
      portrait: z.string().optional(),
      summary: z.string().optional(),
      abilities: z
        .object({
          strength: z.number().optional(),
          dexterity: z.number().optional(),
          constitution: z.number().optional(),
          intelligence: z.number().optional(),
          wisdom: z.number().optional(),
          charisma: z.number().optional()
        })
        .optional(),
      combat: z
        .object({
          proficiencyBonus: z.union([z.string(), z.number()]).optional(),
          armorClass: z.union([z.string(), z.number()]).optional(),
          initiative: z.union([z.string(), z.number()]).optional(),
          speed: z.union([z.string(), z.number()]).optional(),
          hitPoints: z
            .object({
              current: z.union([z.string(), z.number()]).optional(),
              maximum: z.union([z.string(), z.number()]).optional()
            })
            .optional(),
          hitDice: z.union([z.string(), z.number()]).optional()
        })
        .optional(),
      savingThrows: z
        .array(
          z.object({
            name: z.string(),
            value: z.union([z.string(), z.number()]).optional(),
            proficient: z.boolean().optional()
          })
        )
        .optional(),
      skills: z
        .array(
          z.object({
            name: z.string(),
            value: z.union([z.string(), z.number()]).optional(),
            proficient: z.boolean().optional()
          })
        )
        .optional(),
      passives: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      attacks: z
        .array(
          z.object({
            name: z.string(),
            bonus: z.union([z.string(), z.number()]).optional(),
            damage: z.string().optional(),
            notes: z.string().optional()
          })
        )
        .optional(),
      spellcasting: z
        .object({
          ability: z.string().optional(),
          saveDc: z.union([z.string(), z.number()]).optional(),
          attackBonus: z.union([z.string(), z.number()]).optional(),
          slots: z
            .array(
              z.object({
                level: z.union([z.string(), z.number()]),
                total: z.union([z.string(), z.number()])
              })
            )
            .optional(),
          spells: z.array(z.string()).optional()
        })
        .optional(),
      features: z.array(z.string()).optional(),
      proficiencies: z.record(z.string(), z.array(z.string())).optional(),
      equipment: z.array(z.string()).optional(),
      currency: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      specialEquipment: z
        .array(
          z.object({
            name: z.string(),
            image: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional(),
      personality: z.record(z.string(), z.array(z.string())).optional(),
      backstory: z.string().optional()
    })
    .passthrough()
});

export const collections = {
  characterProfiles
};
