import { loadBooks, loadManifest, loadSynopsisParagraphs } from "./book-data.js";

const $ = window.jQuery;

const app = document.querySelector("[data-library-app]");
const galleryGrid = document.getElementById("library-gallery-grid");
const detail = document.getElementById("library-detail");
const detailTitle = document.getElementById("library-detail-title");
const detailVolume = document.getElementById("library-detail-volume");
const detailCover = document.getElementById("library-detail-cover");
const synopsisContent = document.getElementById("library-synopsis-content");
const activeBackground = document.querySelector("[data-active-background]");
const expansionLayer = document.querySelector("[data-library-expansion]");
const openReaderButton = document.querySelector("[data-open-reader]");
const reader = document.getElementById("library-reader");
const readerTitle = document.getElementById("library-reader-title");
const readerShell = document.querySelector(".reader-book-shell");
const readerFrame = document.getElementById("reader-book-frame");
const readerBook = document.getElementById("reader-book");
const readerCoverStage = document.getElementById("reader-cover-stage");
const readerCoverImage = document.getElementById("reader-cover-image");
const readerFallback = document.getElementById("reader-fallback");
const readerIndicator = document.getElementById("reader-page-indicator");
const readerPrev = document.querySelector("[data-reader-prev]");
const readerNext = document.querySelector("[data-reader-next]");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const booksById = new Map();
const synopsisCache = new Map();
const manifestCache = new Map();
const preloadCache = new Map();
const detailPreloadCache = new Map();

let activeBook = null;
let activeView = "gallery";
let activeReaderTitle = "";
let activeReaderFrame = "";
let activeReaderFrontCover = "";
let activeReaderBackCover = "";
let activeReaderPages = [];
let activeReaderDisplayPages = [];
let activeReaderInteriorPageCount = 0;
let readerRenderId = 0;
let expansionTimer = 0;
let transitionTimer = 0;
let resizeTimer = 0;
let detailTransitionToken = 0;
let turnBook = null;
let readerIsTurning = false;

const encodeAssetUrl = (path) =>
  typeof path === "string" && path.trim() ? encodeURI(path) : "";

const createParagraph = (text) => {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
};

const showMessage = (message) => {
  const status = document.createElement("p");
  status.className = "loading";
  status.textContent = message;
  galleryGrid?.replaceChildren(status);
};

const preloadImage = (src) =>
  new Promise((resolve, reject) => {
    if (!src) {
      resolve("");
      return;
    }

    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = encodeAssetUrl(src);
  });

const setBackground = (book) => {
  if (!activeBackground) {
    return;
  }

  if (book?.background) {
    activeBackground.style.backgroundImage = `url("${encodeAssetUrl(book.background)}")`;
  } else {
    activeBackground.style.backgroundImage = "";
  }
};

const setAriaView = (view) => {
  detail?.setAttribute("aria-hidden", String(view !== "detail"));
  reader?.setAttribute("aria-hidden", String(view !== "reader"));
};

const hasTurnBook = () => Boolean(turnBook && $?.fn?.turn);

const destroyTurnBook = () => {
  if (hasTurnBook()) {
    try {
      turnBook.turn("destroy");
    } catch {
      // turn.js can already be detached while tearing down surfaces.
    }
  }

  turnBook = null;
  readerBook?.replaceChildren();
};

const resetReader = () => {
  readerRenderId += 1;
  destroyTurnBook();

  readerFallback?.replaceChildren();
  if (readerShell) {
    readerShell.dataset.surface = "";
    readerShell.classList.remove("is-turning");
  }
  if (readerFrame) {
    readerFrame.removeAttribute("src");
    readerFrame.hidden = true;
  }
  if (readerCoverImage) {
    readerCoverImage.removeAttribute("src");
    readerCoverImage.alt = "";
  }
  if (readerCoverStage) {
    readerCoverStage.setAttribute("aria-hidden", "true");
  }

  activeReaderTitle = "";
  activeReaderFrame = "";
  activeReaderFrontCover = "";
  activeReaderBackCover = "";
  activeReaderPages = [];
  activeReaderDisplayPages = [];
  activeReaderInteriorPageCount = 0;
  readerIsTurning = false;
};

