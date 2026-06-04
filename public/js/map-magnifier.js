const stage = document.querySelector("[data-map-stage]");
const toggle = document.querySelector("[data-map-magnifier-toggle]");
const image = document.querySelector("[data-map-image]");
const lens = document.querySelector("[data-map-magnifier-lens]");
const lensImage = document.querySelector("[data-map-magnifier-image]");

const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");
const zoom = 2;

if (stage && toggle && image && lens && lensImage && hoverCapable.matches) {
  let enabled = false;
  let active = false;

  const setEnabled = (nextEnabled) => {
    enabled = nextEnabled;
    active = false;
    stage.classList.toggle("is-magnifier-enabled", enabled);
    stage.classList.remove("is-magnifier-active");
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.setAttribute(
      "aria-label",
      enabled ? "Disable map magnifier" : "Enable map magnifier"
    );
  };

  const getCoveredImageRect = () => {
    const stageRect = stage.getBoundingClientRect();
    const naturalWidth = image.naturalWidth || 5733;
    const naturalHeight = image.naturalHeight || 3200;
    const coverScale = Math.max(
      stageRect.width / naturalWidth,
      stageRect.height / naturalHeight
    );
    const width = naturalWidth * coverScale;
    const height = naturalHeight * coverScale;

    return {
      stageRect,
      width,
      height,
      offsetX: (stageRect.width - width) / 2,
      offsetY: (stageRect.height - height) / 2
    };
  };

  const moveLens = (event) => {
    if (!enabled) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest("[data-map-magnifier-toggle]")
    ) {
      hideLens();
      return;
    }

    const coveredImage = getCoveredImageRect();
    const lensSize = lens.offsetWidth;
    const pointerX = event.clientX - coveredImage.stageRect.left;
    const pointerY = event.clientY - coveredImage.stageRect.top;

    active = true;
    stage.classList.add("is-magnifier-active");
    lens.style.left = `${pointerX}px`;
    lens.style.top = `${pointerY}px`;
    lensImage.style.width = `${coveredImage.width * zoom}px`;
    lensImage.style.height = `${coveredImage.height * zoom}px`;
    lensImage.style.transform = `translate3d(${
      (coveredImage.offsetX - pointerX) * zoom + lensSize / 2
    }px, ${(coveredImage.offsetY - pointerY) * zoom + lensSize / 2}px, 0)`;
  };

  const hideLens = () => {
    active = false;
    stage.classList.remove("is-magnifier-active");
  };

  toggle.addEventListener("click", () => setEnabled(!enabled));
  stage.addEventListener("pointerenter", moveLens);
  stage.addEventListener("pointermove", moveLens);
  stage.addEventListener("pointerleave", hideLens);
  window.addEventListener("resize", () => {
    if (active) {
      hideLens();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && enabled) {
      setEnabled(false);
    }
  });
} else if (toggle) {
  toggle.hidden = true;
}
