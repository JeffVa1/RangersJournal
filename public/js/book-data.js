const BOOKS_PATH = new URL("../data/books.json", import.meta.url);
const SYNOPSIS_PLACEHOLDER = [
  "A full story summary will live here soon. For now, this synopsis gives readers a moment to pause before opening the book itself, with room for richer themes, notes, and story context.",
  "This area is intentionally long enough to preserve the scrolling treatment and panel spacing from the original synopsis page while your real book copy continues to grow."
];

const request = async (resource, parse, errorMessage) => {
  const response = await fetch(resource);
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return parse(response);
};

const toUrl = (pathOrUrl) =>
  pathOrUrl instanceof URL ? pathOrUrl : new URL(pathOrUrl, document.baseURI);

export const getBookId = () =>
  new URLSearchParams(window.location.search).get("book");

export const loadBooks = async () => {
  const books = await request(
    BOOKS_PATH,
    (response) => response.json(),
    "Unable to load library"
  );

  if (!Array.isArray(books)) {
    throw new Error("Invalid library data");
  }

  return books;
};

export const loadBook = async (bookId) => {
  if (!bookId) {
    throw new Error("Book not found");
  }

  const books = await loadBooks();
  const book = books.find((item) => item.id === bookId);
  if (!book) {
    throw new Error("Book not found");
  }

  return book;
};

export const loadManifest = async (manifestPath) => {
  const manifest = await request(
    toUrl(manifestPath),
    (response) => response.json(),
    "Unable to load manifest"
  );

  return {
    title:
      typeof manifest?.title === "string" && manifest.title.trim()
        ? manifest.title
        : "Untitled",
    frame:
      typeof manifest?.frame === "string" && manifest.frame.trim()
        ? manifest.frame
        : "",
    frontCover:
      typeof manifest?.frontCover === "string" && manifest.frontCover.trim()
        ? manifest.frontCover
        : "",
    backCover:
      typeof manifest?.backCover === "string" && manifest.backCover.trim()
        ? manifest.backCover
        : "",
    titlePage:
      typeof manifest?.titlePage === "string" && manifest.titlePage.trim()
        ? manifest.titlePage
        : "",
    endPage:
      typeof manifest?.endPage === "string" && manifest.endPage.trim()
        ? manifest.endPage
        : "",
    pages: Array.isArray(manifest?.pages)
      ? manifest.pages.filter(
          (page) => typeof page === "string" && page.trim().length > 0
        )
      : []
  };
};

export const loadText = (path, errorMessage = "Unable to load text") =>
  request(toUrl(path), (response) => response.text(), errorMessage);

const getSynopsisPath = (book) => {
  if (typeof book?.synopsis === "string" && book.synopsis.trim()) {
    return book.synopsis;
  }

  if (typeof book?.manifest === "string" && book.manifest.includes("/")) {
    return book.manifest.replace(/[^/]+$/, "synopsis.txt");
  }

  if (typeof book?.cover === "string") {
    if (book.cover.includes("/book_assets/")) {
      return book.cover.replace(/\/book_assets\/[^/]+$/, "/synopsis.txt");
    }

    return book.cover.replace(/\/pages\/[^/]+$/, "/synopsis.txt");
  }

  return `assets/books/${book?.id ?? "book"}/synopsis.txt`;
};

const parseSynopsis = (text) => {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs;
  }

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

export const loadSynopsisParagraphs = async (book) => {
  try {
    const text = await loadText(getSynopsisPath(book), "Unable to load synopsis");
    const paragraphs = parseSynopsis(text);
    return paragraphs.length ? paragraphs : SYNOPSIS_PLACEHOLDER;
  } catch {
    return SYNOPSIS_PLACEHOLDER;
  }
};
