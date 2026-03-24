import { loadBooks, loadSynopsisParagraphs } from "./book-data.js";
import { attachMagicalHoverGlow } from "./book-hover-glow.js";

const libraryContainer = document.getElementById("library");
const libraryStage = document.getElementById("library-stage");
const subtitle = document.getElementById("library-subtitle");
const subtitleText = subtitle?.querySelector(".subtitle-text");
const synopsisPanel = document.getElementById("library-synopsis");
const synopsisSurface = document.getElementById("library-synopsis-panel");
const synopsisContent = document.getElementById("library-synopsis-content");
const openBookLink = document.getElementById("library-open-book");
const defaultSubtitle = subtitle?.dataset.default ?? "";

let subtitleTransitionId = 0;
let activeBookCard = null;
let openBookId = null;
let synopsisRequestId = 0;

const bookCards = new Map();
const synopsisCache = new Map();

const getBookCard = (target) =>
  target instanceof Element ? target.closest(".book") : null;

const isSynopsisOpen = () => Boolean(openBookId);

const setSubtitle = (text) => {
  if (!subtitleText) {
    return;
  }

  const nextText = text?.trim() || defaultSubtitle;
  if (subtitleText.textContent === nextText) {
    return;
  }

  const transitionId = subtitleTransitionId + 1;
  subtitleTransitionId = transitionId;
  subtitleText.classList.add("is-transitioning");

  window.setTimeout(() => {
    if (transitionId !== subtitleTransitionId) {
      return;
    }

    subtitleText.textContent = nextText;
    subtitleText.classList.remove("is-transitioning");
  }, 140);
};

const setActiveBook = (card) => {
  if (!libraryContainer) {
    return;
  }

  if (activeBookCard === card) {
    return;
  }

  if (activeBookCard) {
    activeBookCard.classList.remove("is-active-book");
  }

  activeBookCard = card;

  if (activeBookCard) {
    libraryContainer.classList.add("library-has-active-book");
    activeBookCard.classList.add("is-active-book");
  } else {
    libraryContainer.classList.remove("library-has-active-book");
  }
};

const createParagraph = (content) => {
  const paragraph = document.createElement("p");
  paragraph.textContent = content;
  return paragraph;
};

const renderSynopsis = (paragraphs) => {
  if (!synopsisContent) {
    return;
  }

  synopsisContent.replaceChildren(...paragraphs.map(createParagraph));
};

const setSynopsisState = (isOpen) => {
  libraryStage?.classList.toggle("library-stage-has-synopsis", isOpen);
  synopsisPanel?.setAttribute("aria-hidden", String(!isOpen));

  if (openBookLink) {
    if (isOpen) {
      openBookLink.removeAttribute("tabindex");
    } else {
      openBookLink.tabIndex = -1;
      openBookLink.removeAttribute("href");
    }
  }

  bookCards.forEach((card, bookId) => {
    const isSelected = isOpen && bookId === openBookId;
    card.classList.toggle("is-selected-book", isSelected);
    card.setAttribute("aria-expanded", String(isSelected));

    if (isOpen) {
      card.tabIndex = -1;
    } else {
      card.removeAttribute("tabindex");
    }
  });
};

const loadSynopsis = async (book) => {
  const cachedSynopsis = synopsisCache.get(book.id);
  if (cachedSynopsis) {
    return cachedSynopsis;
  }

  const synopsisPromise = loadSynopsisParagraphs(book).then((paragraphs) => {
    synopsisCache.set(book.id, paragraphs);
    return paragraphs;
  });

  synopsisCache.set(book.id, synopsisPromise);
  return synopsisPromise;
};

const closeSynopsis = () => {
  if (!isSynopsisOpen()) {
    return;
  }

  openBookId = null;
  synopsisRequestId += 1;
  setSynopsisState(false);
  setActiveBook(null);
  setSubtitle(defaultSubtitle);
};

