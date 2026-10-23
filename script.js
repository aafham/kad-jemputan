const config = window.invitationConfig || {};
const audioEnabled = config?.audio?.enabled !== false;

const btn = document.getElementById("btn");
const invitation = document.getElementById("invitation");
const invitationTitle = document.getElementById("invitationTitle");
const floatingActions = document.getElementById("floatingActions");
const countdownIds = ["days", "hours", "minutes", "seconds"];
const countdownStatus = document.getElementById("countdownStatus");
const audioToggle = document.getElementById("audioToggle");
const bgAudio = document.getElementById("bgAudio");
const rsvpForm = document.getElementById("rsvpForm");
const rsvpStatus = document.getElementById("rsvpStatus");
const rsvpDialog = document.getElementById("rsvpDialog");
const openRsvpDialog = document.getElementById("openRsvpDialog");
const closeRsvpDialog = document.getElementById("closeRsvpDialog");
const cancelRsvp = document.getElementById("cancelRsvp");
const guestCountField = document.getElementById("guestCountField");
const guestCount = document.getElementById("guestCount");
const guestWishes = document.getElementById("guestWishes");
const wishCount = document.getElementById("wishCount");
const attendanceSummary = document.getElementById("attendanceSummary");
const rsvpDataStatus = document.getElementById("rsvpDataStatus");
const wishesList = document.getElementById("wishesList");
const reloadRsvpData = document.getElementById("reloadRsvpData");
const shareInvite = document.getElementById("shareInvite");
const flowerLayer = document.getElementById("flowerLayer");
const motionPreference = typeof window.matchMedia === "function"
  ? window.matchMedia("(prefers-reduced-motion: reduce)")
  : null;
const hoverPreference = typeof window.matchMedia === "function"
  ? window.matchMedia("(hover: hover) and (pointer: fine)")
  : null;

let audioShouldPlay = false;
let audioResumeTimer = null;
let audioWatchdogTimer = null;
let flowersInitialized = false;
let rsvpFormStartedAt = Date.now();
let rsvpDataLoading = false;
let rsvpSubmitting = false;
let rsvpDataPromise = null;
let wishRotationTimer = null;
let wishFadeTimer = null;
let wishRotationRun = 0;
let startWishRotation = null;
let disposeWishRotation = null;
let wishAutoplayPaused = Boolean(motionPreference?.matches);
let startGalleryAutoplay = null;
let disposeGalleryAutoplay = null;
let keyboardInteraction = true;

document.body.classList.add("js-enabled");

document.addEventListener("keydown", event => {
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    keyboardInteraction = true;
  }
});
for (const eventName of ["pointerdown", "mousedown", "touchstart"]) {
  document.addEventListener(eventName, () => { keyboardInteraction = false; }, { passive: true });
}

const hasKeyboardFocusWithin = (root, except = null) => {
  const active = document.activeElement;
  if (!root?.contains(active) || active === except) {
    return false;
  }
  try {
    return active.matches(":focus-visible");
  } catch (error) {
    // Older browsers may not support :focus-visible. Pointer-focused buttons
    // must still let the carousel resume after a tap, while keyboard focus pauses.
    return keyboardInteraction;
  }
};

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null && el.textContent !== String(value)) {
    el.textContent = String(value);
  }
};

const setMetaContent = (id, value) => {
  const el = document.getElementById(id);
  if (!el) {
    return;
  }

  if (value) {
    el.setAttribute("content", value);
  } else {
    el.removeAttribute("content");
  }
};

const setHidden = (el, hidden) => {
  if (el) {
    el.hidden = Boolean(hidden);
  }
};

const getCoupleNames = couple => {
  const configuredNames = Array.isArray(couple?.displayNames)
    ? couple.displayNames.filter(Boolean)
    : [];

  if (configuredNames.length > 0) {
    return configuredNames;
  }

  return [couple?.groom, couple?.bride].filter(Boolean);
};

const getNameInitial = value => {
  const name = typeof value === "string" ? value.trim() : "";
  return name ? name.slice(0, 1).toLocaleUpperCase("ms-MY") : "";
};

const getGalleryDelta = (index, activeIndex, total) => {
  let delta = index - activeIndex;
  if (delta > total / 2) {
    delta -= total;
  }
  if (delta < -total / 2) {
    delta += total;
  }
  return delta;
};

const normaliseGalleryIndex = (index, total) => {
  if (total < 1) {
    return 0;
  }
  return ((index % total) + total) % total;
};

