import { loadBooks } from "./book-data.js";
import { createElectricBorderFrame } from "./components/electric-border.js";

const libraryContainer = document.getElementById("library");

const createBookCard = ({ color, cover, id, title }) => {
  const card = document.createElement("a");
  card.className = "book";
  card.href = `preview.html?book=${encodeURIComponent(id)}`;

  const img = document.createElement("img");
  img.src = cover;
  img.alt = `${title} cover`;
  img.loading = "lazy";

  card.append(
    createElectricBorderFrame(img, {
      className: "book-cover-frame",
      color,
      host: card,
      radius: "18px"
    })
  );
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
