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

let audioShouldPlay = false;
let audioResumeTimer = null;
let audioWatchdogTimer = null;
let flowersInitialized = false;
let rsvpFormStartedAt = Date.now();
let rsvpDataLoading = false;
let wishRotationTimer = null;
let wishFadeTimer = null;
let wishRotationRun = 0;
let startWishRotation = null;

document.body.classList.add("js-enabled");

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.textContent = value;
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
  const gallerySection = document.getElementById("gallerySection");
  const previousButton = document.getElementById("galleryPrev");
  const nextButton = document.getElementById("galleryNext");
  const controls = document.getElementById("galleryControls");
  const indexStatus = document.getElementById("galleryIndex");
  const cards = [];
  let activeIndex = 0;
  let pointerStart = null;
  let touchStart = null;
  let mouseStart = null;
  let lastPointerEventAt = 0;
  let lastTouchEventAt = 0;
  let suppressClickUntil = 0;

  galleryRoot.replaceChildren();

  const updateCarousel = () => {
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

      const isVisible = position !== "is-hidden";
      figure.classList.add(position);
      figure.setAttribute("aria-hidden", String(!isVisible));
      figure.dataset.position = position.replace("is-", "");
    });

    if (indexStatus) {
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
      }
    });

    cards.push(figure);
    galleryRoot.appendChild(figure);
  });

  const moveCarousel = direction => {
    if (cards.length < 2) {
      return;
    }
    activeIndex = normaliseGalleryIndex(activeIndex + direction, cards.length);
    updateCarousel();
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
    } else if (event.key === "End") {
      event.preventDefault();
      activeIndex = Math.max(cards.length - 1, 0);
      updateCarousel();
    }
  };

  galleryRoot.onpointerdown = event => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }
    lastPointerEventAt = Date.now();
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
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (error) {
      // No action needed when pointer capture was not set.
    }
  };

  galleryRoot.onpointercancel = () => {
    pointerStart = null;
    lastPointerEventAt = Date.now();
  };

  galleryRoot.ontouchstart = event => {
    if (Date.now() - lastPointerEventAt < 700) {
      return;
    }
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
  };

  galleryRoot.ontouchcancel = () => {
    touchStart = null;
    lastTouchEventAt = Date.now();
  };

  galleryRoot.onmousedown = event => {
    if (event.button !== 0 || Date.now() - lastPointerEventAt < 700 || Date.now() - lastTouchEventAt < 700) {
      return;
    }
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
  return typeof endpoint === "string" && endpoint.startsWith("/") ? endpoint : "/api/rsvp";
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
  const publicWishes = Array.isArray(wishes)
    ? wishes.filter(item => typeof item?.wish === "string" && item.wish.trim())
    : [];

  if (publicWishes.length === 0) {
    wishesList.setAttribute("aria-live", "polite");
    wishesList.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada ucapan dipaparkan. Jadilah yang pertama mengirimkan doa.";
    wishesList.appendChild(empty);
    return;
  }

  const totalPages = Math.ceil(publicWishes.length / WISHES_PER_PAGE);
  let pageIndex = 0;
  const rotationRun = ++wishRotationRun;
  const showPage = () => {
    const start = pageIndex * WISHES_PER_PAGE;
    wishesList.replaceChildren(...publicWishes.slice(start, start + WISHES_PER_PAGE).map(createWishCard));
  };

  wishesList.setAttribute("aria-live", totalPages > 1 ? "off" : "polite");
  showPage();

  const reduceMotion =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (totalPages < 2 || reduceMotion) {
    return;
  }

  const scheduleNextPage = () => {
    wishRotationTimer = window.setTimeout(() => {
      if (wishRotationRun !== rotationRun) {
        return;
      }
      if (document.hidden) {
        scheduleNextPage();
        return;
      }

      wishesList.classList.add("is-fading");
      wishFadeTimer = window.setTimeout(() => {
        if (wishRotationRun !== rotationRun) {
          return;
        }
        pageIndex = (pageIndex + 1) % totalPages;
        showPage();
        requestAnimationFrame(() => {
          if (wishRotationRun !== rotationRun) {
            return;
          }
          wishesList.classList.remove("is-fading");
          scheduleNextPage();
        });
      }, WISH_FADE_DURATION);
    }, WISH_ROTATION_DELAY);
  };

  const beginRotation = () => {
    if (wishRotationRun !== rotationRun) {
      return;
    }
    startWishRotation = null;
    wishesList.classList.add("wishes-list--rotating");
    scheduleNextPage();
  };

  if (document.body.classList.contains("opened")) {
    beginRotation();
  } else {
    startWishRotation = beginRotation;
  }
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

const loadRsvpData = async () => {
  if (!rsvpIsEnabled() || rsvpDataLoading) {
    return;
  }

  rsvpDataLoading = true;
  setRsvpDataBusy(true);
  setHidden(reloadRsvpData, true);

  try {
    const response = await fetch(getRsvpEndpoint(), {
      headers: { Accept: "application/json" },
    });
    const data = await getJsonResponse(response);

    if (!response.ok || !data?.ok) {
      const error = new Error("RSVP data unavailable");
      error.status = response.status;
      throw error;
    }

    renderAttendanceSummary(data.summary);
    renderWishes(data.wishes);
    setRsvpDataStatus("");
  } catch (error) {
    const isUnavailable = error?.status === 503;
    const isRateLimited = error?.status === 429;
    setRsvpDataStatus(
      isUnavailable
        ? "Sistem RSVP sedang disediakan. Sila hubungi penganjur jika perlu."
        : isRateLimited
          ? "Terlalu banyak permintaan. Sila cuba semula sebentar lagi."
          : "Tidak dapat memuatkan RSVP sekarang. Sila cuba semula.",
      "error"
    );
    renderWishesError();
    setHidden(reloadRsvpData, false);
  } finally {
    rsvpDataLoading = false;
    setRsvpDataBusy(false);
  }
};

const openRsvpForm = () => {
  if (!rsvpDialog) {
    return;
  }

  rsvpFormStartedAt = Date.now();
  setRsvpStatus("");
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

  if (!grid || Number.isNaN(eventDate.getTime())) {
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

  const year = eventDate.getUTCFullYear();
  const month = eventDate.getUTCMonth();
  const day = eventDate.getUTCDate();
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
      cell.setAttribute("aria-label", "Tarikh majlis: " + dateFormatter.format(eventDate));
    } else {
      cell.setAttribute("aria-label", String(date));
    }

    grid.appendChild(cell);
  }
};