const getHashState = () => {
  const rawHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!rawHash) {
    return { view: "gallery", bookId: null };
  }

  const [bookId, mode] = rawHash.split("/");
  const book = booksById.get(bookId);
  if (!book) {
    return { view: "gallery", bookId: null };
  }

  return { view: mode === "read" ? "reader" : "detail", bookId };
};

const applyView = ({ view, bookId }) => {
  activeView = view;
  activeBook = bookId ? booksById.get(bookId) : null;

  app.dataset.view = view;
  app.dataset.activeBook = activeBook?.id ?? "";
  setAriaView(view);
  setBackground(activeBook);

  if (view === "gallery") {
    resetReader();
    return;
  }

  if (!activeBook) {
    return;
  }

  detailTitle.textContent = activeBook.title;
  detailVolume.textContent = activeBook.volumeLabel ?? "";
  detailCover.src = encodeAssetUrl(activeBook.cover);
  detailCover.alt = `${activeBook.title} cover`;
  openReaderButton?.setAttribute("aria-label", `Open ${activeBook.title}`);

  if (view === "detail") {
    resetReader();
    if (synopsisContent?.dataset.bookId !== activeBook.id) {
      void renderSynopsis(activeBook);
    }
  } else {
    void renderReader(activeBook);
  }
};

const runViewTransition = (callback) => {
  if (document.startViewTransition && !prefersReducedMotion.matches) {
    const transition = document.startViewTransition(callback);
    transition.ready?.catch(() => {});
    transition.finished?.catch(() => {});
  } else {
    callback();
  }
};

const syncFromLocation = () => {
  runViewTransition(() => applyView(getHashState()));
};

const setHashState = (bookId, mode = "detail", replace = false) => {
  const nextHash = bookId ? `#${bookId}${mode === "reader" ? "/read" : ""}` : "";
  const nextUrl = `${window.location.pathname}${nextHash}`;

  if (replace) {
    window.history.replaceState(null, "", nextUrl);
  } else {
    window.history.pushState(null, "", nextUrl);
  }

  syncFromLocation();
};

const waitForFrame = () =>
  new Promise((resolve) => window.requestAnimationFrame(resolve));

const waitForReaderLayout = async () => {
  for (let attempts = 0; attempts < 24; attempts += 1) {
    await waitForFrame();
    const rect = readerBook?.getBoundingClientRect();
    if (rect && rect.width > 160 && rect.height > 200) {
      return true;
    }
  }

  return false;
};

const animateBookExpansion = (book, card) => {
  if (
    !book?.background ||
    !card ||
    !expansionLayer ||
    prefersReducedMotion.matches
  ) {
    return;
  }

  const rect = card.getBoundingClientRect();
  expansionLayer.classList.remove("is-animating");
  window.clearTimeout(expansionTimer);
  expansionLayer.style.setProperty("--from-left", `${rect.left}px`);
  expansionLayer.style.setProperty("--from-top", `${rect.top}px`);
  expansionLayer.style.setProperty("--from-width", `${rect.width}px`);
  expansionLayer.style.setProperty("--from-height", `${rect.height}px`);
  expansionLayer.style.backgroundImage = `url("${encodeAssetUrl(book.background)}")`;
  void expansionLayer.offsetWidth;
  expansionLayer.classList.add("is-animating");

  expansionTimer = window.setTimeout(() => {
    expansionLayer.classList.remove("is-animating");
    expansionLayer.style.backgroundImage = "";
  }, 1260);
};

const markLibraryTransition = () => {
  if (!app || prefersReducedMotion.matches) {
    return;
  }

  window.clearTimeout(transitionTimer);
  app.classList.add("is-transitioning-to-detail");
  transitionTimer = window.setTimeout(() => {
    app.classList.remove("is-transitioning-to-detail");
  }, 1250);
};

const loadSynopsis = async (book) => {
  if (synopsisCache.has(book.id)) {
    return synopsisCache.get(book.id);
  }

  const promise = loadSynopsisParagraphs(book);
  synopsisCache.set(book.id, promise);
  return promise;
};

const loadBookManifest = async (book) => {
  if (manifestCache.has(book.id)) {
    return manifestCache.get(book.id);
  }

  const promise = loadManifest(book.manifest);
  manifestCache.set(book.id, promise);
  return promise;
};