const renderGalleryCarousel = (galleryRoot, gallery) => {
  disposeGalleryAutoplay?.();
  disposeGalleryAutoplay = null;
  startGalleryAutoplay = null;

  const gallerySection = document.getElementById("gallerySection");
  const carouselRoot = galleryRoot.closest(".gallery-carousel");
  const previousButton = document.getElementById("galleryPrev");
  const nextButton = document.getElementById("galleryNext");
  const toggleButton = document.getElementById("galleryToggle");
  const controls = document.getElementById("galleryControls");
  const indexStatus = document.getElementById("galleryIndex");
  const cards = [];
  let activeIndex = 0;
  let galleryAutoplayTimer = null;
  let galleryAutoplayStarted = false;
  let galleryAutoplayPaused = Boolean(motionPreference?.matches);
  let pointerInsideCarousel = false;
  let pointerStart = null;
  let touchStart = null;
  let mouseStart = null;
  let lastPointerEventAt = 0;
  let lastTouchEventAt = 0;
  let suppressClickUntil = 0;

  galleryRoot.replaceChildren();

  const updateCarousel = ({ announce = true } = {}) => {
    const total = cards.length;
    if (total === 0) {
      setHidden(gallerySection, true);
      setHidden(controls, true);
      return;
    }

    activeIndex = normaliseGalleryIndex(activeIndex, total);
    cards.forEach((figure, index) => {
      const delta = getGalleryDelta(index, activeIndex, total);
      figure.classList.remove(
        "is-active",
        "is-prev",
        "is-next",
        "is-far-prev",
        "is-far-next",
        "is-hidden"
      );

      let position = "is-hidden";
      if (delta === 0) {
        position = "is-active";
      } else if (delta === -1) {
        position = "is-prev";
      } else if (delta === 1) {
        position = "is-next";
      } else if (delta === -2) {
        position = "is-far-prev";
      } else if (delta === 2) {
        position = "is-far-next";
      }

      figure.classList.add(position);
      figure.setAttribute("aria-hidden", String(delta !== 0));
      figure.dataset.position = position.replace("is-", "");
    });

    if (indexStatus) {
      indexStatus.setAttribute("aria-live", announce ? "polite" : "off");
      indexStatus.textContent = activeIndex + 1 + " / " + total;
    }
    galleryRoot.setAttribute(
      "aria-label",
      "Foto " + (activeIndex + 1) + " daripada " + total + ". Gunakan anak panah kiri atau kanan untuk melihat foto lain."
    );
    setHidden(controls, total < 2);
  };

  gallery.forEach((item, index) => {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    const layout = ["portrait", "portrait-center", "hero", "landscape"].includes(item.layout)
      ? item.layout
      : "portrait";
    const label = item.alt || item.caption || "Galeri majlis " + (index + 1);
    figure.classList.add("gallery-item--" + layout);
    figure.dataset.galleryIndex = String(index);
    figure.setAttribute("role", "group");
    figure.setAttribute("aria-label", "Foto " + (index + 1) + " daripada " + gallery.length + ": " + label);

    const img = document.createElement("img");
    img.className = "gallery-photo";
    img.alt = label;
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      const removedIndex = cards.indexOf(figure);
      if (removedIndex !== -1) {
        cards.splice(removedIndex, 1);
        if (removedIndex < activeIndex) {
          activeIndex -= 1;
        }
      }
      figure.remove();
      updateCarousel();
      restartGalleryAutoplay();
    }, { once: true });
    img.src = item.src;

    figure.appendChild(img);
    if (item.caption) {
      figure.classList.add("gallery-item--has-caption");
      const caption = document.createElement("figcaption");
      caption.textContent = item.caption;
      figure.appendChild(caption);
    }

    figure.addEventListener("click", () => {
      if (Date.now() < suppressClickUntil) {
        return;
      }
      const cardIndex = cards.indexOf(figure);
      if (cardIndex !== -1 && cardIndex !== activeIndex) {
        activeIndex = cardIndex;
        updateCarousel();
        restartGalleryAutoplay();
      }
    });

    cards.push(figure);
    galleryRoot.appendChild(figure);
  });

  const clearGalleryAutoplay = () => {
    if (galleryAutoplayTimer) {
      window.clearTimeout(galleryAutoplayTimer);
      galleryAutoplayTimer = null;
    }
  };

  const canAutoplayGallery = () =>
    galleryAutoplayStarted &&
    cards.length > 1 &&
    !galleryAutoplayPaused &&
    !document.hidden &&
    !pointerInsideCarousel &&
    !pointerStart &&
    !touchStart &&
    !mouseStart &&
    !hasKeyboardFocusWithin(carouselRoot, toggleButton);

  const updateGalleryToggle = () => {
    if (!toggleButton) {
      return;
    }
    toggleButton.textContent = galleryAutoplayPaused ? "Main automatik" : "Jeda";
    toggleButton.setAttribute("aria-label", galleryAutoplayPaused
      ? "Mulakan pertukaran foto automatik setiap dua saat"
      : "Jeda pertukaran foto automatik");
    toggleButton.dataset.paused = String(galleryAutoplayPaused);
  };

  const scheduleGalleryAutoplay = () => {
    clearGalleryAutoplay();
    if (!canAutoplayGallery()) {
      return;
    }

    galleryAutoplayTimer = window.setTimeout(() => {
      galleryAutoplayTimer = null;
      if (!canAutoplayGallery()) {
        return;
      }

      moveCarousel(1, { announce: false, restartAutoplay: false });
      scheduleGalleryAutoplay();
    }, 2000);
  };

  const restartGalleryAutoplay = () => {
    scheduleGalleryAutoplay();
  };

  const moveCarousel = (direction, { announce = true, restartAutoplay = true } = {}) => {
    if (cards.length < 2) {
      return;
    }
    activeIndex = normaliseGalleryIndex(activeIndex + direction, cards.length);
    updateCarousel({ announce });
    if (restartAutoplay) {
      restartGalleryAutoplay();
    }
  };

  const completeGesture = (start, end) => {
    if (!start || !end) {
      return;
    }

    const horizontalDistance = end.x - start.x;
    const verticalDistance = end.y - start.y;
    if (Math.abs(horizontalDistance) < 36 || Math.abs(horizontalDistance) <= Math.abs(verticalDistance)) {
      return;
    }

    suppressClickUntil = Date.now() + 350;
    moveCarousel(horizontalDistance < 0 ? 1 : -1);
  };

  if (previousButton) {
    previousButton.onclick = () => moveCarousel(-1);
  }
  if (nextButton) {
    nextButton.onclick = () => moveCarousel(1);
  }
  if (toggleButton) {
    toggleButton.onclick = () => {
      galleryAutoplayPaused = !galleryAutoplayPaused;
      updateGalleryToggle();
      restartGalleryAutoplay();
    };
    updateGalleryToggle();
  }

  galleryRoot.onkeydown = event => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveCarousel(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveCarousel(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      activeIndex = 0;
      updateCarousel();
      restartGalleryAutoplay();
    } else if (event.key === "End") {
      event.preventDefault();
      activeIndex = Math.max(cards.length - 1, 0);
      updateCarousel();
      restartGalleryAutoplay();
    }
  };

  galleryRoot.onpointerdown = event => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }
    lastPointerEventAt = Date.now();
    clearGalleryAutoplay();
    pointerStart = { x: event.clientX, y: event.clientY };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture is optional; the gesture can still finish inside the gallery.
    }
  };

  galleryRoot.onpointerup = event => {
    lastPointerEventAt = Date.now();
    if (!pointerStart || !event.isPrimary) {
      return;
    }

    completeGesture(pointerStart, { x: event.clientX, y: event.clientY });
    pointerStart = null;
    restartGalleryAutoplay();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (error) {
      // No action needed when pointer capture was not set.
    }
  };

  galleryRoot.onpointercancel = () => {
    pointerStart = null;
    lastPointerEventAt = Date.now();
    restartGalleryAutoplay();
  };

  galleryRoot.ontouchstart = event => {
    if (Date.now() - lastPointerEventAt < 700) {
      return;
    }
    clearGalleryAutoplay();
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  galleryRoot.ontouchend = event => {
    if (Date.now() - lastPointerEventAt < 700 || !touchStart) {
      return;
    }
    const touch = event.changedTouches[0];
    const start = touchStart;
    touchStart = null;
    lastTouchEventAt = Date.now();
    completeGesture(start, touch ? { x: touch.clientX, y: touch.clientY } : null);
    restartGalleryAutoplay();
  };

  galleryRoot.ontouchcancel = () => {
    touchStart = null;
    lastTouchEventAt = Date.now();
    restartGalleryAutoplay();
  };

  galleryRoot.onmousedown = event => {
    if (event.button !== 0 || Date.now() - lastPointerEventAt < 700 || Date.now() - lastTouchEventAt < 700) {
      return;
    }
    clearGalleryAutoplay();
    mouseStart = { x: event.clientX, y: event.clientY };
  };

  galleryRoot.onmouseup = event => {
    if (!mouseStart) {
      return;
    }
    if (Date.now() - lastPointerEventAt < 700 || Date.now() - lastTouchEventAt < 700) {
      mouseStart = null;
      return;
    }
    completeGesture(mouseStart, { x: event.clientX, y: event.clientY });
    mouseStart = null;
    restartGalleryAutoplay();
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      clearGalleryAutoplay();
      return;
    }
    restartGalleryAutoplay();
  };
  const handleMotionChange = () => {
    if (motionPreference.matches) {
      galleryAutoplayPaused = true;
    }
    updateGalleryToggle();
    restartGalleryAutoplay();
  };

  if (carouselRoot) {
    carouselRoot.onmouseenter = () => {
      if (!hoverPreference?.matches) {
        return;
      }
      pointerInsideCarousel = true;
      clearGalleryAutoplay();
    };
    carouselRoot.onmouseleave = () => {
      pointerInsideCarousel = false;
      restartGalleryAutoplay();
    };
    carouselRoot.onfocusin = () => {
      restartGalleryAutoplay();
    };
    carouselRoot.onfocusout = () => {
      window.setTimeout(restartGalleryAutoplay, 0);
    };
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  motionPreference?.addEventListener?.("change", handleMotionChange);
  startGalleryAutoplay = () => {
    galleryAutoplayStarted = true;
    restartGalleryAutoplay();
  };
  disposeGalleryAutoplay = () => {
    clearGalleryAutoplay();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    motionPreference?.removeEventListener?.("change", handleMotionChange);
    if (carouselRoot) {
      carouselRoot.onmouseenter = null;
      carouselRoot.onmouseleave = null;
      carouselRoot.onfocusin = null;
      carouselRoot.onfocusout = null;
    }
  };

  updateCarousel();
};

const setInteractive = (el, enabled) => {
  if (!el) {
    return;
  }

  if (enabled) {
    el.removeAttribute("inert");
    if ("inert" in el) {
      el.inert = false;
    }
    el.removeAttribute("aria-hidden");
  } else {
    el.setAttribute("inert", "");
    if ("inert" in el) {
      el.inert = true;
    }
    el.setAttribute("aria-hidden", "true");
  }
};

const setRsvpStatus = message => {
  if (rsvpStatus) {
    rsvpStatus.textContent = message;
  }
};

const rsvpIsEnabled = () => config?.rsvp?.enabled !== false;

