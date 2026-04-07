const MOBILE_SITE_MEDIA_QUERY =
  "(pointer: coarse) and (max-width: 900px), (pointer: coarse) and (max-height: 500px)";

const mobileSiteMedia =
  typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia(MOBILE_SITE_MEDIA_QUERY)
    : null;

const getMainContent = () => document.querySelector("main");

const getRotateOverlay = () => document.getElementById("mobile-rotate-overlay");

const isMobileSite = () => Boolean(mobileSiteMedia?.matches);

const isLandscapeViewport = () =>
  window.matchMedia("(orientation: landscape)").matches ||
  window.innerWidth >= window.innerHeight;

const addMediaChangeListener = (mediaQueryList, listener) => {
  if ("addEventListener" in mediaQueryList) {
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }

  mediaQueryList.addListener(listener);
  return () => mediaQueryList.removeListener(listener);
};

const setMainBlocked = (mainContent, isBlocked) => {
  if (!mainContent) {
    return;
  }

  mainContent.toggleAttribute("inert", isBlocked);

  if (isBlocked) {
    mainContent.setAttribute("aria-hidden", "true");
  } else {
    mainContent.removeAttribute("aria-hidden");
  }
};

const setOverlayVisible = (overlay, isVisible) => {
  if (!overlay) {
    return;
  }

  overlay.hidden = !isVisible;
  overlay.setAttribute("aria-hidden", String(!isVisible));
};

export const initMobileExperience = () => {
  const body = document.body;
  const mainContent = getMainContent();
  const rotateOverlay = getRotateOverlay();

  if (!body || !mobileSiteMedia) {
    return {
      isMobileSite,
      isLandscapeViewport,
      dispose() {}
    };
  }

  const applyState = () => {
    const mobile = isMobileSite();
    const landscape = mobile && isLandscapeViewport();
    const shouldBlock = mobile && !landscape;

    body.classList.toggle("is-mobile-site", mobile);
    body.classList.toggle("is-mobile-landscape", landscape);
    body.classList.toggle("is-mobile-portrait-blocked", shouldBlock);

    setMainBlocked(mainContent, shouldBlock);
    setOverlayVisible(rotateOverlay, shouldBlock);
  };

  const handleChange = () => {
    applyState();
  };

  const removeMobileSiteListener = addMediaChangeListener(
    mobileSiteMedia,
    handleChange
  );
  window.addEventListener("resize", handleChange);
  window.addEventListener("orientationchange", handleChange);
  window.visualViewport?.addEventListener("resize", handleChange);

  applyState();

  return {
    isMobileSite,
    isLandscapeViewport,
    dispose() {
      removeMobileSiteListener();
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("orientationchange", handleChange);
      window.visualViewport?.removeEventListener("resize", handleChange);
    }
  };
};

export { MOBILE_SITE_MEDIA_QUERY };
