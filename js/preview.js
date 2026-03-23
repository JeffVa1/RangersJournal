const previewTitleEl = document.getElementById("preview-book-title");
const previewLinkEl = document.getElementById("preview-book-link");
const previewCoverEl = document.getElementById("preview-book-cover");
const previewSummaryEl = document.getElementById("preview-summary-content");

const placeholderSummary = [
  "A full story summary will live here soon. For now, this preview page gives readers a moment to pause before opening the book itself, with room for a richer synopsis, themes, and reading notes.",
  "This area is intentionally long enough to test scrolling behavior, panel spacing, and readability over the translucent treatment. Once your real summaries are ready, this block can be replaced with book-specific text without changing the layout.",
  "Use this section later for teaser copy, setting context, content warnings, character notes, or links into companion material. Clicking the cover on the left should remain the direct path into the reading experience."
];

const getBookId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("book");
};

const renderSummary = (book) => {
  const summary = Array.isArray(book.summary) && book.summary.length
    ? book.summary
    : placeholderSummary;

  previewSummaryEl.innerHTML = "";
  summary.forEach((paragraph) => {
    const text = document.createElement("p");
    text.textContent = paragraph;
    previewSummaryEl.appendChild(text);
  });
};

const showPreview = (book) => {
  const viewerHref = `viewer.html?book=${encodeURIComponent(book.id)}`;
  document.title = `${book.title} Preview`;
  previewTitleEl.textContent = book.title;
  previewLinkEl.href = viewerHref;
  previewCoverEl.src = book.cover;
  previewCoverEl.alt = `${book.title} cover`;
  renderSummary(book);
};

const showError = (message) => {
  previewTitleEl.textContent = message;
  previewLinkEl.setAttribute("aria-disabled", "true");
  previewLinkEl.removeAttribute("href");
  previewCoverEl.removeAttribute("src");
  previewCoverEl.alt = "";
  previewSummaryEl.innerHTML = "";
  const text = document.createElement("p");
  text.textContent = "The selected book preview is unavailable right now.";
  previewSummaryEl.appendChild(text);
};

const bookId = getBookId();

if (!bookId) {
  showError("Book not found");
} else {
  fetch("data/books.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load library");
      }

      return response.json();
    })
    .then((books) => {
      const book = Array.isArray(books)
        ? books.find((item) => item.id === bookId)
        : null;

      if (!book) {
        throw new Error("Book not found");
      }

      showPreview(book);
    })
    .catch(() => {
      showError("Book unavailable");
    });
}