const preloadDetailAssets = async (book) => {
  if (detailPreloadCache.has(book.id)) {
    return detailPreloadCache.get(book.id);
  }

  const promise = Promise.allSettled([
    preloadImage(book.background),
    preloadImage(book.cover),
    loadSynopsis(book)
  ]).then(() => loadSynopsis(book));

  detailPreloadCache.set(book.id, promise);
  return promise;
};

const applySynopsisParagraphs = (book, paragraphs) => {
  if (!synopsisContent) {
    return;
  }

  synopsisContent.dataset.bookId = book.id;
  synopsisContent.replaceChildren(...paragraphs.map(createParagraph));
};

const prepareDetailContent = (book, paragraphs) => {
  if (!book) {
    return;
  }

  detailTitle.textContent = book.title;
  detailVolume.textContent = book.volumeLabel ?? "";
  detailCover.src = encodeAssetUrl(book.cover);
  detailCover.alt = `${book.title} cover`;
  openReaderButton?.setAttribute("aria-label", `Open ${book.title}`);

  if (Array.isArray(paragraphs)) {
    applySynopsisParagraphs(book, paragraphs);
  }
};

const getReaderAssets = (book, manifest) => {
  const interiorPages = Array.isArray(manifest.pages) ? manifest.pages : [];

  const contentPages = [];
  if (manifest.titlePage) {
    contentPages.push({
      type: "title",
      src: manifest.titlePage,
      side: "right"
    });
  }

  interiorPages.forEach((src, index) => {
    contentPages.push({
      type: "interior",
      src,
      pageNumber: index + 1
    });
  });

  if (manifest.endPage) {
    contentPages.push({
      type: "end",
      src: manifest.endPage,
      side: "left"
    });
  }

  const displayPages = [{ type: "guard", guardRole: "front-cover" }];
  if (manifest.titlePage) {
    displayPages.push(
      { type: "guard", guardRole: "title-left" },
      { type: "title", src: manifest.titlePage, side: "right" }
    );
  }

  displayPages.push(
    ...interiorPages.map((src, index) => ({
      type: "interior",
      src,
      pageNumber: index + 1
    }))
  );

  if (manifest.endPage) {
    if ((displayPages.length + 1) % 2 !== 0) {
      displayPages.push({ type: "guard", guardRole: "before-end" });
    }

    displayPages.push(
      { type: "end", src: manifest.endPage, side: "left" },
      { type: "guard", guardRole: "end-right" }
    );
  }

  displayPages.push({ type: "guard", guardRole: "back-cover" });

  return {
    frame: manifest.frame || "",
    frontCover: manifest.frontCover || book.frontCover || book.cover || "",
    backCover: manifest.backCover || book.backCover || "",
    titlePage: manifest.titlePage || "",
    endPage: manifest.endPage || "",
    interiorPages,
    contentPages,
    displayPages,
    interiorPageCount: interiorPages.length
  };
};

const preloadReaderAssets = async (book, assets) => {
  const cacheKey = [
    book.id,
    assets.frame,
    assets.frontCover,
    assets.backCover,
    assets.titlePage,
    assets.endPage,
    assets.interiorPageCount
  ].join(":");

  if (preloadCache.has(cacheKey)) {
    return preloadCache.get(cacheKey);
  }

  const sources = [
    assets.frame,
    assets.frontCover,
    assets.backCover,
    assets.titlePage,
    assets.endPage,
    ...assets.interiorPages
  ].filter(Boolean);

  const promise = Promise.all(sources.map(preloadImage));
  preloadCache.set(cacheKey, promise);
  return promise;
};

const renderSynopsis = async (book) => {
  if (!synopsisContent) {
    return;
  }

  if (!synopsisCache.has(book.id) && synopsisContent.dataset.bookId !== book.id) {
    synopsisContent.replaceChildren(createParagraph("Loading synopsis..."));
  }

  const paragraphs = await loadSynopsis(book);
  if (activeBook?.id !== book.id || activeView !== "detail") {
    return;
  }

  applySynopsisParagraphs(book, paragraphs);
};