const getRsvpEndpoint = () => {
  const endpoint = config?.rsvp?.endpoint;
  if (typeof endpoint === "string" && endpoint.startsWith("/")) {
    try {
      const url = new URL(endpoint, window.location.origin);
      if (url.origin === window.location.origin) {
        return url.pathname + url.search;
      }
    } catch (error) {
      // An invalid configured URL falls back to the same-origin RSVP route.
    }
  }
  return "/api/rsvp";
};

const setRsvpDataStatus = (message, state = "info") => {
  if (rsvpDataStatus) {
    rsvpDataStatus.textContent = message;
    rsvpDataStatus.dataset.state = state;
  }
};

const getSafeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
};

const formatWishDate = value => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const renderAttendanceSummary = summary => {
  setText("attendingCount", getSafeNumber(summary?.hadir));
  setText("notAttendingCount", getSafeNumber(summary?.tidakHadir));
  setText("guestTotalCount", getSafeNumber(summary?.tetamuHadir));
};

const WISHES_PER_PAGE = 3;
const WISH_ROTATION_DELAY = 5000;
const WISH_FADE_DURATION = 320;

const stopWishRotation = () => {
  disposeWishRotation?.();
  disposeWishRotation = null;
  wishRotationRun += 1;
  startWishRotation = null;
  if (wishRotationTimer) {
    clearTimeout(wishRotationTimer);
    wishRotationTimer = null;
  }
  if (wishFadeTimer) {
    clearTimeout(wishFadeTimer);
    wishFadeTimer = null;
  }
  if (wishesList) {
    wishesList.classList.remove("wishes-list--rotating", "is-fading");
    wishesList.style.minHeight = "";
  }
};

const createWishCard = item => {
  const card = document.createElement("article");
  card.className = "wish-card";

  const message = document.createElement("p");
  message.className = "wish-card__message";
  message.textContent = item.wish.trim();

  const meta = document.createElement("p");
  meta.className = "wish-card__meta";
  const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Tetamu";
  const date = formatWishDate(item.createdAt);
  meta.textContent = date ? name + " · " + date : name;

  card.append(message, meta);
  return card;
};

const renderWishes = wishes => {
  if (!wishesList) {
    return;
  }

  stopWishRotation();
  const wishesSection = document.getElementById("wishesSection");
  const controls = document.getElementById("wishesControls");
  const previousButton = document.getElementById("wishesPrev");
  const nextButton = document.getElementById("wishesNext");
  const toggleButton = document.getElementById("wishesToggle");
  const pageStatus = document.getElementById("wishesPageStatus");
  const publicWishes = Array.isArray(wishes)
    ? wishes.filter(item => typeof item?.wish === "string" && item.wish.trim())
    : [];

  const totalPages = Math.ceil(publicWishes.length / WISHES_PER_PAGE);
  setHidden(controls, totalPages < 2);
  if (publicWishes.length === 0) {
    wishesList.setAttribute("aria-live", "polite");
    wishesList.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada ucapan dipaparkan. Jadilah yang pertama mengirimkan doa.";
    wishesList.appendChild(empty);
    return;
  }

  let pageIndex = 0;
  let pointerInsideWishes = false;
  let rotationStarted = document.body.classList.contains("opened");
  const rotationRun = ++wishRotationRun;
  const showPage = (announce = false) => {
    const start = pageIndex * WISHES_PER_PAGE;
    wishesList.setAttribute("aria-live", "off");
    wishesList.replaceChildren(...publicWishes.slice(start, start + WISHES_PER_PAGE).map(createWishCard));
    if (pageStatus) {
      pageStatus.setAttribute("role", "status");
      pageStatus.setAttribute("aria-live", announce ? "polite" : "off");
      pageStatus.textContent = (pageIndex + 1) + " / " + totalPages;
      pageStatus.setAttribute("aria-label", "Halaman ucapan " + (pageIndex + 1) + " daripada " + totalPages);
    }
  };

  showPage();
  if (totalPages < 2) {
    return;
  }

  let measuredWidth = 0;
  let resizeObserver = null;
  let measureFrame = null;
  const measurePages = () => {
    measureFrame = null;
    if (wishRotationRun !== rotationRun || typeof wishesList.getBoundingClientRect !== "function") {
      return;
    }
    const width = wishesList.getBoundingClientRect().width;
    const parent = wishesList.parentElement;
    if (!parent || !Number.isFinite(width) || width <= 0) {
      return;
    }

    const measuringList = document.createElement("div");
    measuringList.className = "wishes-list";
    measuringList.setAttribute("aria-hidden", "true");
    measuringList.setAttribute("inert", "");
    Object.assign(measuringList.style, {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      width: width + "px",
      boxSizing: "border-box",
      minHeight: "0",
      height: "auto",
      maxHeight: "none",
      transition: "none",
      transform: "none",
    });
    parent.appendChild(measuringList);
    try {
      let tallestPage = 0;
      for (let index = 0; index < totalPages; index += 1) {
        const start = index * WISHES_PER_PAGE;
        measuringList.replaceChildren(...publicWishes.slice(start, start + WISHES_PER_PAGE).map(createWishCard));
        tallestPage = Math.max(tallestPage, measuringList.getBoundingClientRect().height);
      }
      if (Number.isFinite(tallestPage) && tallestPage > 0) {
        const minHeight = Math.ceil(tallestPage) + "px";
        if (wishesList.style.minHeight !== minHeight) {
          wishesList.style.minHeight = minHeight;
        }
        measuredWidth = width;
      }
    } finally {
      measuringList.remove();
    }
  };
  const schedulePageMeasurement = () => {
    if (measureFrame === null) {
      measureFrame = window.requestAnimationFrame(measurePages);
    }
  };
  if (typeof window.ResizeObserver === "function") {
    resizeObserver = new window.ResizeObserver(() => {
      const width = wishesList.getBoundingClientRect().width;
      // min-height also triggers ResizeObserver; only a width change needs work.
      if (Math.abs(width - measuredWidth) > 0.5) {
        schedulePageMeasurement();
      }
    });
    resizeObserver.observe(wishesList);
  } else {
    window.addEventListener("resize", schedulePageMeasurement);
  }
  document.fonts?.addEventListener?.("loadingdone", schedulePageMeasurement);
  document.fonts?.ready?.then(() => {
    if (wishRotationRun === rotationRun) {
      schedulePageMeasurement();
    }
  });
  measurePages();

  const clearPageTimers = () => {
    clearTimeout(wishRotationTimer);
    clearTimeout(wishFadeTimer);
    wishRotationTimer = null;
    wishFadeTimer = null;
    wishesList.classList.remove("is-fading");
  };

  const canRotate = () => rotationRun === wishRotationRun && rotationStarted
    && !wishAutoplayPaused && !document.hidden && !pointerInsideWishes
    && !hasKeyboardFocusWithin(wishesSection, toggleButton);

  const updateWishToggle = () => {
    if (toggleButton) {
      toggleButton.textContent = wishAutoplayPaused ? "Main automatik" : "Jeda";
      toggleButton.setAttribute("aria-label", wishAutoplayPaused
        ? "Mulakan pertukaran ucapan automatik setiap lima saat"
        : "Jeda pertukaran ucapan automatik");
      toggleButton.dataset.paused = String(wishAutoplayPaused);
    }
    wishesList.classList.add("wishes-list--rotating");
  };

  const scheduleNextPage = () => {
    clearTimeout(wishRotationTimer);
    wishRotationTimer = null;
    if (!canRotate()) {
      return;
    }
    wishRotationTimer = window.setTimeout(() => {
      wishRotationTimer = null;
      if (canRotate()) {
        movePage(1, false);
      }
    }, WISH_ROTATION_DELAY);
  };

  const movePage = (direction, announce = true) => {
    clearPageTimers();
    const nextPage = normaliseGalleryIndex(pageIndex + direction, totalPages);
    const finishTransition = () => {
      if (wishRotationRun !== rotationRun) {
        return;
      }
      wishFadeTimer = null;
      pageIndex = nextPage;
      showPage(announce);
      wishesList.classList.remove("is-fading");
      scheduleNextPage();
    };
    if (motionPreference?.matches) {
      finishTransition();
      return;
    }
    wishesList.classList.add("is-fading");
    wishFadeTimer = window.setTimeout(finishTransition, WISH_FADE_DURATION);
  };

  if (previousButton) {
    previousButton.onclick = () => movePage(-1);
  }
  if (nextButton) {
    nextButton.onclick = () => movePage(1);
  }
  if (toggleButton) {
    toggleButton.onclick = () => {
      wishAutoplayPaused = !wishAutoplayPaused;
      clearPageTimers();
      updateWishToggle();
      scheduleNextPage();
    };
  }

  const handleVisibilityChange = () => {
    clearPageTimers();
    scheduleNextPage();
  };
  const handleMotionChange = () => {
    if (motionPreference.matches) {
      wishAutoplayPaused = true;
    }
    clearPageTimers();
    updateWishToggle();
    scheduleNextPage();
  };

  if (wishesSection) {
    wishesSection.onmouseenter = () => {
      if (hoverPreference?.matches) {
        pointerInsideWishes = true;
        clearPageTimers();
      }
    };
    wishesSection.onmouseleave = () => {
      pointerInsideWishes = false;
      scheduleNextPage();
    };
    wishesSection.onfocusin = () => {
      clearPageTimers();
      scheduleNextPage();
    };
    wishesSection.onfocusout = () => window.setTimeout(scheduleNextPage, 0);
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);
  motionPreference?.addEventListener?.("change", handleMotionChange);
  disposeWishRotation = () => {
    clearPageTimers();
    resizeObserver?.disconnect();
    window.removeEventListener("resize", schedulePageMeasurement);
    document.fonts?.removeEventListener?.("loadingdone", schedulePageMeasurement);
    if (measureFrame !== null) {
      window.cancelAnimationFrame(measureFrame);
      measureFrame = null;
    }
    wishesList.style.minHeight = "";
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    motionPreference?.removeEventListener?.("change", handleMotionChange);
    if (wishesSection) {
      wishesSection.onmouseenter = null;
      wishesSection.onmouseleave = null;
      wishesSection.onfocusin = null;
      wishesSection.onfocusout = null;
    }
  };
  startWishRotation = () => {
    rotationStarted = true;
    startWishRotation = null;
    scheduleNextPage();
  };
  updateWishToggle();
  scheduleNextPage();
};

