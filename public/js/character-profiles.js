const app = document.querySelector("[data-character-app]");
const detail = document.querySelector("[data-character-detail]");
const detailImage = document.querySelector("[data-character-detail-image]");
const soloStage = document.querySelector("[data-character-solo-stage]");
const soloImage = document.querySelector("[data-character-solo-image]");
const backButton = document.querySelector("[data-character-back]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const cards = [...document.querySelectorAll("[data-character-card]")];
const cardsById = new Map(cards.map((card) => [card.dataset.characterId, card]));
const profilesById = new Map(
  [...document.querySelectorAll("[data-character-profile]")].map((profile) => [
    profile.dataset.characterProfile,
    profile
  ])
);
const preloadCache = new Map();

let activeId = "";
let hoveredId = "";
let hoverSequence = 0;
let transitionTimer = 0;
let expansionNode = null;

const parsePosition = (value) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed / 100 : 0.5;
};

const getCoverSize = (containerWidth, containerHeight, imageRatio) => {
  if (containerWidth / containerHeight > imageRatio) {
    return {
      width: containerWidth,
      height: containerWidth / imageRatio
    };
  }

  return {
    width: containerHeight * imageRatio,
    height: containerHeight
  };
};

const getElementScale = (element) => {
  if (!element) {
    return 1;
  }

  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === "none") {
    return 1;
  }

  const matrix = new DOMMatrixReadOnly(transform);
  const scale = Math.hypot(matrix.a, matrix.b);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
};

const alignSoloStage = (card) => {
  if (!card || !soloStage || !soloImage) {
    return;
  }

  const rect = card.getBoundingClientRect();
  const slotImage = card.querySelector(".character-slice-image img");
  const position = parsePosition(card.dataset.slicePosition);
  const imageScale = getElementScale(slotImage);
  const imageRatio =
    soloImage.naturalWidth > 0 && soloImage.naturalHeight > 0
      ? soloImage.naturalWidth / soloImage.naturalHeight
      : 16 / 9;
  const sliceCover = getCoverSize(rect.width, rect.height, imageRatio);
  const sliceImageLeft = rect.left + (rect.width - sliceCover.width) * position;
  const sliceImageTop = rect.top + (rect.height - sliceCover.height) * 0.5;
  const sliceCenterX = rect.left + rect.width * 0.5;
  const sliceCenterY = rect.top + rect.height * 0.5;
  const scaledLeft = sliceCenterX + (sliceImageLeft - sliceCenterX) * imageScale;
  const scaledTop = sliceCenterY + (sliceImageTop - sliceCenterY) * imageScale;

  soloStage.style.setProperty("--solo-position", `${position * 100}%`);
  soloStage.style.setProperty("--solo-left", `${scaledLeft}px`);
  soloStage.style.setProperty("--solo-top", `${scaledTop}px`);
  soloStage.style.setProperty("--solo-width", `${sliceCover.width * imageScale}px`);
  soloStage.style.setProperty("--solo-height", `${sliceCover.height * imageScale}px`);
};

const getHashId = () => {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
  return cardsById.has(hash) ? hash : "";
};

const updateUrl = (id, replace = false) => {
  const nextUrl = id
    ? `${window.location.pathname}#${encodeURIComponent(id)}`
    : window.location.pathname;
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", nextUrl);
};

const preloadImage = (src) => {
  if (!src) {
    return Promise.resolve("");
  }

  if (preloadCache.has(src)) {
    return preloadCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // Loaded is enough for the transition; decode failure should not block UI.
      }

      resolve(src);
    };
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });

  preloadCache.set(src, promise);
  return promise;
};

const warmCharacterAssets = (card) => {
  if (!card) {
    return;
  }

  void preloadImage(card.dataset.fullImage).catch(() => {});
  void preloadImage(card.dataset.soloImage).catch(() => {});
};

const warmAllSoloAssets = () => {
  cards.forEach((card) => {
    void preloadImage(card.dataset.soloImage).catch(() => {});
  });
};

const clearExpansion = () => {
  expansionNode?.remove();
  expansionNode = null;
};

const setActiveProfile = (id) => {
  profilesById.forEach((profile, profileId) => {
    const isActive = profileId === id;
    profile.classList.toggle("is-active", isActive);
    profile.setAttribute("aria-hidden", String(!isActive));
  });
};

const hideHover = () => {
  hoverSequence += 1;
  hoveredId = "";
  app?.removeAttribute("data-hovered-character");
  app?.classList.remove("is-hovering-character");
  soloStage?.classList.remove("is-visible");
  cards.forEach((card) => card.classList.remove("is-hovered"));
};

