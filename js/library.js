import { loadBooks } from "./book-data.js";
import { attachMagicalHoverGlow } from "./book-hover-glow.js";

const libraryContainer = document.getElementById("library");
const subtitle = document.getElementById("library-subtitle");
const subtitleText = subtitle?.querySelector(".subtitle-text");
const defaultSubtitle = subtitle?.dataset.default ?? "";
let subtitleTransitionId = 0;
let activeBookCard = null;

const getBookCard = (target) =>
  target instanceof Element ? target.closest(".book") : null;

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

const createBookCard = ({ id, title, spine, color }) => {
  const card = document.createElement("a");
  card.className = "book";
  card.href = `preview.html?book=${encodeURIComponent(id)}`;
  card.dataset.bookTitle = title;

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
    setActiveBook(card);
    setSubtitle(title);
  });
  card.addEventListener("pointerleave", (event) => {
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
    setActiveBook(card);
    setSubtitle(title);
  });
  card.addEventListener("blur", (event) => {
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
  return card;
};

const showMessage = (message) => {
  const status = document.createElement("p");
  status.className = "loading";
  status.textContent = message;
  libraryContainer.replaceChildren(status);
};

const renderLibrary = (books) => {
  libraryContainer.replaceChildren(...books.map(createBookCard));
};

const init = async () => {
  try {
    renderLibrary(await loadBooks());
  } catch {
    showMessage("Books are unavailable right now.");
  }
};

init();