const renderWishesError = () => {
  if (!wishesList || wishesList.children.length > 0) {
    return;
  }

  wishesList.setAttribute("aria-live", "polite");
  const error = document.createElement("p");
  error.className = "empty-state error-state";
  error.textContent = "Ucapan tidak dapat dimuatkan sekarang. Sila cuba semula.";
  wishesList.appendChild(error);
};

const updateWishCount = () => {
  if (wishCount && guestWishes) {
    wishCount.textContent = guestWishes.value.length + " / 250";
  }
};

const updateGuestCountField = () => {
  const attendance = rsvpForm?.querySelector('input[name="attendanceStatus"]:checked')?.value;
  const isAttending = attendance === "hadir";
  setHidden(guestCountField, !isAttending);

  if (guestCount) {
    guestCount.disabled = !isAttending;
    guestCount.required = isAttending;
  }
};

const setRsvpDataBusy = busy => {
  if (attendanceSummary) {
    attendanceSummary.setAttribute("aria-busy", String(Boolean(busy)));
  }
  if (wishesList) {
    wishesList.setAttribute("aria-busy", String(Boolean(busy)));
  }
  if (reloadRsvpData) {
    reloadRsvpData.disabled = Boolean(busy);
  }
};

const getJsonResponse = async response => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const requestRsvp = async (options = {}) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(getRsvpEndpoint(), { ...options, signal: controller.signal });
    const data = await getJsonResponse(response);
    if (controller.signal.aborted) {
      throw new Error("RSVP request timed out");
    }
    if (!response.ok || !data?.ok) {
      const error = new Error("RSVP request failed");
      error.status = response.status;
      if ([400, 413, 415].includes(response.status) && typeof data?.error === "string") {
        error.publicMessage = data.error.slice(0, 300);
      }
      throw error;
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error("RSVP request timed out");
      timeoutError.timedOut = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};

const loadRsvpData = async ({ refresh = false } = {}) => {
  if (!rsvpIsEnabled()) {
    return;
  }
  if (rsvpDataLoading) {
    await rsvpDataPromise;
    if (!refresh) {
      return;
    }
  }

  rsvpDataLoading = true;
  setRsvpDataBusy(true);
  setHidden(reloadRsvpData, true);
  setRsvpDataStatus("Memuatkan kehadiran dan ucapan…");

  rsvpDataPromise = (async () => {
    try {
      const data = await requestRsvp({ headers: { Accept: "application/json" } });
      renderAttendanceSummary(data.summary);
      renderWishes(data.wishes);
      setRsvpDataStatus("");
    } catch (error) {
      const isUnavailable = error?.status === 503;
      const isRateLimited = error?.status === 429;
      setRsvpDataStatus(
        isUnavailable
          ? "Sistem RSVP belum tersedia. Sila hubungi penganjur jika perlu."
          : isRateLimited
            ? "Terlalu banyak permintaan. Sila cuba semula sebentar lagi."
            : error?.timedOut
              ? "Sambungan mengambil masa terlalu lama. Sila cuba muatkan semula."
              : "Tidak dapat memuatkan RSVP sekarang. Sila cuba semula.",
        "error"
      );
      renderWishesError();
      setHidden(reloadRsvpData, false);
    } finally {
      rsvpDataLoading = false;
      setRsvpDataBusy(false);
    }
  })();
  await rsvpDataPromise;
};

const openRsvpForm = () => {
  if (!rsvpDialog) {
    return;
  }

  if (!rsvpSubmitting) {
    rsvpFormStartedAt = Date.now();
    setRsvpStatus("");
    setHidden(rsvpForm, false);
    setHidden(document.getElementById("rsvpSuccess"), true);
  }
  if (typeof rsvpDialog.showModal === "function") {
    if (!rsvpDialog.open) {
      rsvpDialog.showModal();
    }
  } else {
    rsvpDialog.setAttribute("open", "");
  }

  window.setTimeout(() => document.getElementById("guestName")?.focus(), 0);
};

const closeRsvpForm = () => {
  if (!rsvpDialog) {
    return;
  }

  if (typeof rsvpDialog.close === "function" && rsvpDialog.open) {
    rsvpDialog.close();
  } else {
    rsvpDialog.removeAttribute("open");
    openRsvpDialog?.focus();
  }
};

const cleanWhatsappNumber = value => String(value || "").replace(/\D/g, "");

const isValidWhatsappNumber = value => /^\d{8,15}$/.test(value);

const isSafeColor = value => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value || "");

const getExternalUrl = value => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch (error) {
    return "";
  }
};

const setAudioVisual = state => {
  if (!audioToggle) {
    return;
  }

  const labelMap = {
    on: "Audio ON",
    off: "Audio OFF",
    blocked: "Audio disekat oleh browser",
    missing: "Fail audio tiada",
  };

  audioToggle.dataset.state = state;
  audioToggle.title = labelMap[state] || "Toggle audio";
  audioToggle.setAttribute("aria-label", labelMap[state] || "Toggle audio");
  audioToggle.classList.toggle("is-on", state === "on");
};

const tryPlayAudio = async source => {
  if (!audioEnabled || !bgAudio || !audioShouldPlay) {
    return false;
  }

  if (!bgAudio.currentSrc) {
    setAudioVisual("missing");
    return false;
  }

  if (!bgAudio.paused) {
    setAudioVisual("on");
    return true;
  }

  try {
    await bgAudio.play();
    setAudioVisual("on");
    return true;
  } catch (error) {
    setAudioVisual(source === "user" ? "blocked" : "off");
    return false;
  }
};