const showReaderFallback = (message) => {
  if (!readerBook || !readerFallback || !readerIndicator) {
    return;
  }

  destroyTurnBook();
  if (readerShell) {
    readerShell.dataset.surface = "fallback";
    readerShell.classList.remove("is-turning");
  }
  if (readerFrame) {
    readerFrame.hidden = true;
  }
  if (readerCoverStage) {
    readerCoverStage.setAttribute("aria-hidden", "true");
  }
  readerFallback.hidden = false;
  readerFallback.replaceChildren(createParagraph(message));
  readerIndicator.textContent = "";
  readerPrev.disabled = true;
  readerNext.disabled = true;
  readerIsTurning = false;
};

const setReaderSurface = (surface) => {
  if (!readerShell) {
    return;
  }

  readerShell.dataset.surface = surface;

  if (readerCoverStage) {
    readerCoverStage.setAttribute(
      "aria-hidden",
      String(surface !== "front-cover" && surface !== "back-cover")
    );
  }

  if (readerFrame) {
    readerFrame.hidden = surface !== "spread";
    if (surface === "spread" && activeReaderFrame) {
      readerFrame.src = encodeAssetUrl(activeReaderFrame);
    }
  }

  if (readerCoverImage && (surface === "front-cover" || surface === "back-cover")) {
    const isFront = surface === "front-cover";
    readerCoverImage.src = encodeAssetUrl(
      isFront ? activeReaderFrontCover : activeReaderBackCover
    );
    readerCoverImage.alt = isFront
      ? `${activeReaderTitle} front cover`
      : `${activeReaderTitle} back cover`;
    if (readerCoverStage) {
      readerCoverStage.setAttribute(
        "aria-label",
        isFront ? `Open ${activeReaderTitle}` : `Reopen ${activeReaderTitle}`
      );
    }
  }
};

const getFirstReadableTurnPage = () => {
  const index = activeReaderDisplayPages.findIndex(
    (entry) => entry.type === "title" || entry.type === "interior"
  );
  return index >= 0 ? index + 1 : 2;
};

const getLastReadableTurnPage = () => {
  const lastIndex = activeReaderDisplayPages.findLastIndex(
    (entry) => entry.type === "end" || entry.type === "interior"
  );
  return lastIndex >= 0 ? lastIndex + 1 : Math.max(2, activeReaderDisplayPages.length - 1);
};

const getCurrentTurnPage = () =>
  hasTurnBook() ? Number(turnBook.turn("page")) || 1 : getFirstReadableTurnPage();

const normalizeTurnView = (view = hasTurnBook() ? turnBook.turn("view") : []) =>
  Array.isArray(view)
    ? view
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];

const getDisplayEntry = (pageNumber) => activeReaderDisplayPages[pageNumber - 1] ?? null;

const getVisibleEntries = (view = normalizeTurnView()) =>
  view.map((pageNumber) => getDisplayEntry(pageNumber)).filter(Boolean);

const isTitleView = (entries) =>
  entries.some((entry) => entry.type === "title");

const isEndView = (entries) => entries.some((entry) => entry.type === "end");

const updateReaderControls = (viewOverride) => {
  if (!readerIndicator || !readerPrev || !readerNext) {
    return;
  }

  const surface = readerShell?.dataset.surface ?? "front-cover";

  if (surface === "fallback") {
    readerIndicator.textContent = "";
    readerPrev.disabled = true;
    readerNext.disabled = true;
    return;
  }

  if (surface === "front-cover") {
    readerIndicator.textContent = "Front Cover";
    readerPrev.disabled = true;
    readerNext.disabled = !activeReaderFrontCover || readerIsTurning;
    return;
  }

  if (surface === "back-cover") {
    readerIndicator.textContent = "Back Cover";
    readerPrev.disabled = !activeReaderBackCover || readerIsTurning;
    readerNext.disabled = true;
    return;
  }

  const entries = getVisibleEntries(
    Array.isArray(viewOverride) ? viewOverride : normalizeTurnView()
  );
  const visibleContentEntries = entries.filter(
    (entry) => entry.type === "title" || entry.type === "interior" || entry.type === "end"
  );

  if (!visibleContentEntries.length) {
    readerIndicator.textContent = "Opening book...";
    readerPrev.disabled = true;
    readerNext.disabled = true;
    return;
  }

  if (isTitleView(visibleContentEntries)) {
    readerIndicator.textContent = "Title Page";
  } else if (isEndView(visibleContentEntries)) {
    readerIndicator.textContent = "End Page";
  } else {
    const interiorEntries = visibleContentEntries.filter(
      (entry) => entry.type === "interior"
    );
    const start = Math.min(...interiorEntries.map((entry) => entry.pageNumber));
    const end = Math.max(...interiorEntries.map((entry) => entry.pageNumber));
    readerIndicator.textContent = `Pages ${start}-${end} of ${activeReaderInteriorPageCount}`;
  }

  readerPrev.disabled = readerIsTurning;
  readerNext.disabled = readerIsTurning;
};

