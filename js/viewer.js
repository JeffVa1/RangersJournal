const titleEl = document.getElementById("book-title");
const indicatorEl = document.getElementById("page-indicator");
const pageContainer = document.getElementById("page-container");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const modeToggle = document.getElementById("mode-toggle");

const mediaQuery = window.matchMedia("(max-width: 720px)");

let pages = [];
let currentIndex = 0;
let isDoublePage = false;

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
  if (isDoublePage) {
    const left = currentIndex + 1;
    const right = Math.min(currentIndex + 2, pages.length);
    indicatorEl.textContent = `Pages ${left}–${right} of ${pages.length}`;
  } else {
    indicatorEl.textContent = `Page ${currentIndex + 1} of ${pages.length}`;
  }
};

const createPageImage = (src, alt) => {
  const img = document.createElement("img");
  img.className = "page-image";
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  return img;
};

const renderPages = () => {
  pageContainer.innerHTML = "";
  pageContainer.className = `page-container ${isDoublePage ? "double" : "single"}`;

  if (!pages.length) {
    return;
  }

  if (isDoublePage) {
    const leftSrc = pages[currentIndex];
    const rightSrc = pages[currentIndex + 1];

    pageContainer.appendChild(
      createPageImage(leftSrc, `Page ${currentIndex + 1}`)
    );

    if (rightSrc) {
      pageContainer.appendChild(
        createPageImage(rightSrc, `Page ${currentIndex + 2}`)
      );
    }
  } else {
    const src = pages[currentIndex];
    pageContainer.appendChild(createPageImage(src, `Page ${currentIndex + 1}`));
  }

  updateIndicator();
  updateButtons();
  preloadAdjacent();
};

const updateButtons = () => {
  if (isDoublePage) {
    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= pages.length - 2;
  } else {
    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= pages.length - 1;
  }
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
  if (isDoublePage) {
    preloadImage(currentIndex - 2);
    preloadImage(currentIndex - 1);
    preloadImage(currentIndex + 2);
    preloadImage(currentIndex + 3);
  } else {
    preloadImage(currentIndex - 1);
    preloadImage(currentIndex + 1);
  }
};

const goNext = () => {
  if (isDoublePage) {
    currentIndex = clampIndex(currentIndex + 2);
  } else {
    currentIndex = clampIndex(currentIndex + 1);
  }
  renderPages();
};

const goPrev = () => {
  if (isDoublePage) {
    currentIndex = clampIndex(currentIndex - 2);
  } else {
    currentIndex = clampIndex(currentIndex - 1);
  }
  renderPages();
};

const toggleMode = () => {
  isDoublePage = !isDoublePage;
  if (isDoublePage) {
    currentIndex = currentIndex % 2 === 0 ? currentIndex : currentIndex - 1;
    modeToggle.textContent = "Single Page";
  } else {
    modeToggle.textContent = "Double Page";
  }
  if (mediaQuery.matches) {
    isDoublePage = false;
    modeToggle.textContent = "Double Page";
  }
  renderPages();
};

const handleResize = () => {
  if (mediaQuery.matches && isDoublePage) {
    isDoublePage = false;
    modeToggle.textContent = "Double Page";
    renderPages();
  }
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
modeToggle.addEventListener("click", toggleMode);
window.addEventListener("keydown", handleKey);
mediaQuery.addEventListener("change", handleResize);

handleResize();
loadBook();