const openSynopsis = async (book, card) => {
  openBookId = book.id;
  synopsisRequestId += 1;
  const requestId = synopsisRequestId;

  setActiveBook(card);
  setSubtitle(book.title);
  renderSynopsis(["Loading synopsis..."]);

  if (openBookLink) {
    openBookLink.href = `viewer.html?book=${encodeURIComponent(book.id)}`;
  }

  setSynopsisState(true);

  if (document.activeElement === card) {
    openBookLink?.focus({ preventScroll: true });
  }

  const paragraphs = await loadSynopsis(book);
  if (requestId !== synopsisRequestId || openBookId !== book.id) {
    return;
  }

  renderSynopsis(paragraphs);
};

const createBookCard = (book) => {
  const { id, title, spine, color } = book;

  const card = document.createElement("button");
  card.className = "book";
  card.type = "button";
  card.dataset.bookId = id;
  card.dataset.bookTitle = title;
  card.setAttribute("aria-controls", "library-synopsis");
  card.setAttribute("aria-expanded", "false");

  const spineFrame = document.createElement("span");
  spineFrame.className = "book-spine";

  const img = document.createElement("img");
  img.src = spine;
  img.alt = `${title} spine`;
  img.loading = "lazy";

  spineFrame.append(img);
  card.append(spineFrame);
  attachMagicalHoverGlow(spineFrame, { color, inset: "0.35rem" });

  card.addEventListener("pointerenter", () => {
    if (isSynopsisOpen()) {
      return;
    }

    setActiveBook(card);
    setSubtitle(title);
  });

  card.addEventListener("pointerleave", (event) => {
    if (isSynopsisOpen()) {
      return;
    }

    const nextBook = getBookCard(event.relatedTarget);
    if (nextBook) {
      setActiveBook(nextBook);
      setSubtitle(nextBook.dataset.bookTitle ?? defaultSubtitle);
      return;
    }

    if (activeBookCard === card) {
      setActiveBook(null);
    }

    setSubtitle(defaultSubtitle);
  });

  card.addEventListener("focus", () => {
    if (isSynopsisOpen()) {
      return;
    }

    setActiveBook(card);
    setSubtitle(title);
  });

  card.addEventListener("blur", (event) => {
    if (isSynopsisOpen()) {
      return;
    }

    const nextBook = getBookCard(event.relatedTarget);
    if (nextBook) {
      setActiveBook(nextBook);
      setSubtitle(nextBook.dataset.bookTitle ?? defaultSubtitle);
      return;
    }

    if (activeBookCard === card) {
      setActiveBook(null);
    }

    setSubtitle(defaultSubtitle);
  });

  card.addEventListener("click", () => {
    openSynopsis(book, card);
  });

  bookCards.set(id, card);
  return card;
};

const showMessage = (message) => {
  const status = document.createElement("p");
  status.className = "loading";
  status.textContent = message;

  closeSynopsis();
  bookCards.clear();
  libraryContainer.replaceChildren(status);
};

const renderLibrary = (books) => {
  bookCards.clear();
  libraryContainer.replaceChildren(...books.map(createBookCard));
};

const handleDocumentPointerDown = (event) => {
  if (!isSynopsisOpen() || !synopsisSurface) {
    return;
  }

  const { target } = event;
  if (!(target instanceof Node)) {
    return;
  }

  if (synopsisSurface.contains(target) || openBookLink?.contains(target)) {
    return;
  }

  closeSynopsis();
};

const handleEscape = (event) => {
  if (event.key !== "Escape") {
    return;
  }

  closeSynopsis();
};

const init = async () => {
  try {
    renderLibrary(await loadBooks());
  } catch {
    showMessage("Books are unavailable right now.");
  }
};

document.addEventListener("pointerdown", handleDocumentPointerDown);
window.addEventListener("keydown", handleEscape);

setSynopsisState(false);
init();