const createGuardPage = (position) => {
  const page = document.createElement("div");
  page.className = "reader-turn-page reader-turn-page-guard";
  page.dataset.guardPosition = position;
  page.setAttribute("aria-hidden", "true");
  return page;
};

const createTurnPage = (entry) => {
  if (entry.type === "guard") {
    return createGuardPage(entry.guardRole ?? "inner");
  }

  const page = document.createElement("div");
  page.className = `reader-turn-page ${
    entry.type === "interior" ? "reader-turn-page-interior" : "reader-turn-page-single"
  }`;
  page.dataset.pageType = entry.type;
  if (entry.side) {
    page.dataset.side = entry.side;
  }
  if (entry.pageNumber) {
    page.dataset.pageNumber = String(entry.pageNumber);
  }

  const image = document.createElement("img");
  image.className = "reader-turn-page-image";
  image.src = encodeAssetUrl(entry.src);
  image.alt =
    entry.type === "interior"
      ? `${activeReaderTitle} page ${entry.pageNumber}`
      : `${activeReaderTitle} ${entry.type} page`;
  image.draggable = false;
  image.loading = "eager";

  page.append(image);
  return page;
};

const getTurnSize = () => {
  const rect = readerBook?.getBoundingClientRect();
  if (!rect) {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(320, Math.floor(rect.width)),
    height: Math.max(420, Math.floor(rect.height))
  };
};

const resizeTurnBook = () => {
  if (!hasTurnBook()) {
    return;
  }

  const { width, height } = getTurnSize();
  if (!width || !height) {
    return;
  }

  turnBook.turn("size", width, height);
  updateReaderControls();
};

const scheduleTurnResize = () => {
  resizeTurnBook();
  window.requestAnimationFrame(() => {
    resizeTurnBook();
    window.requestAnimationFrame(resizeTurnBook);
  });
  window.setTimeout(resizeTurnBook, 160);
};

const renderTurnBook = (startPage = getFirstReadableTurnPage()) => {
  if (
    !readerBook ||
    !readerFallback ||
    !activeReaderDisplayPages.length ||
    !$?.fn?.turn
  ) {
    showReaderFallback("The book could not be opened.");
    return false;
  }

  destroyTurnBook();

  readerFallback.hidden = true;
  readerFallback.replaceChildren();
  readerBook.hidden = false;
  readerBook.replaceChildren();
  readerIsTurning = false;
  readerShell?.classList.remove("is-turning");
  setReaderSurface("spread");

  const turnRoot = document.createElement("div");
  turnRoot.className = "reader-turn-book";
  turnRoot.setAttribute("aria-label", `${activeReaderTitle} pages`);

  activeReaderDisplayPages.forEach((entry) => {
    turnRoot.append(createTurnPage(entry));
  });

  readerBook.append(turnRoot);

  const { width, height } = getTurnSize();
  if (!width || !height) {
    showReaderFallback("The book could not be opened.");
    return false;
  }

  const targetPage = Math.max(
    getFirstReadableTurnPage(),
    Math.min(startPage, getLastReadableTurnPage())
  );

  try {
    turnBook = $(turnRoot);
    turnBook.turn({
      width,
      height,
      display: "double",
      autoCenter: false,
      duration: prefersReducedMotion.matches ? 0 : 950,
      gradients: !prefersReducedMotion.matches,
      acceleration: true,
      elevation: 48,
      page: targetPage,
      turnCorners: prefersReducedMotion.matches ? "" : "bl,br",
      when: {
        turning(event, page, view) {
          const target = Number(page) || 0;
          const targetEntry = getDisplayEntry(target);

          if (!targetEntry || target <= 1) {
            event.preventDefault();
            readerIsTurning = false;
            readerShell?.classList.remove("is-turning");
            setReaderSurface("front-cover");
            updateReaderControls();
            return;
          }

          if (target >= activeReaderDisplayPages.length) {
            event.preventDefault();
            readerIsTurning = false;
            readerShell?.classList.remove("is-turning");
            setReaderSurface("back-cover");
            updateReaderControls();
            return;
          }

          if (!prefersReducedMotion.matches) {
            readerIsTurning = true;
            readerShell?.classList.add("is-turning");
          }

          setReaderSurface("spread");
          updateReaderControls(Array.isArray(view) ? view : normalizeTurnView());
        },
        turned(event, page, view) {
          readerIsTurning = false;
          readerShell?.classList.remove("is-turning");
          setReaderSurface("spread");
          updateReaderControls(Array.isArray(view) ? view : normalizeTurnView());
        },
        end() {
          readerIsTurning = false;
          readerShell?.classList.remove("is-turning");
          updateReaderControls();
        }
      }
    });
    setReaderSurface("spread");
    updateReaderControls();
    scheduleTurnResize();
    return true;
  } catch {
    destroyTurnBook();
    showReaderFallback("The book could not be opened.");
    return false;
  }
};

