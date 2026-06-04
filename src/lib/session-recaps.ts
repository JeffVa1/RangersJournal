import part1Markdown from "../content/session-recaps/part-1.md?raw";
import part2Markdown from "../content/session-recaps/part-2.md?raw";

export interface RecapParagraph {
  text: string;
  redacted?: boolean;
}

export interface RecapSection {
  id: string;
  title: string;
  paragraphs: RecapParagraph[];
}

export interface RecapSession {
  number: number;
  date: string;
  title: string;
  anchor: string;
  summary: string;
  sections: RecapSection[];
}

export interface RecapArc {
  slug: string;
  href: string;
  title: string;
  shortTitle: string;
  volumeLabel: string;
  description: string;
  sourceFile: string;
  bookId: string;
  journalHref: string;
  cover: string;
  background: string;
  color: string;
  sessions: RecapSession[];
  sessionRange: string;
}

interface RecapArcSource {
  slug: string;
  title: string;
  shortTitle: string;
  volumeLabel: string;
  description: string;
  sourceFile: string;
  bookId: string;
  cover: string;
  background: string;
  color: string;
  markdown: string;
}

interface DraftSection {
  title: string;
  lines: string[];
}

interface ParsedSectionDraft {
  title: string;
  paragraphs: RecapParagraph[];
}

interface DraftSession {
  number: number;
  date: string;
  title: string;
}

const arcSources: RecapArcSource[] = [
  {
    slug: "part-1",
    title: "The Lost Scroll",
    shortTitle: "Part I",
    volumeLabel: "Vol I",
    description:
      "The first road from Drakensport into the hidden legacy of Irillis.",
    sourceFile: "src/content/session-recaps/part-1.md",
    bookId: "book1",
    cover: "/assets/books/book1/book_assets/cover.png",
    background: "/assets/books/book1/background.png",
    color: "#d60000",
    markdown: part1Markdown
  },
  {
    slug: "part-2",
    title: "The Pit",
    shortTitle: "Part II",
    volumeLabel: "Vol II",
    description:
      "The road into Ironwell, the depths of the Pit, and the first foothold of a wider rebellion.",
    sourceFile: "src/content/session-recaps/part-2.md",
    bookId: "book2",
    cover: "/assets/books/book2/book_assets/cover.png",
    background: "/assets/books/book2/background.png",
    color: "#9900d1",
    markdown: part2Markdown
  }
];

interface RedactionRange {
  sourceFile: string;
  startLine: number;
  endLine: number;
  label: string;
}

const redactionNotice = (label: string) =>
  `[Redacted for player-facing publication: ${label}.]`;

const selectedRedactions: RedactionRange[] = [
  {
    sourceFile: "src/content/session-recaps/part-1.md",
    startLine: 41,
    endLine: 47,
    label: "private character vision"
  },
  {
    sourceFile: "src/content/session-recaps/part-2.md",
    startLine: 255,
    endLine: 256,
    label: "Shattered Seraph lore"
  },
  {
    sourceFile: "src/content/session-recaps/part-2.md",
    startLine: 323,
    endLine: 339,
    label: "private Dominion bargain"
  },
  {
    sourceFile: "src/content/session-recaps/part-2.md",
    startLine: 131,
    endLine: 131,
    label: "Nullite lore"
  }
];

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toParagraphs = (lines: string[]) =>
  lines
    .join("\n")
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .replace(/\s*\n\s*/g, " ")
        .trim()
        .replace(/^\*(.+)\*$/u, "$1")
    )
    .filter(Boolean);

const toRecapParagraphs = (lines: string[]): RecapParagraph[] =>
  toParagraphs(lines).map((text) => ({
    text,
    redacted: text.startsWith("[Redacted for player-facing publication:")
  }));

const applyRedactions = (source: RecapArcSource) => {
  const ranges = selectedRedactions.filter(
    (redaction) => redaction.sourceFile === source.sourceFile
  );

  if (ranges.length === 0) {
    return source.markdown;
  }

  const lines = source.markdown.replace(/\r\n?/g, "\n").split("\n");

  ranges.forEach((range) => {
    lines[range.startLine - 1] = redactionNotice(range.label);

    for (let index = range.startLine; index < range.endLine; index += 1) {
      lines[index] = "";
    }
  });

  return lines.join("\n");
};

const getSessionRange = (sessions: RecapSession[]) => {
  const first = sessions[0]?.number;
  const last = sessions[sessions.length - 1]?.number;

  if (!first || !last) {
    return "No sessions";
  }

  return first === last ? `Session ${first}` : `Sessions ${first}-${last}`;
};

const parseArc = (source: RecapArcSource): RecapArc => {
  const lines = applyRedactions(source).replace(/\r\n?/g, "\n").split("\n");
  const sessions: RecapSession[] = [];

  let activeSession: DraftSession | null = null;
  let activeSection: DraftSection | null = null;
  let draftSections: ParsedSectionDraft[] = [];

  const flushSection = () => {
    if (!activeSection) {
      return;
    }

    const paragraphs = toRecapParagraphs(activeSection.lines);
    if (paragraphs.length > 0) {
      draftSections.push({
        title: activeSection.title,
        paragraphs
      });
    }

    activeSection = null;
  };

  const flushSession = () => {
    flushSection();

    if (!activeSession || draftSections.length === 0) {
      activeSession = null;
      draftSections = [];
      return;
    }

    const sections = draftSections.map((section, index) => ({
      id: `session-${activeSession?.number}-${slugify(section.title) || index + 1}`,
      title: section.title,
      paragraphs: section.paragraphs
    }));

    sessions.push({
      ...activeSession,
      anchor: `session-${activeSession.number}`,
      summary: sections[0]?.paragraphs[0]?.text ?? "",
      sections
    });

    activeSession = null;
    draftSections = [];
  };

  lines.forEach((line) => {
    const sessionMatch = line.match(/^##\s+Session\s+(\d+)\s+-\s+(.+)$/);
    if (sessionMatch) {
      flushSession();
      const number = Number.parseInt(sessionMatch[1] ?? "", 10);
      activeSession = {
        number,
        date: sessionMatch[2]?.trim() ?? "",
        title: `Session ${number}`
      };
      return;
    }

    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch && activeSession) {
      flushSection();
      activeSection = {
        title: sectionMatch[1]?.trim() ?? "Recap",
        lines: []
      };
      return;
    }

    if (!activeSession) {
      return;
    }

    if (!activeSection) {
      activeSection = {
        title: "Recap",
        lines: []
      };
    }

    activeSection.lines.push(line);
  });

  flushSession();

  return {
    slug: source.slug,
    href: `/session-recaps/${source.slug}`,
    title: source.title,
    shortTitle: source.shortTitle,
    volumeLabel: source.volumeLabel,
    description: source.description,
    sourceFile: source.sourceFile,
    bookId: source.bookId,
    journalHref: `/library#${source.bookId}/read`,
    cover: source.cover,
    background: source.background,
    color: source.color,
    sessions,
    sessionRange: getSessionRange(sessions)
  };
};

export const recapArcs = arcSources.map(parseArc);

export const getRecapArc = (slug: string | undefined) =>
  recapArcs.find((arc) => arc.slug === slug);
