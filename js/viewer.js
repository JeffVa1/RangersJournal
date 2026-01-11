const titleEl = document.getElementById("book-title");
const indicatorEl = document.getElementById("page-indicator");
const pageContainer = document.getElementById("page-container");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const modeToggle = document.getElementById("mode-toggle");
const magnifyToggle = document.getElementById("magnify-toggle");

const mediaQuery = window.matchMedia("(max-width: 720px)");

let pages = [];
let currentIndex = 0;
let isDoublePage = false;
let isMagnifyEnabled = false;
const magnification = 1.25;
const singlePageCovers = new Set(["cover.png", "end-cover.png"]);

const isCoverPage = (index) => {
  const src = pages[index] || "";
  return singlePageCovers.has(src.split("/").pop());
};

const isSinglePageInDoubleMode = (index) => isCoverPage(index);

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

const updateMagnifierState = () => {
  pageContainer.classList.toggle("magnifier-active", isMagnifyEnabled);
  magnifyToggle.setAttribute("aria-pressed", String(isMagnifyEnabled));
};

const handleMagnifierMove = (event, img, lens) => {
  if (!isMagnifyEnabled) {
    return;
  }

  const rect = img.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    lens.style.opacity = "0";
    return;
  }

  const lensWidth = lens.offsetWidth;
  const lensHeight = lens.offsetHeight;

  lens.style.left = `${x}px`;
  lens.style.top = `${y}px`;
  lens.style.backgroundImage = `url('${img.src}')`;
  lens.style.backgroundSize = `${rect.width * magnification}px ${
    rect.height * magnification
  }px`;
  lens.style.backgroundPosition = `${-(x * magnification - lensWidth / 2)}px ${
    -(y * magnification - lensHeight / 2)
  }px`;
  lens.style.opacity = "1";
};

const createPageFrame = (src, alt) => {
  const frame = document.createElement("div");
  frame.className = "page-frame";
  const img = createPageImage(src, alt);
  const lens = document.createElement("div");
  lens.className = "magnifier-lens";
  lens.setAttribute("aria-hidden", "true");

  frame.addEventListener("mousemove", (event) =>
    handleMagnifierMove(event, img, lens)
  );
  frame.addEventListener("mouseleave", () => {
    lens.style.opacity = "0";
  });

  frame.append(img, lens);
  return frame;
};

const renderPages = () => {
  pageContainer.innerHTML = "";
  pageContainer.className = `page-container ${isDoublePage ? "double" : "single"}`;
  updateMagnifierState();

  if (!pages.length) {
    return;
  }

  if (isDoublePage && !isSinglePageInDoubleMode(currentIndex)) {
    const leftSrc = pages[currentIndex];
    const rightSrc = pages[currentIndex + 1];

    pageContainer.appendChild(
      createPageFrame(leftSrc, `Page ${currentIndex + 1}`)
    );

    if (rightSrc) {
      pageContainer.appendChild(
        createPageFrame(rightSrc, `Page ${currentIndex + 2}`)
      );
    }
  } else {
    const src = pages[currentIndex];
    pageContainer.appendChild(createPageFrame(src, `Page ${currentIndex + 1}`));
  }

  updateIndicator();
  updateButtons();
  preloadAdjacent();
};

const updateButtons = () => {
  if (isDoublePage) {
    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= pages.length - 1;
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
    if (currentIndex === 0) {
      currentIndex = clampIndex(1);
    } else if (currentIndex >= pages.length - 2) {
      currentIndex = clampIndex(pages.length - 1);
    } else {
      currentIndex = clampIndex(currentIndex + 2);
    }
  } else {
    currentIndex = clampIndex(currentIndex + 1);
  }
  renderPages();
};

const goPrev = () => {
  if (isDoublePage) {
    if (currentIndex <= 1) {
      currentIndex = clampIndex(0);
    } else if (currentIndex === pages.length - 1) {
      currentIndex = clampIndex(pages.length - 3);
    } else {
      currentIndex = clampIndex(currentIndex - 2);
    }
  } else {
    currentIndex = clampIndex(currentIndex - 1);
  }
  renderPages();
};

const toggleMode = () => {
  isDoublePage = !isDoublePage;
  if (isDoublePage) {
    if (isCoverPage(pages.length - 1) && currentIndex >= pages.length - 2) {
      currentIndex = clampIndex(pages.length - 3);
    } else if (currentIndex === pages.length - 1) {
      currentIndex = clampIndex(pages.length - 2);
    } else if (currentIndex !== 0 && currentIndex % 2 !== 0) {
      currentIndex = currentIndex - 1;
    }
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

const toggleMagnify = () => {
  isMagnifyEnabled = !isMagnifyEnabled;
  updateMagnifierState();
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
magnifyToggle.addEventListener("click", toggleMagnify);
window.addEventListener("keydown", handleKey);
mediaQuery.addEventListener("change", handleResize);

handleResize();
loadBook();