const openReaderSpread = async (turnPage = getFirstReadableTurnPage()) => {
  if (!activeBook || !readerIndicator || !activeReaderDisplayPages.length) {
    return;
  }

  const renderId = readerRenderId;
  const bookId = activeBook.id;
  readerIndicator.textContent = "Opening book...";
  readerBook.hidden = false;
  setReaderSurface("spread");

  const hasLayout = await waitForReaderLayout();
  if (
    !hasLayout ||
    renderId !== readerRenderId ||
    activeBook?.id !== bookId ||
    activeView !== "reader"
  ) {
    return;
  }

  if (!hasTurnBook()) {
    const rendered = renderTurnBook(turnPage);
    if (!rendered) {
      return;
    }
  } else {
    setReaderSurface("spread");
    const target = Math.max(
      getFirstReadableTurnPage(),
      Math.min(turnPage, getLastReadableTurnPage())
    );
    if (getCurrentTurnPage() !== target) {
      turnBook.turn("page", target);
    } else {
      updateReaderControls();
    }
    scheduleTurnResize();
  }
};

const goToPrevReaderPage = () => {
  if (readerPrev.disabled) {
    return;
  }

  const surface = readerShell?.dataset.surface ?? "front-cover";

  if (surface === "back-cover") {
    void openReaderSpread(getLastReadableTurnPage());
    return;
  }

  if (surface === "front-cover" || !hasTurnBook()) {
    return;
  }

  const visibleEntries = getVisibleEntries();
  if (!visibleEntries.length || isTitleView(visibleEntries)) {
    setReaderSurface("front-cover");
    updateReaderControls();
    return;
  }

  turnBook.turn("previous");
};

const goToNextReaderPage = () => {
  if (readerNext.disabled) {
    return;
  }

  const surface = readerShell?.dataset.surface ?? "front-cover";

  if (surface === "front-cover") {
    void openReaderSpread(getFirstReadableTurnPage());
    return;
  }

  if (surface === "back-cover" || !hasTurnBook()) {
    return;
  }

  const visibleEntries = getVisibleEntries();
  if (!visibleEntries.length) {
    setReaderSurface("back-cover");
    updateReaderControls();
    return;
  }

  if (isEndView(visibleEntries)) {
    setReaderSurface("back-cover");
    updateReaderControls();
    return;
  }

  turnBook.turn("next");
};