const renderCalendar = (event, calendar) => {
  const grid = document.getElementById("calendarGrid");
  const header = document.getElementById("calendarHeader");
  const title = document.getElementById("calendarTitle");
  const eventDate = new Date(event.dateTime || "");
  const hasDate = !Number.isNaN(eventDate.getTime());

  setHidden(document.getElementById("calendarSection") || grid?.closest("section"), !hasDate);
  if (!hasDate) {
    grid?.replaceChildren();
    grid?.setAttribute("aria-label", "Kalendar majlis");
    setText("calendarHeader", "");
    title?.removeAttribute("aria-label");
    return;
  }
  if (!grid) {
    return;
  }

  const locale = calendar.locale || "ms-MY";
  const weekStartsOn = Number.isInteger(calendar.weekStartsOn) ? calendar.weekStartsOn : 0;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(eventDate);
  const datePart = type => Number(dateParts.find(part => part.type === type)?.value);
  const year = datePart("year");
  const month = datePart("month") - 1;
  const day = datePart("day");
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstCell = (firstDay - weekStartsOn + 7) % 7;
  const weekdays = ["A", "I", "S", "R", "K", "J", "S"];
  const orderedWeekdays = weekdays.slice(weekStartsOn).concat(weekdays.slice(0, weekStartsOn));

  setText("calendarTitle", calendar.title || "Tarikh Majlis");
  if (title) {
    title.setAttribute("aria-label", (calendar.title || "Tarikh Majlis") + ": " + dateFormatter.format(eventDate));
  }
  if (header) {
    header.textContent = monthFormatter.format(eventDate);
  }
  grid.setAttribute("aria-label", "Kalendar " + monthFormatter.format(eventDate));

  grid.replaceChildren();
  orderedWeekdays.forEach(label => {
    const weekday = document.createElement("div");
    weekday.className = "day";
    weekday.textContent = label;
    weekday.setAttribute("aria-hidden", "true");
    grid.appendChild(weekday);
  });

  for (let index = 0; index < firstCell; index += 1) {
    const empty = document.createElement("div");
    empty.className = "date empty";
    empty.setAttribute("aria-hidden", "true");
    grid.appendChild(empty);
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    const cell = document.createElement("div");
    cell.className = "date";
    cell.textContent = date;

    if (date === day) {
      cell.classList.add("event");
      cell.setAttribute("role", "img");
      cell.setAttribute("aria-label", "Tarikh majlis: " + dateFormatter.format(eventDate));
    }

    grid.appendChild(cell);
  }
};

const renderSchedule = schedule => {
  const scheduleRoot = document.getElementById("scheduleList");
  const slots = Array.isArray(schedule) ? schedule.filter(item => item && (item.time || item.title)) : [];
  setHidden(document.getElementById("scheduleSection") || scheduleRoot?.closest("section"), slots.length === 0);
  if (!scheduleRoot) {
    return;
  }

  scheduleRoot.replaceChildren();
  slots.forEach(item => {
    const slot = document.createElement("div");
    slot.className = "slot";

    const time = document.createElement("span");
    time.textContent = item.time || "";

    const title = document.createElement("span");
    title.textContent = item.title || "";

    slot.append(time, title);
    scheduleRoot.appendChild(slot);
  });
};

const appendNamePair = (root, names, tagName, { formalHonorifics = false } = {}) => {
  const people = Array.isArray(names) ? names.filter(Boolean) : [];

  people.forEach((person, index) => {
    const name = document.createElement(tagName);
    name.className = "name-pair-line";
    const nameText = String(person);
    const honorific = formalHonorifics ? nameText.match(/^(En\.|Puan)\s+(.+)$/i) : null;

    if (honorific) {
      const title = document.createElement("span");
      title.className = "name-honorific";
      title.textContent = honorific[1];
      name.append(title, document.createTextNode(" " + honorific[2]));
    } else {
      name.textContent = nameText;
    }

    root.appendChild(name);

    if (people.length === 2 && index === 0) {
      const separator = document.createElement(tagName);
      separator.className = "name-pair-separator";
      separator.textContent = "&";
      separator.setAttribute("role", "img");
      separator.setAttribute("aria-label", "dan");
      root.appendChild(separator);
    }
  });
};

const renderFamily = family => {
  const familyRoot = document.getElementById("familyList");
  if (!familyRoot) {
    return;
  }

  const hosts = Array.isArray(family?.hosts)
    ? family.hosts.filter(host => host && (host.label || (Array.isArray(host.people) && host.people.length)))
    : [];

  familyRoot.replaceChildren();
  hosts.forEach(host => {
    const card = document.createElement("div");
    card.className = "family-card";

    if (host.label) {
      const label = document.createElement("p");
      label.className = "family-title";
      label.textContent = host.label;
      card.appendChild(label);
    }

    appendNamePair(card, host.people, "p", { formalHonorifics: true });

    familyRoot.appendChild(card);
  });
};

const renderInvitationCopy = text => {
  const copyRoot = document.getElementById("quoteText");
  if (!copyRoot) {
    return;
  }

  const invitationText = String(text || "").trim();
  copyRoot.replaceChildren();
  if (!invitationText) {
    return;
  }

  const honorificPattern = /Dato'\s*\|\s*Datin\s*\|\s*Tuan\s*\|\s*Puan\s*\|\s*Encik\s*\|\s*Cik/i;
  const honorificMatch = honorificPattern.exec(invitationText);
  const appendCopyPart = (className, content) => {
    if (!content) {
      return;
    }

    const part = document.createElement("span");
    part.className = className;
    part.textContent = content;
    copyRoot.appendChild(part);
  };

  if (!honorificMatch) {
    appendCopyPart("invitation-copy__lead", invitationText);
    return;
  }

  appendCopyPart("invitation-copy__lead", invitationText.slice(0, honorificMatch.index).trim());
  appendCopyPart("invitation-copy__honorifics", honorificMatch[0]);
  appendCopyPart("invitation-copy__tail", invitationText.slice(honorificMatch.index + honorificMatch[0].length).trim());
};

const createContactIcon = type => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  if (type === "whatsapp") {
    path.setAttribute(
      "d",
      "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.149-.198.297-.768.967-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.477-.883-.788-1.479-1.761-1.652-2.058-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.173.198-.298.298-.496.099-.198.05-.372-.025-.521-.074-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.509-.173-.009-.372-.011-.571-.011-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.49.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.003a9.82 9.82 0 01-5.02-1.379l-.36-.214-3.73.978.996-3.65-.235-.375a9.81 9.81 0 01-1.51-5.26c0-5.414 4.41-9.82 9.83-9.82 2.62 0 5.08 1.02 6.93 2.87a9.78 9.78 0 012.88 6.93c0 5.41-4.41 9.83-9.83 9.83m8.34-18.15A11.73 11.73 0 0012.05 0C5.59 0 .33 5.26.33 11.73c0 2.06.54 4.07 1.57 5.84L.23 23.7l6.28-1.65a11.77 11.77 0 005.54 1.41h.01c6.46 0 11.72-5.26 11.72-11.73 0-3.13-1.22-6.07-3.39-8.28Z"
    );
  } else {
    path.setAttribute(
      "d",
      "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"
    );
  }

  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", type === "whatsapp" ? "1.45" : "1.8");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
};

