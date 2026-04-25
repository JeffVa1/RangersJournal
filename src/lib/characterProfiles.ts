import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";
import type { ImageMetadata } from "astro";

type CharacterProfileEntry = CollectionEntry<"characterProfiles">;
type CharacterProfileData = CharacterProfileEntry["data"];
type ImageModule = { default: ImageMetadata };
type EntryWithValue = {
  name: string;
  value?: string | number;
  proficient?: boolean;
};

const profileImages = import.meta.glob<ImageModule>(
  "../content/character-profiles/**/*.{png,jpg,jpeg,webp,avif,gif}",
  { eager: true }
);

const FALLBACK_PORTRAIT_KEY =
  "../content/character-profiles/example-ranger/portrait.png";

const ABILITY_LABELS = [
  ["strength", "Strength"],
  ["dexterity", "Dexterity"],
  ["constitution", "Constitution"],
  ["intelligence", "Intelligence"],
  ["wisdom", "Wisdom"],
  ["charisma", "Charisma"]
] as const;

const PROFICIENCY_LABELS: Record<string, string> = {
  armor: "Armor",
  weapons: "Weapons",
  tools: "Tools",
  languages: "Languages"
};

const PERSONALITY_LABELS: Record<string, string> = {
  traits: "Personality Traits",
  ideals: "Ideals",
  bonds: "Bonds",
  flaws: "Flaws"
};

export interface CharacterAbility {
  key: string;
  label: string;
  score: string;
  modifier: string;
}

export interface CharacterMetric {
  label: string;
  value: string;
}

export interface CharacterEntryValue {
  name: string;
  value: string;
  proficient: boolean;
}

export interface CharacterAttack {
  name: string;
  bonus?: string;
  damage?: string;
  notes?: string;
}

export interface CharacterSpellcasting {
  ability?: string;
  saveDc?: string;
  attackBonus?: string;
  slots: CharacterMetric[];
  spells: string[];
}

export interface CharacterGroup {
  label: string;
  items: string[];
}

export interface CharacterSpecialEquipment {
  name: string;
  imageSrc?: string;
  description?: string;
}

export interface CharacterProfile {
  slug: string;
  name: string;
  species: string;
  className: string;
  subclass?: string;
  levelLabel: string;
  background?: string;
  alignment?: string;
  age: string;
  summary?: string;
  portraitSrc: string;
  portraitAlt: string;
  abilities: CharacterAbility[];
  combatStats: CharacterMetric[];
  savingThrows: CharacterEntryValue[];
  skills: CharacterEntryValue[];
  passives: CharacterMetric[];
  attacks: CharacterAttack[];
  spellcasting?: CharacterSpellcasting;
  features: string[];
  proficiencies: CharacterGroup[];
  equipment: string[];
  currency: CharacterMetric[];
  specialEquipment: CharacterSpecialEquipment[];
  personality: CharacterGroup[];
  backstory?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const asText = (value: unknown, fallback = "") => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (hasText(value)) {
    return value.trim();
  }

  return fallback;
};

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const signedNumber = (value: string | number | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? `+${value}` : String(value);
  }

  return asText(value, "");
};

const abilityModifier = (score: number) => Math.floor((score - 10) / 2);

