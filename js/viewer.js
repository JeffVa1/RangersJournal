import { getBookId, loadBook, loadManifest } from "./book-data.js";

const titleEl = document.getElementById("book-title");
const indicatorEl = document.getElementById("page-indicator");
const pageContainer = document.getElementById("page-container");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

const state = {
  currentIndex: 0,
  pages: []
};

const clampIndex = (index) =>
  Math.max(0, Math.min(index, state.pages.length - 1));

const updateIndicator = () => {
  indicatorEl.textContent = state.pages.length
    ? `Page ${state.currentIndex + 1} of ${state.pages.length}`
    : "";
};

const createPageImage = (src, alt) => {
  const img = document.createElement("img");
  img.className = "page-image";
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  return img;
};

const createPageFrame = (src, alt) => {
  const frame = document.createElement("div");
  frame.className = "page-frame";
  frame.append(createPageImage(src, alt));
  return frame;
};

const createStatusMessage = (message) => {
  const status = document.createElement("p");
  status.className = "loading page-status";
  status.textContent = message;
  return status;
};

const updateButtons = () => {
  const hasPages = state.pages.length > 0;
  prevButton.disabled = !hasPages || state.currentIndex === 0;
  nextButton.disabled =
    !hasPages || state.currentIndex === state.pages.length - 1;
};

const preloadImage = (index) => {
  if (index < 0 || index >= state.pages.length) {
    return;
  }

  const img = new Image();
  img.src = state.pages[index];
};

const preloadAdjacent = () => {
  if (!state.pages.length) {
    return;
  }

  preloadImage(state.currentIndex - 1);
  preloadImage(state.currentIndex + 1);
};

const renderPage = () => {
  if (!state.pages.length) {
    pageContainer.replaceChildren(
      createStatusMessage("No pages are available for this book yet.")
    );
    updateIndicator();
    updateButtons();
    return;
  }

  const src = state.pages[state.currentIndex];
  const alt = `${titleEl.textContent} page ${state.currentIndex + 1}`;
  pageContainer.replaceChildren(createPageFrame(src, alt));
  updateIndicator();
  updateButtons();
  preloadAdjacent();
};

const navigateTo = (nextIndex) => {
  if (!state.pages.length) {
    return;
  }

  const clampedIndex = clampIndex(nextIndex);
  if (clampedIndex === state.currentIndex) {
    return;
  }

  state.currentIndex = clampedIndex;
  renderPage();
};

const handleKey = (event) => {
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }

  if (event.key === "ArrowRight") {
    navigateTo(state.currentIndex + 1);
  } else if (event.key === "ArrowLeft") {
    navigateTo(state.currentIndex - 1);
  }
};

const showError = (title, message) => {
  document.title = title;
  titleEl.textContent = title;
  state.pages = [];
  state.currentIndex = 0;
  pageContainer.replaceChildren(createStatusMessage(message));
  updateIndicator();
  updateButtons();
};

const init = async () => {
  const bookId = getBookId();
  if (!bookId) {
    showError("Book not found", "Choose a book from the library to start reading.");
    return;
  }

  try {
    const book = await loadBook(bookId);
    const manifest = await loadManifest(book.manifest);
    document.title = manifest.title;
    titleEl.textContent = manifest.title;
    state.pages = manifest.pages;
    state.currentIndex = 0;
    renderPage();
  } catch {
    showError("Book unavailable", "The selected book could not be loaded.");
  }
};

prevButton.addEventListener("click", () => navigateTo(state.currentIndex - 1));
nextButton.addEventListener("click", () => navigateTo(state.currentIndex + 1));
window.addEventListener("keydown", handleKey);

init();
