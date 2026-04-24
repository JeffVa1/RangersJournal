const GLOW_CLASS = "magical-hover-glow";
const GLOW_LAYER_CLASS = "magical-hover-glow__layer";
const DEFAULTS = {
  color: "#9dceff",
  radius: "1rem",
  inset: "0.85rem"
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const supportsColorValidation =
  typeof CSS !== "undefined" && typeof CSS.supports === "function";

const normalizeColor = (value) => {
  if (!isNonEmptyString(value)) {
    return DEFAULTS.color;
  }

  const color = value.trim();
  return !supportsColorValidation || CSS.supports("color", color)
    ? color
    : DEFAULTS.color;
};

const findGlowLayer = (element) =>
  Array.from(element.children).find((child) =>
    child.classList.contains(GLOW_LAYER_CLASS)
  );

const ensureGlowLayer = (element) => {
  const existingLayer = findGlowLayer(element);
  if (existingLayer) {
    return existingLayer;
  }

  const layer = document.createElement("span");
  layer.className = GLOW_LAYER_CLASS;
  layer.setAttribute("aria-hidden", "true");
  element.prepend(layer);
  return layer;
};

export const attachMagicalHoverGlow = (element, options = {}) => {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError("attachMagicalHoverGlow expects an HTMLElement.");
  }

  element.classList.add(GLOW_CLASS);
  ensureGlowLayer(element);

  element.style.setProperty(
    "--magical-glow-color",
    normalizeColor(options.color)
  );
  element.style.setProperty(
    "--magical-glow-radius",
    isNonEmptyString(options.radius) ? options.radius.trim() : DEFAULTS.radius
  );
  element.style.setProperty(
    "--magical-glow-inset",
    isNonEmptyString(options.inset) ? options.inset.trim() : DEFAULTS.inset
  );

  return element;
};

export const updateMagicalHoverGlow = (element, color) =>
  attachMagicalHoverGlow(element, { color });