const renderContacts = people => {
  const contactSection = document.getElementById("contactSection");
  const contactRoot = document.getElementById("contactList");
  const contacts = Array.isArray(people) ? people.filter(person => person && Array.isArray(person.phones)
    && person.phones.some(phone => isValidWhatsappNumber(cleanWhatsappNumber(phone?.number)))) : [];

  setHidden(contactSection, contacts.length === 0);
  setHidden(document.getElementById("quickContact"), contacts.length === 0);
  if (!contactRoot) {
    return;
  }

  contactRoot.replaceChildren();
  contacts.forEach(person => {
    const phoneEntries = (Array.isArray(person.phones) ? person.phones : []).flatMap(phone => {
      const number = cleanWhatsappNumber(phone?.number);
      return isValidWhatsappNumber(number) ? [{ phone, number }] : [];
    });

    const card = document.createElement("div");
    card.className = "contact-card";
    if (phoneEntries.length === 1) {
      card.classList.add("contact-card--single");
    }

    if (person.name) {
      const name = document.createElement("p");
      name.className = "contact-name";
      name.textContent = person.name;
      card.appendChild(name);
    }

    phoneEntries.forEach(({ phone, number }) => {
      const displayNumber = phone.display || number;
      const phoneRow = document.createElement("div");
      phoneRow.className = "contact-phone";

      const numberText = document.createElement("span");
      numberText.className = "contact-number";
      numberText.textContent = displayNumber;

      const actions = document.createElement("div");
      actions.className = "contact-actions";

      const whatsappLink = document.createElement("a");
      whatsappLink.className = "contact-action contact-action--whatsapp";
      whatsappLink.href = "https://wa.me/" + number;
      whatsappLink.target = "_blank";
      whatsappLink.rel = "noopener noreferrer";
      whatsappLink.setAttribute(
        "aria-label",
        "WhatsApp " + (person.name || "penganjur") + " di " + displayNumber + " (tab baharu)"
      );
      whatsappLink.appendChild(createContactIcon("whatsapp"));

      const callLink = document.createElement("a");
      callLink.className = "contact-action contact-action--call";
      callLink.href = "tel:+" + number;
      callLink.setAttribute("aria-label", "Telefon " + (person.name || "penganjur") + " di " + displayNumber);
      callLink.appendChild(createContactIcon("call"));

      actions.append(whatsappLink, callLink);
      phoneRow.append(numberText, actions);
      card.appendChild(phoneRow);
    });

    if (card.children.length > 0) {
      contactRoot.appendChild(card);
    }
  });
};

const applyConfig = () => {
  const couple = config.couple || {};
  const event = config.event || {};
  const family = config.family || {};
  const dressCode = config.dressCode || {};
  const map = config.map || {};
  const contact = config.contact || {};
  const invitation = config.invitation || {};
  const metadata = config.metadata || {};
  const calendar = config.calendar || {};
  const rsvp = config.rsvp || {};
  const coupleNames = getCoupleNames(couple);
  const coupleText = coupleNames.join(" & ");
  const coverImage = document.getElementById("coverImage");
  if (coverImage && typeof config.cover?.image === "string" && config.cover.image.trim()) {
    coverImage.src = config.cover.image.trim();
  }
  if (bgAudio && Object.prototype.hasOwnProperty.call(config.audio || {}, "src")) {
    bgAudio.querySelector("source")?.removeAttribute("src");
    bgAudio.removeAttribute("src");
    if (typeof config.audio.src === "string" && config.audio.src.trim()) {
      bgAudio.setAttribute("src", config.audio.src.trim());
    }
    bgAudio.load?.();
  }
  setText("wishesSubtitle", coupleText
    ? "Doa dan ucapan daripada tetamu buat " + coupleText + "."
    : "Doa dan ucapan daripada tetamu buat pengantin.");
  setText("gallerySubtitle", coupleText ? "Detik istimewa " + coupleText : "Detik istimewa pengantin");
  setText("openGroom", coupleNames[0] || "");
  setText("openBride", coupleNames[1] || "");
  setText("openInitialGroom", getNameInitial(coupleNames[0]));
  setText("openInitialBride", getNameInitial(coupleNames[1]));
  setText("heroGroom", coupleNames[0] || "");
  setText("heroBride", coupleNames[1] || "");
  setText("eventTitle", event.title ? event.title.toUpperCase() : "");
  const fullNamesRoot = document.getElementById("fullNamesText");
  if (fullNamesRoot) {
    fullNamesRoot.replaceChildren();
    appendNamePair(fullNamesRoot, couple.fullNames, "span");
  }
  setText("eventDateText", event.dateText || "");
  setText("hijriDateText", event.hijriDate || "");
  setText("heroTime", config.isTemplate ? "Masa Majlis" : event.timeText ? "Masa: " + event.timeText : "");
  setText("quoteHeading", invitation.heading || "Jemputan");
  setText("bismillahText", invitation.bismillah || "");
  setText("pantunText", invitation.pantun || config.quote || "");
  renderInvitationCopy(invitation.intro || "");
  setText("closingText", invitation.closing || "");
  setHidden(document.getElementById("bismillahText"), !invitation.bismillah);
  setHidden(document.getElementById("pantunText"), !(invitation.pantun || config.quote));
  setHidden(document.getElementById("hijriDateText"), !event.hijriDate);
  setHidden(document.getElementById("heroTime"), !event.timeText);

  renderFamily(family);

  setText("dressCodeText", dressCode.text);
  const hasDressCode = Boolean(dressCode.text || dressCode.shortText || (Array.isArray(dressCode.colors) && dressCode.colors.length));
  setHidden(document.getElementById("dressCodeSection"), !hasDressCode);

  const fallbackTitle = [event.title, ...coupleNames].filter(Boolean).join(" ");
  const pageTitle = metadata.title || fallbackTitle;
  setText("pageTitle", pageTitle);
  if (pageTitle) {
    document.title = pageTitle;
  }
  setMetaContent("metaDescription", metadata.description);
  setMetaContent("metaRobots", metadata.robots);
  setMetaContent("ogTitle", metadata.title || pageTitle);
  setMetaContent("ogDescription", metadata.description);
  setMetaContent("ogImage", metadata.image);
  setMetaContent("ogImageAlt", metadata.imageAlt);
  setMetaContent("twitterTitle", metadata.title || pageTitle);
  setMetaContent("twitterDescription", metadata.description);
  setMetaContent("twitterImage", metadata.image);
  setMetaContent("ogUrl", metadata.url || window.location.href);

  const canonical = document.getElementById("canonicalUrl");
  if (canonical && (metadata.url || window.location.href)) {
    canonical.href = metadata.url || window.location.href;
  }

  const locationText = [map.query, event.address, event.venue]
    .find(value => typeof value === "string" && value.trim())?.trim() || "";
  const mapQuery = encodeURIComponent(locationText);
  const embedUrl = getExternalUrl(map.embedUrl);
  const googleMapsUrl = getExternalUrl(map.googleMapsUrl)
    || (locationText ? "https://www.google.com/maps/search/?api=1&query=" + mapQuery : "");
  const wazeUrl = getExternalUrl(map.wazeUrl)
    || (locationText ? "https://waze.com/ul?q=" + mapQuery + "&navigate=yes" : "");
  const hasLocation = config.isTemplate !== true && map.enabled !== false
    && Boolean(locationText || googleMapsUrl || wazeUrl || embedUrl);
  const mapLabel = event.address || event.venue || map.query || "lokasi majlis";

  const googleMapsBtn = document.getElementById("googleMapsBtn");
  const wazeBtn = document.getElementById("wazeBtn");
  const mapPreview = document.getElementById("mapPreview");
  const mapEmbed = document.getElementById("mapEmbed");
  const mapAddress = document.getElementById("mapAddress");
  setHidden(document.getElementById("locationSection"), !hasLocation);
  setHidden(document.getElementById("quickLocation"), !hasLocation);

  if (googleMapsBtn) {
    if (hasLocation && googleMapsUrl) googleMapsBtn.href = googleMapsUrl;
    else googleMapsBtn.removeAttribute("href");
    setHidden(googleMapsBtn, !hasLocation || !googleMapsUrl);
    googleMapsBtn.setAttribute("aria-label", "Buka lokasi " + mapLabel + " di Google Maps (tab baharu)");
  }
  if (wazeBtn) {
    if (hasLocation && wazeUrl) wazeBtn.href = wazeUrl;
    else wazeBtn.removeAttribute("href");
    setHidden(wazeBtn, !hasLocation || !wazeUrl);
    wazeBtn.setAttribute("aria-label", "Buka lokasi " + mapLabel + " di Waze (tab baharu)");
  }
  if (mapEmbed) {
    if (hasLocation && embedUrl) {
      mapEmbed.src = embedUrl;
      mapEmbed.title = "Peta pin lokasi " + mapLabel;
    } else {
      mapEmbed.removeAttribute("src");
    }
  }
  setHidden(mapPreview, !hasLocation || !embedUrl);
  if (mapAddress) {
    setText("mapAddress", hasLocation && locationText ? "Lokasi: " + mapLabel : "");
    setHidden(mapAddress, !hasLocation || !locationText);
  }

  const swatchRoot = document.getElementById("dressSwatches");
  if (swatchRoot && Array.isArray(dressCode.colors) && dressCode.colors.length > 0) {
    swatchRoot.replaceChildren();
    dressCode.colors.forEach(color => {
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.setProperty("--swatch", isSafeColor(color.hex) ? color.hex : "#eee");
      swatch.textContent = color.name || "Warna";
      swatchRoot.appendChild(swatch);
    });
  }

  const galleryRoot = document.getElementById("galleryGrid");
  const hasGallery = Array.isArray(config.gallery) && config.gallery.length > 0;
  setHidden(document.getElementById("gallerySection"), !hasGallery);
  if (galleryRoot && hasGallery) {
    renderGalleryCarousel(galleryRoot, config.gallery);
  }

  renderCalendar(event, calendar);
  renderSchedule(config.schedule);
  renderContacts(contact.people);

  if (btn && coupleText) {
    btn.setAttribute("aria-label", "Buka jemputan perkahwinan " + coupleText);
  }
  setText("rsvpSubmitText", "Hantar RSVP & Ucapan");
  const hasRsvp = rsvp.enabled !== false;
  setHidden(document.getElementById("quickRsvp"), !hasRsvp);
  setHidden(document.getElementById("rsvpSection"), !hasRsvp);
  setHidden(document.getElementById("wishesSection"), !hasRsvp);

  setHidden(document.getElementById("templateBadge"), config.isTemplate !== true);
  if (config.isTemplate === true) {
    document.body.classList.add("is-template");
    // Keep the card's sections visible without treating placeholders as a real event.
    config.rsvp = { ...rsvp, enabled: false };
    setHidden(document.getElementById("calendarSection"), true);
    setHidden(document.getElementById("countdownSection"), true);
    for (const link of document.querySelectorAll('a[download]')) {
      link.removeAttribute("href");
      setHidden(link, true);
    }

    if (mapPreview) {
      const placeholder = document.createElement("div");
      placeholder.className = "template-map-placeholder";
      const marker = document.createElement("span");
      marker.className = "template-map-marker";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "\u2316";
      const label = document.createElement("p");
      label.textContent = "Peta lokasi akan dipaparkan di sini.";
      placeholder.append(marker, label);
      mapPreview.replaceChildren(placeholder);
      setHidden(mapPreview, false);
    }
    setHidden(document.getElementById("locationSection"), false);
    setHidden(document.getElementById("quickLocation"), false);
    setHidden(googleMapsBtn?.parentElement, true);
    setText("mapAddress", event.address || event.venue || "Alamat Lokasi Majlis");
    setHidden(mapAddress, false);

    const contactRoot = document.getElementById("contactList");
    if (contactRoot) {
      const card = document.createElement("div");
      card.className = "contact-card template-contact-placeholder";
      const name = document.createElement("p");
      name.className = "contact-name";
      name.textContent = "Nama Penganjur";
      const number = document.createElement("p");
      number.className = "contact-number";
      number.textContent = "Nombor telefon / WhatsApp";
      card.append(name, number);
      contactRoot.replaceChildren(card);
    }
    setHidden(document.getElementById("contactSection"), false);
    setHidden(document.getElementById("quickContact"), false);

    setHidden(document.getElementById("rsvpSection"), false);
    setHidden(document.getElementById("wishesSection"), false);
    setHidden(document.getElementById("quickRsvp"), false);
    for (const id of ["attendingCount", "notAttendingCount", "guestTotalCount"]) setText(id, "0");
    setRsvpDataBusy(false);
    setRsvpDataStatus("Ruang RSVP — isi maklumat majlis untuk mengaktifkan.");
    setHidden(reloadRsvpData, true);
    if (openRsvpDialog) {
      openRsvpDialog.disabled = true;
      openRsvpDialog.textContent = "Borang RSVP";
    }
    renderWishes([{ name: "Tetamu", wish: "Ucapan tetamu akan dipaparkan di sini." }]);
  }
};

