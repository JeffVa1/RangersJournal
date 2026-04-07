import { getBookId, loadBook, loadManifest } from "./book-data.js";
import { initMobileExperience } from "./mobile-experience.js";

const indicatorEl = document.getElementById("page-indicator");
const pageContainer = document.getElementById("page-container");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const modeToggleButton = document.getElementById("mode-toggle");
const viewerContent = document.getElementById("viewer-content");

const state = {
  currentIndex: 0,
  pages: [],
  title: "Book Viewer",
  isMapMode: false
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
  prevButton.disabled =
    state.isMapMode || !hasPages || state.currentIndex === 0;
  nextButton.disabled =
    state.isMapMode || !hasPages || state.currentIndex === state.pages.length - 1;
};

const syncModeUi = () => {
  document.body.classList.toggle("viewer-map-mode", state.isMapMode);
  if (state.isMapMode) {
    viewerContent?.setAttribute("aria-hidden", "true");
  } else {
    viewerContent?.removeAttribute("aria-hidden");
  }
  modeToggleButton.textContent = state.isMapMode ? "Book ->" : "Map ->";
  modeToggleButton.setAttribute("aria-pressed", String(state.isMapMode));
  updateButtons();
};

const setMapMode = (isMapMode) => {
  if (state.isMapMode === isMapMode) {
    return;
  }

  state.isMapMode = isMapMode;
  syncModeUi();
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
  const alt = `${state.title} page ${state.currentIndex + 1}`;
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
    state.isMapMode ||
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
  state.title = title;
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
    state.title = manifest.title;
    document.title = manifest.title;
    state.pages = manifest.pages;
    state.currentIndex = 0;
    renderPage();
  } catch {
    showError("Book unavailable", "The selected book could not be loaded.");
  }
};

prevButton.addEventListener("click", () => navigateTo(state.currentIndex - 1));
nextButton.addEventListener("click", () => navigateTo(state.currentIndex + 1));
modeToggleButton.addEventListener("click", () => setMapMode(!state.isMapMode));
window.addEventListener("keydown", handleKey);

initMobileExperience();
syncModeUi();
init();