const renderSchedule = schedule => {
  const scheduleRoot = document.getElementById("scheduleList");
  if (!scheduleRoot || !Array.isArray(schedule) || schedule.length === 0) {
    return;
  }

  scheduleRoot.replaceChildren();
  schedule.forEach(item => {
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

const appendNamePair = (root, names, tagName) => {
  const people = Array.isArray(names) ? names.filter(Boolean) : [];

  people.forEach((person, index) => {
    const name = document.createElement(tagName);
    name.className = "name-pair-line";
    name.textContent = person;
    root.appendChild(name);

    if (people.length === 2 && index === 0) {
      const separator = document.createElement(tagName);
      separator.className = "name-pair-separator";
      separator.textContent = "&";
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

    appendNamePair(card, host.people, "p");

    familyRoot.appendChild(card);
  });
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
  const contacts = Array.isArray(people) ? people.filter(Boolean) : [];

  setHidden(contactSection, contacts.length === 0);
  if (!contactRoot || contacts.length === 0) {
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
  setText("eventDateText", event.dateText);
  setText("hijriDateText", event.hijriDate || "");
  setText("heroTime", event.timeText ? "Masa: " + event.timeText : "");
  setText("quoteHeading", invitation.heading || "Jemputan");
  setText("bismillahText", invitation.bismillah || "");
  setText("pantunText", invitation.pantun || config.quote || "");
  setText("quoteText", invitation.intro || "");
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

  const mapQuery = encodeURIComponent(map.query || event.address || event.venue || "");
  const googleMapsUrl = map.googleMapsUrl || "https://www.google.com/maps/search/?api=1&query=" + mapQuery;
  const wazeUrl = map.wazeUrl || "https://waze.com/ul?q=" + mapQuery + "&navigate=yes";
  const mapLabel = event.address || event.venue || map.query || "lokasi majlis";

  const googleMapsBtn = document.getElementById("googleMapsBtn");
  const wazeBtn = document.getElementById("wazeBtn");
  const mapPreview = document.getElementById("mapPreview");
  const mapEmbed = document.getElementById("mapEmbed");
  const mapAddress = document.getElementById("mapAddress");

  if (googleMapsBtn) {
    googleMapsBtn.href = googleMapsUrl;
    googleMapsBtn.setAttribute("aria-label", "Buka lokasi " + mapLabel + " di Google Maps (tab baharu)");
  }
  if (wazeBtn) {
    wazeBtn.href = wazeUrl;
    wazeBtn.setAttribute("aria-label", "Buka lokasi " + mapLabel + " di Waze (tab baharu)");
  }
  if (mapEmbed && map.embedUrl) {
    mapEmbed.src = map.embedUrl;
    mapEmbed.title = "Peta pin lokasi " + mapLabel;
  }
  setHidden(mapPreview, !map.embedUrl);
  if (mapAddress) {
    setText(mapAddress, mapLabel ? "Lokasi: " + mapLabel : "");
    setHidden(mapAddress, !mapLabel);
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

  const coupleText = coupleNames.join(" & ");
  if (btn && coupleText) {
    btn.setAttribute("aria-label", "Buka jemputan perkahwinan " + coupleText);
  }
  setText("rsvpSubmitText", "Hantar RSVP & Ucapan");
  const hasRsvp = rsvp.enabled !== false;
  setHidden(document.getElementById("rsvpSection"), !hasRsvp);
  setHidden(document.getElementById("wishesSection"), !hasRsvp);
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
const eventEnd = new Date(config?.event?.endDateTime || config?.event?.dateTime || "").getTime();

const pad = value => String(value).padStart(2, "0");

const updateCountdown = () => {
  const now = Date.now();
  const hasValidStart = Number.isFinite(eventStart);
  const rawDiff = hasValidStart ? eventStart - now : 0;
  const diff = Math.max(rawDiff, 0);

  const values = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };

  countdownIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = id === "days" ? values[id] : pad(values[id]);
    }
  });

  if (countdownStatus) {
    if (!hasValidStart) {
      countdownStatus.textContent = "Tarikh majlis belum ditetapkan.";
    } else if (rawDiff > 0) {
      countdownStatus.textContent = "Persiapan menuju hari bahagia sedang berjalan.";
    } else if (Number.isFinite(eventEnd) && now <= eventEnd) {
      countdownStatus.textContent = "Majlis sedang berlangsung. Selamat datang.";
    } else {
      countdownStatus.textContent = "Majlis telah berlangsung. Terima kasih atas doa dan ingatan anda.";
    }
  }
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
if (rsvpIsEnabled()) {
  loadRsvpData();
}
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

const fallbackShare = async () => {
  const shareUrl = window.location.href;
  const textToCopy = shareMessage + " " + shareUrl;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
      if (shareInvite) {
        shareInvite.title = "Link disalin";
        shareInvite.setAttribute("aria-label", "Link jemputan disalin");
        shareInvite.classList.add("is-copied");
        setTimeout(() => {
          shareInvite.title = "Kongsi jemputan";
          shareInvite.setAttribute("aria-label", "Kongsi jemputan");
          shareInvite.classList.remove("is-copied");
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
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
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

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menghantar…";
    }
    setRsvpStatus("Menghantar RSVP anda…");

    try {
      const response = await fetch(getRsvpEndpoint(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await getJsonResponse(response);

      if (!response.ok || !data?.ok) {
        const error = new Error("RSVP submission failed");
        error.status = response.status;
        throw error;
      }

      const hasWish = Boolean(payload.wish);
      const pendingWish = data.wishStatus === "pending" && hasWish;
      rsvpForm.reset();
      updateGuestCountField();
      updateWishCount();
      rsvpFormStartedAt = Date.now();
      setRsvpStatus(
        pendingWish
          ? "Terima kasih. RSVP diterima; ucapan anda akan dipaparkan selepas semakan penganjur."
          : hasWish
            ? "Terima kasih. RSVP diterima dan ucapan anda kini dipaparkan."
            : "Terima kasih. RSVP anda telah diterima."
      );
      await loadRsvpData();
    } catch (error) {
      const status = error?.status;
      const message =
        status === 429
          ? "Terlalu banyak cubaan. Sila tunggu sebentar sebelum menghantar semula."
          : status === 503
            ? "Sistem RSVP sedang disediakan. Sila hubungi penganjur jika perlu."
            : "RSVP tidak dapat dihantar sekarang. Sila cuba semula.";
      setRsvpStatus(message);
    } finally {
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
