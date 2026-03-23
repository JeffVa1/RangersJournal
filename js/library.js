import { loadBooks } from "./book-data.js";
import { attachMagicalHoverGlow } from "./book-hover-glow.js";

const libraryContainer = document.getElementById("library");
const subtitle = document.getElementById("library-subtitle");
const subtitleText = subtitle?.querySelector(".subtitle-text");
const defaultSubtitle = subtitle?.dataset.default ?? "";
let subtitleTransitionId = 0;

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

const createBookCard = ({ id, title, cover, color }) => {
  const card = document.createElement("a");
  card.className = "book";
  card.href = `preview.html?book=${encodeURIComponent(id)}`;

  const img = document.createElement("img");
  img.src = cover;
  img.alt = `${title} cover`;
  img.loading = "lazy";

  card.append(img);
  attachMagicalHoverGlow(card, { color });
  card.addEventListener("pointerenter", () => setSubtitle(title));
  card.addEventListener("pointerleave", () => setSubtitle(defaultSubtitle));
  card.addEventListener("focus", () => setSubtitle(title));
  card.addEventListener("blur", () => setSubtitle(defaultSubtitle));
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
