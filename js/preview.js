import { getBookId, loadBook, loadText } from "./book-data.js";

const previewTitleEl = document.getElementById("preview-book-title");
const previewLinkEl = document.getElementById("preview-book-link");
const previewCoverEl = document.getElementById("preview-book-cover");
const previewSummaryEl = document.getElementById("preview-summary-content");

const placeholderSummary = [
  "A full story summary will live here soon. For now, this preview page gives readers a moment to pause before opening the book itself, with room for a richer synopsis, themes, and reading notes.",
  "This area is intentionally long enough to test scrolling behavior, panel spacing, and readability over the translucent treatment. Once your real summaries are ready, this block can be replaced with book-specific text without changing the layout.",
  "Use this section later for teaser copy, setting context, content warnings, character notes, or links into companion material. Clicking the cover on the left should remain the direct path into the reading experience."
];

const getSynopsisPath = (book) => {
  if (typeof book.manifest === "string" && book.manifest.includes("/")) {
    return book.manifest.replace(/[^/]+$/, "synopsis.txt");
  }

  if (typeof book.cover === "string") {
    return book.cover.replace(/\/pages\/[^/]+$/, "/synopsis.txt");
  }

  return `assets/books/${book.id}/synopsis.txt`;
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

const createParagraph = (content) => {
  const paragraph = document.createElement("p");
  paragraph.textContent = content;
  return paragraph;
};

const renderSummary = (paragraphs) => {
  const summary =
    Array.isArray(paragraphs) && paragraphs.length
      ? paragraphs
      : placeholderSummary;

  previewSummaryEl.replaceChildren(...summary.map(createParagraph));
};

const loadSynopsis = async (book) => {
  try {
    const text = await loadText(getSynopsisPath(book), "Unable to load synopsis");
    return parseSynopsis(text);
  } catch {
    return placeholderSummary;
  }
};

const showPreview = async (book) => {
  const viewerHref = `viewer.html?book=${encodeURIComponent(book.id)}`;
  document.title = `${book.title} Preview`;
  previewTitleEl.textContent = book.title;
  previewLinkEl.href = viewerHref;
  previewLinkEl.removeAttribute("aria-disabled");
  previewLinkEl.removeAttribute("tabindex");
  previewCoverEl.src = book.cover;
  previewCoverEl.alt = `${book.title} cover`;
  renderSummary(placeholderSummary);

  renderSummary(await loadSynopsis(book));
};

const showError = (
  title,
  body = "The selected book preview is unavailable right now."
) => {
  document.title = title;
  previewTitleEl.textContent = title;
  previewLinkEl.setAttribute("aria-disabled", "true");
  previewLinkEl.removeAttribute("href");
  previewLinkEl.tabIndex = -1;
  previewCoverEl.removeAttribute("src");
  previewCoverEl.alt = "";
  previewSummaryEl.replaceChildren(createParagraph(body));
};

const init = async () => {
  const bookId = getBookId();
  if (!bookId) {
    showError("Book not found", "Choose a book from the library to see its preview.");
    return;
  }

  try {
    await showPreview(await loadBook(bookId));
  } catch {
    showError("Book unavailable");
  }
};

init();