const initFlowerRain = () => {
  if (!flowerLayer || flowersInitialized) {
    return;
  }

  flowersInitialized = true;
  const flowerCount = 18;
  for (let i = 0; i < flowerCount; i += 1) {
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.textContent = "\u273F";

    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 8;
    const delay = Math.random() * -16;
    const drift = -55 + Math.random() * 110;
    const size = 12 + Math.random() * 14;
    const alpha = 0.35 + Math.random() * 0.35;

    petal.style.left = left + "%";
    petal.style.fontSize = size + "px";
    petal.style.animationDuration = duration + "s";
    petal.style.animationDelay = delay + "s";
    petal.style.opacity = alpha.toFixed(2);
    petal.style.setProperty("--drift", drift.toFixed(2) + "px");

    flowerLayer.appendChild(petal);
  }
};

const eventStart = new Date(config?.event?.dateTime || "").getTime();
const malaysiaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kuala_Lumpur",
});
const getMalaysiaDateKey = value => {
  const parts = malaysiaDateFormatter.formatToParts(new Date(value));
  const part = type => parts.find(item => item.type === type)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
};
const eventDateKey = Number.isFinite(eventStart) ? getMalaysiaDateKey(eventStart) : null;
let countdownPhase = null;

const pad = value => String(value).padStart(2, "0");

const updateCountdown = () => {
  const now = Date.now();
  const currentDateKey = getMalaysiaDateKey(now);
  const phase = !eventDateKey ? "unavailable"
    : currentDateKey < eventDateKey ? "upcoming"
      : currentDateKey === eventDateKey ? "today" : "ended";

  if (phase !== countdownPhase) {
    countdownPhase = phase;
    const section = document.getElementById("countdownSection");
    const eventStatus = document.getElementById("eventStatus");
    setHidden(section, phase === "ended" || phase === "unavailable");
    setHidden(document.getElementById("countdownValues"), phase !== "upcoming");
    setHidden(eventStatus, phase !== "today");
    if (section) {
      section.dataset.phase = phase;
    }
    if (eventStatus) {
      eventStatus.dataset.phase = phase;
    }
    setText("countdownTitle", phase === "today" ? "Majlis Hari Ini" : "Menghitung Hari");
    setText("eventStatusText", phase === "today" ? "Majlis Hari Ini" : "");
    if (countdownStatus) {
      // The visible hero status announces date changes; seconds remain silent.
      countdownStatus.setAttribute("aria-live", "off");
      countdownStatus.removeAttribute("role");
      setText("countdownStatus", phase === "today"
        ? "Kami menantikan kehadiran anda. " + (config?.event?.timeText || "Selamat datang.")
        : phase === "upcoming" ? "Persiapan menuju hari bahagia sedang berjalan." : "");
    }
  }

  if (phase !== "upcoming") {
    return;
  }
  const diff = Math.max(eventStart - now, 0);
  const values = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
  countdownIds.forEach(id => setText(id, id === "days" ? values[id] : pad(values[id])));
};

const toggleAudio = async () => {
  if (!audioEnabled || !audioToggle || !bgAudio) {
    return;
  }

  if (!bgAudio.currentSrc) {
    setAudioVisual("missing");
    return;
  }

  if (bgAudio.paused) {
    audioShouldPlay = true;
    await tryPlayAudio("user");
    return;
  }

  audioShouldPlay = false;
  bgAudio.pause();
  setAudioVisual("off");
};

const openInvitation = async () => {
  document.body.classList.add("opened");
  setInteractive(invitation, true);
  setInteractive(floatingActions, true);
  initFlowerRain();
  startWishRotation?.();
  startGalleryAutoplay?.();
  if (rsvpIsEnabled()) {
    void loadRsvpData();
  }

  if (btn) {
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      btn.hidden = true;
    }, 300);
  }

  window.setTimeout(() => invitationTitle?.focus(), 100);

  if (audioEnabled && bgAudio) {
    audioShouldPlay = true;
    const isPlaying = await tryPlayAudio("user");
    if (!isPlaying) {
      audioShouldPlay = false;
    }
  }
};