const normalizeFileName = (fileName: string) =>
  fileName.trim().replace(/\\/g, "/").replace(/^\.?\//, "");

const resolveImageSrc = (slug: string, fileName?: string) => {
  if (!hasText(fileName)) {
    return undefined;
  }

  const cleanFileName = normalizeFileName(fileName);
  if (/^(https?:)?\/\//.test(cleanFileName) || cleanFileName.startsWith("/")) {
    return cleanFileName;
  }

  const image = profileImages[
    `../content/character-profiles/${slug}/${cleanFileName}`
  ];

  return image?.default?.src;
};

const fallbackPortraitSrc = () =>
  profileImages[FALLBACK_PORTRAIT_KEY]?.default?.src ?? "/favicon.png";

const toStringList = (items: unknown): string[] =>
  Array.isArray(items)
    ? items.map((item) => asText(item)).filter(Boolean)
    : [];

const toEntryValues = (items: EntryWithValue[] | undefined) =>
  Array.isArray(items)
    ? items
        .filter((item) => hasText(item?.name))
        .map((item) => ({
          name: item.name.trim(),
          value: signedNumber(item.value) || "-",
          proficient: Boolean(item.proficient)
        }))
    : [];

const toGroups = (
  record: Record<string, unknown> | undefined,
  labelMap: Record<string, string> = {}
) => {
  if (!isRecord(record)) {
    return [];
  }

  return Object.entries(record)
    .map(([key, value]) => ({
      label: labelMap[key] ?? key.replace(/([A-Z])/g, " $1"),
      items: toStringList(value)
    }))
    .filter((group) => group.items.length > 0);
};

const toMetrics = (
  record: Record<string, unknown> | undefined,
  labelMap: Record<string, string> = {}
) => {
  if (!isRecord(record)) {
    return [];
  }

  return Object.entries(record)
    .map(([key, value]) => ({
      label: labelMap[key] ?? key.replace(/([A-Z])/g, " $1"),
      value: asText(value)
    }))
    .filter((item) => item.value);
};

const toCombatStats = (combat: CharacterProfileData["combat"]) => {
  if (!combat) {
    return [];
  }

  const hitPoints = combat.hitPoints
    ? [asText(combat.hitPoints.current), asText(combat.hitPoints.maximum)]
        .filter(Boolean)
        .join(" / ")
    : "";

  return [
    { label: "Proficiency", value: signedNumber(combat.proficiencyBonus) },
    { label: "Armor Class", value: asText(combat.armorClass) },
    { label: "Initiative", value: signedNumber(combat.initiative) },
    { label: "Speed", value: asText(combat.speed) },
    { label: "Hit Points", value: hitPoints },
    { label: "Hit Dice", value: asText(combat.hitDice) }
  ].filter((item) => item.value);
};

const toAbilities = (abilities: CharacterProfileData["abilities"]) =>
  ABILITY_LABELS.map(([key, label]) => {
    const score = asNumber(abilities?.[key]);

    return {
      key,
      label,
      score: score === undefined ? "-" : String(score),
      modifier: score === undefined ? "-" : signedNumber(abilityModifier(score))
    };
  });

const toSpellcasting = (
  spellcasting: CharacterProfileData["spellcasting"]
): CharacterSpellcasting | undefined => {
  if (!spellcasting) {
    return undefined;
  }

  const slots = Array.isArray(spellcasting.slots)
    ? spellcasting.slots
        .map((slot) => ({
          label: `Level ${asText(slot.level)}`,
          value: asText(slot.total)
        }))
        .filter((slot) => slot.label !== "Level " && slot.value)
    : [];

  const spells = toStringList(spellcasting.spells);
  const normalized = {
    ability: asText(spellcasting.ability),
    saveDc: asText(spellcasting.saveDc),
    attackBonus: signedNumber(spellcasting.attackBonus),
    slots,
    spells
  };

  const hasSpellcasting =
    normalized.ability ||
    normalized.saveDc ||
    normalized.attackBonus ||
    normalized.slots.length > 0 ||
    normalized.spells.length > 0;

  return hasSpellcasting ? normalized : undefined;
};

const toSpecialEquipment = (
  slug: string,
  items: CharacterProfileData["specialEquipment"]
) =>
  Array.isArray(items)
    ? items
        .filter((item) => hasText(item?.name))
        .map((item) => ({
          name: item.name.trim(),
          imageSrc: resolveImageSrc(slug, item.image),
          description: asText(item.description)
        }))
    : [];

const toAttacks = (attacks: CharacterProfileData["attacks"]) =>
  Array.isArray(attacks)
    ? attacks
        .filter((attack) => hasText(attack?.name))
        .map((attack) => ({
          name: attack.name.trim(),
          bonus: signedNumber(attack.bonus),
          damage: asText(attack.damage),
          notes: asText(attack.notes)
        }))
    : [];

const toCurrency = (currency: CharacterProfileData["currency"]) =>
  ["cp", "sp", "ep", "gp", "pp"]
    .map((key) => ({
      label: key.toUpperCase(),
      value: asText(currency?.[key])
    }))
    .filter((coin) => coin.value);

const normalizeCharacter = (entry: CharacterProfileEntry): CharacterProfile => {
  const data = entry.data;
  const slug = entry.id;
  const name = asText(data.name, "Unknown");
  const species = asText(data.species ?? data.race, "Unknown");
  const className = asText(data.className ?? data.class, "Unlisted");
  const levelLabel =
    asText(data.levelLabel) || (data.level ? `Level ${data.level}` : "Unlisted");

  return {
    slug,
    name,
    species,
    className,
    subclass: asText(data.subclass),
    levelLabel,
    background: asText(data.background),
    alignment: asText(data.alignment),
    age: asText(data.age, "Unknown"),
    summary: asText(data.summary),
    portraitSrc: resolveImageSrc(slug, data.portrait) ?? fallbackPortraitSrc(),
    portraitAlt: `${name} character portrait`,
    abilities: toAbilities(data.abilities),
    combatStats: toCombatStats(data.combat),
    savingThrows: toEntryValues(data.savingThrows),
    skills: toEntryValues(data.skills),
    passives: toMetrics(data.passives, {
      perception: "Passive Perception",
      investigation: "Passive Investigation",
      insight: "Passive Insight"
    }),
    attacks: toAttacks(data.attacks),
    spellcasting: toSpellcasting(data.spellcasting),
    features: toStringList(data.features),
    proficiencies: toGroups(data.proficiencies, PROFICIENCY_LABELS),
    equipment: toStringList(data.equipment),
    currency: toCurrency(data.currency),
    specialEquipment: toSpecialEquipment(slug, data.specialEquipment),
    personality: toGroups(data.personality, PERSONALITY_LABELS),
    backstory: asText(data.backstory)
  };
};

export const getCharacterProfiles = async () => {
  const entries = await getCollection("characterProfiles");

  return entries
    .sort((first, second) => {
      const firstOrder = first.data.order ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.data.order ?? Number.MAX_SAFE_INTEGER;

      return (
        firstOrder - secondOrder ||
        asText(first.data.name, first.id).localeCompare(
          asText(second.data.name, second.id)
        )
      );
    })
    .map(normalizeCharacter);
};