const renderReader = async (book) => {
  if (!readerBook || !readerFallback || !readerIndicator || !readerTitle) {
    return;
  }

  resetReader();
  const renderId = readerRenderId;
  readerTitle.textContent = book.title;
  readerIndicator.textContent = "Loading cover...";
  readerPrev.onclick = goToPrevReaderPage;
  readerNext.onclick = goToNextReaderPage;
  readerPrev.disabled = true;
  readerNext.disabled = true;
  readerBook.hidden = true;
  readerFallback.hidden = true;
  readerFallback.replaceChildren();

  const manifest = await loadBookManifest(book);
  if (
    renderId !== readerRenderId ||
    activeBook?.id !== book.id ||
    activeView !== "reader"
  ) {
    return;
  }

  const readerAssets = getReaderAssets(book, manifest);
  if (
    !readerAssets.frame ||
    !readerAssets.frontCover ||
    !readerAssets.backCover ||
    !readerAssets.titlePage ||
    !readerAssets.endPage ||
    !readerAssets.interiorPages.length
  ) {
    showReaderFallback("The book assets are incomplete.");
    return;
  }

  try {
    await preloadReaderAssets(book, readerAssets);
  } catch {
    if (
      renderId === readerRenderId &&
      activeBook?.id === book.id &&
      activeView === "reader"
    ) {
      showReaderFallback("The book pages could not be loaded.");
    }
    return;
  }

  if (
    renderId !== readerRenderId ||
    activeBook?.id !== book.id ||
    activeView !== "reader"
  ) {
    return;
  }

  activeReaderTitle = book.title;
  activeReaderFrame = readerAssets.frame;
  activeReaderFrontCover = readerAssets.frontCover;
  activeReaderBackCover = readerAssets.backCover;
  activeReaderPages = readerAssets.contentPages;
  activeReaderDisplayPages = readerAssets.displayPages;
  activeReaderInteriorPageCount = readerAssets.interiorPageCount;

  if (readerFrame) {
    readerFrame.src = encodeAssetUrl(activeReaderFrame);
    readerFrame.alt = "";
  }

  setReaderSurface("front-cover");
  updateReaderControls();
};

const openDetailView = async (book, card) => {
  const token = ++detailTransitionToken;
  let paragraphs = null;

  try {
    paragraphs = await preloadDetailAssets(book);
  } catch {
    // If preloading fails, continue with navigation and let normal fallbacks render.
  }

  if (token !== detailTransitionToken) {
    return;
  }

  prepareDetailContent(book, paragraphs);
  animateBookExpansion(book, card);
  markLibraryTransition();
  setHashState(book.id);
};

const createBookCard = (book) => {
  const card = document.createElement("button");
  card.className = "library-book-card";
  card.type = "button";
  card.dataset.bookId = book.id;
  card.setAttribute("aria-label", `Open ${book.title}`);

  const image = document.createElement("span");
  image.className = "library-book-image";
  image.style.backgroundImage = `url("${encodeAssetUrl(book.background)}")`;

  const overlay = document.createElement("span");
  overlay.className = "library-book-overlay";

  const title = document.createElement("span");
  title.className = "library-book-title";
  title.textContent = book.title;

  const volume = document.createElement("span");
  volume.className = "library-book-volume";
  volume.textContent = book.volumeLabel ?? "";

  overlay.append(title, volume);
  card.append(image, overlay);
  card.addEventListener("click", () => {
    void openDetailView(book, card);
  });
  return card;
};

const init = async () => {
  try {
    const books = (await loadBooks()).slice(0, 2);
    books.forEach((book) => booksById.set(book.id, book));
    galleryGrid?.replaceChildren(...books.map(createBookCard));
    syncFromLocation();
  } catch {
    showMessage("Books are unavailable right now.");
  }
};

document.querySelector("[data-library-back]")?.addEventListener("click", () => {
  setHashState(null);
});

document.querySelector("[data-reader-back]")?.addEventListener("click", () => {
  if (activeBook) {
    setHashState(activeBook.id);
  }
});

openReaderButton?.addEventListener("click", () => {
  if (activeBook) {
    setHashState(activeBook.id, "reader");
  }
});

window.addEventListener("popstate", syncFromLocation);
window.addEventListener("hashchange", syncFromLocation);
window.addEventListener("resize", () => {
  window.cancelAnimationFrame(resizeTimer);
  resizeTimer = window.requestAnimationFrame(() => {
    resizeTurnBook();
  });
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (activeView === "reader" && activeBook) {
      setHashState(activeBook.id);
    } else if (activeView === "detail") {
      setHashState(null);
    }
    return;
  }

  if (activeView !== "reader") {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToPrevReaderPage();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    goToNextReaderPage();
  }
});

readerCoverStage?.addEventListener("click", () => {
  const surface = readerShell?.dataset.surface ?? "front-cover";
  if (surface === "front-cover") {
    void openReaderSpread(getFirstReadableTurnPage());
  } else if (surface === "back-cover") {
    void openReaderSpread(getLastReadableTurnPage());
  }
});

init();
