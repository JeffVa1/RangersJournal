const SVG_NS = "http://www.w3.org/2000/svg";
const FILTER_DEFS_ID = "electric-border-defs";
const FILTER_ID = "electric-border-displace";
const DEFAULT_COLOR = "#dd8448";
const DEFAULT_RADIUS = "24px";

const createSvgElement = (tagName, attributes = {}) => {
  const element = document.createElementNS(SVG_NS, tagName);

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  return element;
};

const createLayer = (className) => {
  const layer = document.createElement("span");
  layer.className = className;
  return layer;
};

const normalizeColor = (color) =>
  typeof color === "string" && color.trim() ? color.trim() : DEFAULT_COLOR;

export const ensureElectricBorderDefs = () => {
  if (document.getElementById(FILTER_DEFS_ID)) {
    return FILTER_ID;
  }

  const svg = createSvgElement("svg", {
    id: FILTER_DEFS_ID,
    class: "electric-border-defs",
    "aria-hidden": "true",
    width: "0",
    height: "0",
    focusable: "false"
  });

  const defs = createSvgElement("defs");
  const filter = createSvgElement("filter", {
    id: FILTER_ID,
    x: "-30%",
    y: "-30%",
    width: "160%",
    height: "160%"
  });
  const turbulence = createSvgElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.014 0.09",
    numOctaves: "2",
    seed: "5",
    result: "noise"
  });
  const turbulenceAnimation = createSvgElement("animate", {
    attributeName: "baseFrequency",
    dur: "7s",
    values: "0.014 0.09;0.024 0.14;0.01 0.08;0.014 0.09",
    repeatCount: "indefinite"
  });
  const displacement = createSvgElement("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "noise",
    scale: "12",
    xChannelSelector: "R",
    yChannelSelector: "G"
  });
  const displacementAnimation = createSvgElement("animate", {
    attributeName: "scale",
    dur: "5s",
    values: "10;16;11;10",
    repeatCount: "indefinite"
  });

  turbulence.append(turbulenceAnimation);
  displacement.append(displacementAnimation);
  filter.append(turbulence, displacement);
  defs.append(filter);
  svg.append(defs);
  document.body.prepend(svg);

  return FILTER_ID;
};

export const createElectricBorderFrame = (
  content,
  {
    className = "",
    color = DEFAULT_COLOR,
    host = null,
    radius = DEFAULT_RADIUS
  } = {}
) => {
  if (!(content instanceof HTMLElement)) {
    throw new TypeError("Electric border content must be an HTMLElement.");
  }

  ensureElectricBorderDefs();

  if (host instanceof HTMLElement) {
    host.classList.add("electric-border-host");
  }

  const shell = document.createElement("span");
  shell.className = ["electric-border-shell", className].filter(Boolean).join(" ");
  shell.style.setProperty("--electric-border-color", normalizeColor(color));
  shell.style.setProperty("--electric-border-radius", radius);

  const contentContainer = document.createElement("span");
  contentContainer.className = "electric-border-content";
  contentContainer.append(content);

  const effect = document.createElement("span");
  effect.className = "electric-border-effect";
  effect.setAttribute("aria-hidden", "true");
  effect.append(
    createLayer("electric-border-stroke"),
    createLayer("electric-border-stroke electric-border-stroke-soft"),
    createLayer("electric-border-stroke electric-border-stroke-glow"),
    createLayer("electric-border-ambient")
  );

  shell.append(contentContainer, effect);

  return shell;
};
