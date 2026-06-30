import seraphMarkdown from "../content/world-lore/seraph.md?raw";
import timelineMarkdown from "../content/world-lore/timeline.md?raw";
import worldTodayMarkdown from "../content/world-lore/world-today.md?raw";

export interface LoreLink {
  label: string;
  href: string;
}

export interface LoreTextBlock {
  type: "paragraph" | "list";
  text?: string;
  items?: string[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  era: string;
  summary: string;
  links: LoreLink[];
  blocks: LoreTextBlock[];
}

export interface SeraphNode {
  id: string;
  name: string;
  kind: string;
  syllable: string;
  summary: string;
  color: string;
  image: string;
  blocks: LoreTextBlock[];
}

export interface WorldLoreMeta {
  label: string;
  value: string;
}

export interface WorldLoreItem {
  id: string;
  title: string;
  image: string;
  meta: WorldLoreMeta[];
  blocks: LoreTextBlock[];
}

export interface WorldLoreGroup {
  id: string;
  title: string;
  summary: string;
  blocks: LoreTextBlock[];
  items: WorldLoreItem[];
}

interface HeadingSection {
  title: string;
  lines: string[];
}

interface Attribute {
  label: string;
  value: string;
}

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]+/g, "");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripComments = (markdown: string) =>
  markdown.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n?/g, "\n");

const trimBlankLines = (lines: string[]) => {
  const nextLines = [...lines];

  while (nextLines[0]?.trim() === "") {
    nextLines.shift();
  }

  while (nextLines[nextLines.length - 1]?.trim() === "") {
    nextLines.pop();
  }

  return nextLines;
};

const splitHeadingSections = (lines: string[], level: 2 | 3) => {
  const marker = "#".repeat(level);
  const sections: HeadingSection[] = [];
  let activeSection: HeadingSection | null = null;

  lines.forEach((line) => {
    if (line.startsWith(`${marker} `)) {
      if (activeSection) {
        activeSection.lines = trimBlankLines(activeSection.lines);
        sections.push(activeSection);
      }

      activeSection = {
        title: line.slice(marker.length + 1).trim(),
        lines: []
      };
      return;
    }

    if (activeSection) {
      activeSection.lines.push(line);
    }
  });

  if (activeSection) {
    activeSection.lines = trimBlankLines(activeSection.lines);
    sections.push(activeSection);
  }

  return sections;
};

const splitIntroAndSections = (markdown: string, level: 2 | 3) => {
  const lines = stripComments(markdown).split("\n");
  const marker = "#".repeat(level);
  const firstSectionIndex = lines.findIndex((line) => line.startsWith(`${marker} `));
  const introLines =
    firstSectionIndex === -1 ? lines : lines.slice(0, Math.max(firstSectionIndex, 0));
  const sectionLines = firstSectionIndex === -1 ? [] : lines.slice(firstSectionIndex);

  return {
    intro: parseTextBlocks(
      trimBlankLines(introLines.filter((line) => !line.startsWith("# ")))
    ),
    sections: splitHeadingSections(sectionLines, level)
  };
};

const parseAttributes = (lines: string[]) => {
  const attrs: Record<string, Attribute> = {};
  const body: string[] = [];
  let readingAttributes = true;
  let sawAttribute = false;

  lines.forEach((line) => {
    if (readingAttributes) {
      if (line.trim() === "") {
        if (sawAttribute) {
          readingAttributes = false;
        }

        return;
      }

      const match = line.match(/^([A-Za-z][A-Za-z0-9 /&'-]*):\s*(.*)$/);
      if (match) {
        const label = match[1]?.trim() ?? "";
        attrs[normalizeKey(label)] = {
          label,
          value: match[2]?.trim() ?? ""
        };
        sawAttribute = true;
        return;
      }

      readingAttributes = false;
    }

    body.push(line);
  });

  return {
    attrs,
    body: trimBlankLines(body)
  };
};

const getAttr = (attrs: Record<string, Attribute>, key: string) =>
  attrs[normalizeKey(key)]?.value ?? "";

const encodeImagePath = (value: string) => (value ? encodeURI(value) : "");

const parseLinks = (value: string): LoreLink[] =>
  Array.from(value.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)).map((match) => ({
    label: match[1] ?? "",
    href: match[2] ?? ""
  }));

export function parseTextBlocks(lines: string[]): LoreTextBlock[] {
  const blocks: LoreTextBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraph.join(" ").replace(/\s+/g, " ").trim()
    });
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({
      type: "list",
      items: listItems
    });
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmedLine.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmedLine.slice(2).trim());
      return;
    }

    flushList();
    paragraph.push(trimmedLine);
  });

  flushParagraph();
  flushList();

  return blocks.filter(
    (block) => Boolean(block.text) || Boolean(block.items && block.items.length > 0)
  );
}

const timelineSource = splitIntroAndSections(timelineMarkdown, 2);
const seraphSource = splitIntroAndSections(seraphMarkdown, 2);
const worldTodaySource = splitIntroAndSections(worldTodayMarkdown, 2);

export const timelineIntro = timelineSource.intro;
export const seraphIntro = seraphSource.intro;
export const worldTodayIntro = worldTodaySource.intro;

export const worldLoreHeroArt = encodeURI(
  "/assets/WorldLoreArt/The Lost Scrolls of Irillis.png"
);
export const worldLoreSigilArt = encodeURI(
  "/assets/WorldLoreArt/elandros_sigil_icon_only.png"
);

export const timelineEvents: TimelineEvent[] = timelineSource.sections.map(
  (section) => {
    const { attrs, body } = parseAttributes(section.lines);

    return {
      id: slugify(section.title),
      title: section.title,
      era: getAttr(attrs, "Era"),
      summary: getAttr(attrs, "Summary"),
      links: parseLinks(getAttr(attrs, "Links")),
      blocks: parseTextBlocks(body)
    };
  }
);

export const seraphNodes: SeraphNode[] = seraphSource.sections.map((section) => {
  const { attrs, body } = parseAttributes(section.lines);

  return {
    id: slugify(section.title),
    name: section.title,
    kind: getAttr(attrs, "Kind"),
    syllable: getAttr(attrs, "Syllable"),
    summary: getAttr(attrs, "Summary"),
    color: getAttr(attrs, "Color") || "#f2c14e",
    image: encodeImagePath(getAttr(attrs, "Image")),
    blocks: parseTextBlocks(body)
  };
});

export const worldTodayGroups: WorldLoreGroup[] = worldTodaySource.sections.map(
  (section) => {
    const childSections = splitHeadingSections(section.lines, 3);
    const firstChildIndex = section.lines.findIndex((line) => line.startsWith("### "));
    const groupLines =
      firstChildIndex === -1 ? section.lines : section.lines.slice(0, firstChildIndex);
    const { attrs, body } = parseAttributes(groupLines);

    return {
      id: slugify(section.title),
      title: section.title,
      summary: getAttr(attrs, "Summary"),
      blocks: parseTextBlocks(body),
      items: childSections.map((childSection) => {
        const parsedChild = parseAttributes(childSection.lines);
        const image = encodeImagePath(getAttr(parsedChild.attrs, "Image"));
        const meta = Object.entries(parsedChild.attrs)
          .filter(([key, attr]) => key !== "image" && attr.value)
          .map(([, attr]) => ({
            label: attr.label,
            value: attr.value
          }));

        return {
          id: slugify(childSection.title),
          title: childSection.title,
          image,
          meta,
          blocks: parseTextBlocks(parsedChild.body)
        };
      })
    };
  }
);
