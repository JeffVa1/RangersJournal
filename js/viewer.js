const titleEl = document.getElementById("book-title");
const indicatorEl = document.getElementById("page-indicator");
const pageContainer = document.getElementById("page-container");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

let pages = [];
let currentIndex = 0;

const getBookId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("book");
};

const clampIndex = (index) => Math.max(0, Math.min(index, pages.length - 1));

const updateIndicator = () => {
  if (!pages.length) {
    indicatorEl.textContent = "";
    return;
  }

  indicatorEl.textContent = `Page ${currentIndex + 1} of ${pages.length}`;
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

const updateButtons = () => {
  prevButton.disabled = currentIndex <= 0;
  nextButton.disabled = currentIndex >= pages.length - 1;
};

const preloadImage = (index) => {
  if (index < 0 || index >= pages.length) {
    return;
  }

  const img = new Image();
  img.src = pages[index];
};

const preloadAdjacent = () => {
  if (!pages.length) {
    return;
  }

  preloadImage(currentIndex - 1);
  preloadImage(currentIndex + 1);
};

const renderPages = () => {
  pageContainer.innerHTML = "";
  pageContainer.className = "page-container";

  if (!pages.length) {
    return;
  }

  const src = pages[currentIndex];
  pageContainer.appendChild(createPageFrame(src, `Page ${currentIndex + 1}`));

  updateIndicator();
  updateButtons();
  preloadAdjacent();
};

const goNext = () => {
  currentIndex = clampIndex(currentIndex + 1);
  renderPages();
};

const goPrev = () => {
  currentIndex = clampIndex(currentIndex - 1);
  renderPages();
};

const handleKey = (event) => {
  if (event.key === "ArrowRight") {
    goNext();
  } else if (event.key === "ArrowLeft") {
    goPrev();
  }
};

const loadManifest = (manifestPath) =>
  fetch(manifestPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load manifest");
      }

      return response.json();
    })
    .then((manifest) => {
      titleEl.textContent = manifest.title || "Untitled";
      pages = Array.isArray(manifest.pages) ? manifest.pages : [];
      currentIndex = 0;
      renderPages();
    });

const loadBook = () => {
  const bookId = getBookId();
  if (!bookId) {
    titleEl.textContent = "Book not found";
    return;
  }

  fetch("data/books.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load library");
      }

      return response.json();
    })
    .then((books) => {
      const book = books.find((item) => item.id === bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      return loadManifest(book.manifest);
    })
    .catch(() => {
      titleEl.textContent = "Book unavailable";
      indicatorEl.textContent = "";
      pageContainer.innerHTML = "";
    });
};

prevButton.addEventListener("click", goPrev);
nextButton.addEventListener("click", goNext);
window.addEventListener("keydown", handleKey);

loadBook();