if (audioToggle) {
  setHidden(audioToggle, !audioEnabled);
}

if (audioEnabled && bgAudio) {
  bgAudio.loop = true;
  bgAudio.preload = "metadata";
}

setInteractive(invitation, false);
setInteractive(floatingActions, false);
applyConfig();
updateCountdown();
setInterval(updateCountdown, 1000);
if (audioEnabled) {
  setAudioVisual("off");
}

if (btn) {
  btn.addEventListener("click", openInvitation, { once: true });
}

if (audioEnabled && audioToggle) {
  audioToggle.addEventListener("click", toggleAudio);
}

if (audioEnabled && bgAudio) {
  bgAudio.addEventListener("pause", () => {
    if (!audioShouldPlay) {
      return;
    }

    clearTimeout(audioResumeTimer);
    audioResumeTimer = setTimeout(async () => {
      if (audioShouldPlay && bgAudio.paused) {
        await tryPlayAudio("auto");
      }
    }, 350);
  });

  bgAudio.addEventListener("error", () => {
    audioShouldPlay = false;
    setAudioVisual("missing");
  });
}

document.addEventListener("visibilitychange", async () => {
  if (!audioEnabled || !bgAudio || !audioShouldPlay || document.hidden || !bgAudio.paused) {
    return;
  }
  await tryPlayAudio("auto");
});

window.addEventListener("focus", async () => {
  if (audioEnabled && audioShouldPlay) {
    await tryPlayAudio("auto");
  }
});

const shareMessage =
  "Jemputan majlis perkahwinan " +
  getCoupleNames(config?.couple || {}).join(" & ") +
  " pada " +
  (config?.event?.dateText || "tarikh majlis") +
  " di " +
  (config?.event?.venue || "lokasi majlis") +
  ".";

const getShareUrl = () => {
  try {
    const canonical = new URL(config?.metadata?.url || "", window.location.href);
    if (config?.metadata?.url && ["https:", "http:"].includes(canonical.protocol)) {
      return canonical.href;
    }
  } catch (error) {
    // Use this invitation's clean URL when metadata has no valid canonical URL.
  }
  const current = new URL(window.location.href);
  current.search = "";
  current.hash = "";
  return current.href;
};

const fallbackShare = async () => {
  const shareUrl = getShareUrl();
  const textToCopy = shareMessage + " " + shareUrl;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
      setText("shareStatus", "Pautan jemputan telah disalin.");
      if (shareInvite) {
        shareInvite.title = "Link disalin";
        shareInvite.setAttribute("aria-label", "Link jemputan disalin");
        shareInvite.classList.add("is-copied");
        setTimeout(() => {
          shareInvite.title = "Kongsi jemputan";
          shareInvite.setAttribute("aria-label", "Kongsi jemputan");
          shareInvite.classList.remove("is-copied");
          setText("shareStatus", "");
        }, 1500);
      }
      return;
    }
  } catch (error) {
    // Continue to the WhatsApp fallback below.
  }

  const waUrl = "https://wa.me/?text=" + encodeURIComponent(textToCopy);
  window.open(waUrl, "_blank", "noopener,noreferrer");
};

if (shareInvite) {
  shareInvite.title = "Kongsi jemputan";
  shareInvite.addEventListener("click", async () => {
    const shareData = {
      title: config?.metadata?.title || "Jemputan Walimatul Urus",
      text: shareMessage,
      url: getShareUrl(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setText("shareStatus", "Jemputan telah dikongsi.");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") {
          return;
        }
      }
    }

    await fallbackShare();
  });
}

if (openRsvpDialog) {
  openRsvpDialog.addEventListener("click", openRsvpForm);
}

if (closeRsvpDialog) {
  closeRsvpDialog.addEventListener("click", closeRsvpForm);
}

if (cancelRsvp) {
  cancelRsvp.addEventListener("click", closeRsvpForm);
}

if (rsvpDialog) {
  rsvpDialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeRsvpForm();
  });
  rsvpDialog.addEventListener("close", () => openRsvpDialog?.focus());
}

if (guestWishes) {
  guestWishes.addEventListener("input", updateWishCount);
  updateWishCount();
}

if (rsvpForm) {
  rsvpForm.addEventListener("change", updateGuestCountField);
  updateGuestCountField();

  rsvpForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (rsvpSubmitting) {
      return;
    }

    if (!rsvpIsEnabled()) {
      setRsvpStatus("RSVP tidak tersedia buat masa ini. Sila hubungi penganjur.");
      return;
    }

    if (!rsvpForm.checkValidity()) {
      rsvpForm.reportValidity();
      return;
    }

    const attendance = rsvpForm.querySelector('input[name="attendanceStatus"]:checked')?.value;
    const submitButton = document.getElementById("rsvpSubmitText");
    const payload = {
      name: document.getElementById("guestName")?.value?.trim() || "",
      attendance,
      guestCount: attendance === "hadir" ? Number(guestCount?.value || 0) : 0,
      wish: guestWishes?.value?.trim() || "",
      website: document.getElementById("guestWebsite")?.value || "",
      formStartedAt: rsvpFormStartedAt,
    };

    rsvpSubmitting = true;
    rsvpForm.setAttribute("aria-busy", "true");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menghantar…";
    }
    setRsvpStatus("Menghantar RSVP anda…");

    try {
      const data = await requestRsvp({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const hasWish = Boolean(payload.wish);
      const pendingWish = data.wishStatus === "pending" && hasWish;
      rsvpForm.reset();
      updateGuestCountField();
      updateWishCount();
      rsvpFormStartedAt = Date.now();
      const successMessage = pendingWish
        ? "Terima kasih. RSVP diterima; ucapan anda akan dipaparkan selepas semakan penganjur."
        : hasWish
          ? "Terima kasih. RSVP diterima dan ucapan anda kini dipaparkan."
          : "Terima kasih. RSVP anda telah diterima.";
      setRsvpStatus(successMessage);
      const successPanel = document.getElementById("rsvpSuccess");
      if (successPanel) {
        const attendanceText = payload.attendance === "hadir"
          ? "Hadir, " + payload.guestCount + " orang."
          : "Tidak hadir.";
        setText("rsvpSuccessText", payload.name + " — " + attendanceText + " " + successMessage);
        setHidden(rsvpForm, true);
        setHidden(successPanel, false);
        successPanel.setAttribute("tabindex", "-1");
        if (rsvpDialog?.open) {
          successPanel.focus();
        }
      }
      await loadRsvpData({ refresh: true });
    } catch (error) {
      const status = error?.status;
      const message =
        error?.publicMessage
          ? error.publicMessage
          : status === 429
          ? "Terlalu banyak cubaan. Sila tunggu sebentar sebelum menghantar semula."
          : status === 503
            ? "Sistem RSVP belum tersedia. Maklumat anda dikekalkan; sila cuba lagi kemudian."
            : "Status penghantaran belum dapat disahkan. Maklumat anda dikekalkan. Semak dengan penganjur sebelum menghantar semula untuk mengelakkan RSVP berulang.";
      setRsvpStatus(message);
    } finally {
      rsvpSubmitting = false;
      rsvpForm.setAttribute("aria-busy", "false");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Hantar RSVP & Ucapan";
      }
    }
  });
}

if (reloadRsvpData) {
  reloadRsvpData.addEventListener("click", () => {
    loadRsvpData();
  });
}

if (audioWatchdogTimer) {
  clearInterval(audioWatchdogTimer);
}
if (audioEnabled) {
  audioWatchdogTimer = setInterval(async () => {
    if (!audioShouldPlay || !bgAudio || document.hidden || !bgAudio.paused) {
      return;
    }
    await tryPlayAudio("auto");
  }, 4000);
}