const showHover = async (card) => {
  if (!app || activeId || !card?.dataset.characterId) {
    return;
  }

  const id = card.dataset.characterId;
  const soloSrc = card.dataset.soloImage ?? "";
  const sequence = (hoverSequence += 1);
  hoveredId = id;
  warmCharacterAssets(card);
  cards.forEach((item) => item.classList.toggle("is-hovered", item === card));
  app.dataset.hoveredCharacter = id;
  app.classList.add("is-hovering-character");
  soloStage?.classList.remove("is-visible");

  if (soloImage && soloImage.getAttribute("src") !== soloSrc) {
    soloImage.removeAttribute("src");
  }

  alignSoloStage(card);

  try {
    await preloadImage(soloSrc);
  } catch {
    return;
  }

  if (hoverSequence !== sequence || hoveredId !== id || activeId) {
    return;
  }

  if (soloImage && soloImage.getAttribute("src") !== soloSrc) {
    soloImage.src = soloSrc;
  }

  try {
    await soloImage?.decode?.();
  } catch {
    // The image is already preloaded; do not let decode quirks block the reveal.
  }

  if (hoverSequence === sequence && hoveredId === id && !activeId) {
    alignSoloStage(card);
    window.requestAnimationFrame(() => {
      if (hoverSequence === sequence && hoveredId === id && !activeId) {
        soloStage?.classList.add("is-visible");
      }
    });
  }
};

const runExpansion = (card) => {
  if (!app || !card || prefersReducedMotion.matches) {
    app?.classList.add("is-detail-ready");
    return;
  }

  window.clearTimeout(transitionTimer);
  clearExpansion();

  const rect = card.getBoundingClientRect();
  const fullImage = card.dataset.fullImage ?? "";
  const position = card.dataset.detailPosition ?? "42%";
  const node = document.createElement("div");
  node.className = "character-expansion";
  node.style.left = `${rect.left}px`;
  node.style.top = `${rect.top}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
  node.style.backgroundImage = `url("${fullImage}")`;
  node.style.backgroundPosition = `${position} center`;
  document.body.append(node);
  expansionNode = node;

  app.classList.add("is-expanding-character");
  app.classList.remove("is-detail-ready");

  window.requestAnimationFrame(() => {
    node.classList.add("is-expanded");
  });

  transitionTimer = window.setTimeout(() => {
    clearExpansion();
    app.classList.remove("is-expanding-character");
    app.classList.add("is-detail-ready");
  }, 720);
};

const openCharacter = (id, options = {}) => {
  const card = cardsById.get(id);
  if (!app || !detail || !card) {
    return;
  }

  const { push = false, replace = false, animateFromCard = null } = options;
  hideHover();

  if (push) {
    updateUrl(id, replace);
  }

  activeId = id;
  app.dataset.view = "detail";
  app.dataset.activeCharacter = id;
  detail.setAttribute("aria-hidden", "false");

  cards.forEach((item) => {
    const isActive = item === card;
    item.classList.toggle("is-selected", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  if (detailImage) {
    detailImage.src = card.dataset.fullImage ?? "";
    detailImage.style.objectPosition = `${card.dataset.detailPosition ?? "42%"} center`;
  }

  setActiveProfile(id);
  warmCharacterAssets(card);

  if (animateFromCard) {
    runExpansion(animateFromCard);
  } else {
    window.clearTimeout(transitionTimer);
    clearExpansion();
    app.classList.remove("is-expanding-character");
    app.classList.add("is-detail-ready");
  }
};

const closeGallery = (options = {}) => {
  const { push = false, replace = false } = options;

  if (!app || !detail) {
    return;
  }

  if (push) {
    updateUrl("", replace);
  }

  activeId = "";
  window.clearTimeout(transitionTimer);
  clearExpansion();
  hideHover();

  app.dataset.view = "gallery";
  app.removeAttribute("data-active-character");
  app.classList.remove("is-detail-ready", "is-expanding-character");
  detail.setAttribute("aria-hidden", "true");
  cards.forEach((card) => {
    card.classList.remove("is-selected");
    card.removeAttribute("aria-pressed");
  });
  setActiveProfile("");
};

const syncFromLocation = () => {
  const id = getHashId();

  if (id) {
    openCharacter(id);
  } else {
    closeGallery();
  }
};

cards.forEach((card) => {
  card.addEventListener("pointerenter", () => showHover(card));
  card.addEventListener("pointerleave", () => {
    if (hoveredId === card.dataset.characterId) {
      hideHover();
    }
  });
  card.addEventListener("focus", () => showHover(card));
  card.addEventListener("blur", () => {
    if (hoveredId === card.dataset.characterId) {
      hideHover();
    }
  });
  card.addEventListener("click", () => {
    const id = card.dataset.characterId;
    if (id) {
      openCharacter(id, { push: true, animateFromCard: card });
    }
  });
});

backButton?.addEventListener("click", () => {
  closeGallery({ push: true });
});

window.addEventListener("popstate", syncFromLocation);
window.addEventListener("hashchange", syncFromLocation);
window.addEventListener("resize", () => {
  if (hoveredId && !activeId) {
    alignSoloStage(cardsById.get(hoveredId));
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeId) {
    closeGallery({ push: true });
  }
});

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(warmAllSoloAssets, { timeout: 1400 });
} else {
  window.setTimeout(warmAllSoloAssets, 500);
}

syncFromLocation();
