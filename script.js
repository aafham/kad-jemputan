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

const renderWishes = wishes => {
  if (!wishesList) {
    return;
  }

  wishesList.replaceChildren();
  const publicWishes = Array.isArray(wishes)
    ? wishes.filter(item => typeof item?.wish === "string" && item.wish.trim())
    : [];

  if (publicWishes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada ucapan dipaparkan. Jadilah yang pertama mengirimkan doa.";
    wishesList.appendChild(empty);
    return;
  }

  publicWishes.forEach(item => {
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
    wishesList.appendChild(card);
  });
};

const renderWishesError = () => {
  if (!wishesList || wishesList.children.length > 0) {
    return;
  }

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

    (Array.isArray(host.people) ? host.people : []).filter(Boolean).forEach(person => {
      const name = document.createElement("p");
      name.textContent = person;
      card.appendChild(name);
    });

    familyRoot.appendChild(card);
  });
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
    const card = document.createElement("div");
    card.className = "contact-card";

    if (person.name) {
      const name = document.createElement("p");
      name.className = "contact-name";
      name.textContent = person.name;
      card.appendChild(name);
    }

    (Array.isArray(person.phones) ? person.phones : []).forEach(phone => {
      const number = cleanWhatsappNumber(phone?.number);
      if (!isValidWhatsappNumber(number)) {
        return;
      }

      const link = document.createElement("a");
      link.href = "https://wa.me/" + number;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = phone.display || number;
      link.setAttribute("aria-label", "WhatsApp " + (person.name || "penganjur") + " di " + link.textContent);
      card.appendChild(link);
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
  const primaryContactName = contact.rsvpName || "penganjur";

  setText("openGroom", coupleNames[0] || "");
  setText("openBride", coupleNames[1] || "");
  setText("heroGroom", coupleNames[0] || "");
  setText("heroBride", coupleNames[1] || "");
  setText("sealText", couple.monogram);
  setText("eventTitle", event.title ? event.title.toUpperCase() : "");
  setText("fullNamesText", (Array.isArray(couple.fullNames) ? couple.fullNames : []).filter(Boolean).join("\n"));
  setText("eventDateText", event.dateText);
  setText("hijriDateText", event.hijriDate || "");
  setText("chipTime", event.timeText);
  setText("chipVenue", event.venue);
  setText("quoteHeading", invitation.heading || "Jemputan");
  setText("bismillahText", invitation.bismillah || "");
  setText("quoteText", invitation.intro || config.quote || "");
  setText("closingText", invitation.closing || "");
  setHidden(document.getElementById("bismillahText"), !invitation.bismillah);
  setHidden(document.getElementById("hijriDateText"), !event.hijriDate);

  renderFamily(family);

  setText("infoVenue", (event.address || event.venue) ? "Lokasi: " + (event.address || event.venue) : "");
  setText("infoTime", event.timeText ? "Masa: " + event.timeText : "");
  setText("infoDressCode", dressCode.shortText ? "Tema: " + dressCode.shortText : "");
  setText("dressCodeText", dressCode.text);
  const hasDressCode = Boolean(dressCode.text || dressCode.shortText || (Array.isArray(dressCode.colors) && dressCode.colors.length));
  setHidden(document.getElementById("infoDressCode"), !hasDressCode);
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
  const mapLabel = event.address || event.venue || "lokasi majlis";

  const googleMapsLink = document.getElementById("googleMapsLink");
  const googleMapsBtn = document.getElementById("googleMapsBtn");
  const wazeBtn = document.getElementById("wazeBtn");
  const mapPreview = document.getElementById("mapPreview");
  const mapEmbed = document.getElementById("mapEmbed");
  const qrImage = document.getElementById("qrImage");

  if (googleMapsLink) {
    googleMapsLink.href = googleMapsUrl;
    googleMapsLink.textContent = map.pinLabel || "Pin lokasi majlis";
    googleMapsLink.setAttribute("aria-label", "Buka pin lokasi " + mapLabel + " di Google Maps (tab baharu)");
  }
  if (googleMapsBtn) {
    googleMapsBtn.href = googleMapsUrl;
  }
  if (wazeBtn) {
    wazeBtn.href = wazeUrl;
  }
  if (mapEmbed && map.embedUrl) {
    mapEmbed.src = map.embedUrl;
    mapEmbed.title = "Peta pin lokasi " + mapLabel;
  }
  setHidden(mapPreview, !map.embedUrl);
  if (qrImage) {
    qrImage.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
      encodeURIComponent(googleMapsUrl);
    qrImage.alt = "Kod QR lokasi " + mapLabel;
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
    galleryRoot.replaceChildren();
    config.gallery.forEach((item, index) => {
      const figure = document.createElement("figure");
      figure.className = "gallery-item";

      const img = document.createElement("img");
      img.className = "gallery-photo";
      img.src = item.src;
      img.alt = item.caption || "Galeri majlis " + (index + 1);
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => figure.remove(), { once: true });

      figure.appendChild(img);
      if (item.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = item.caption;
        figure.appendChild(caption);
      }
      galleryRoot.appendChild(figure);
    });
  }

  renderCalendar(event, calendar);
  renderSchedule(config.schedule);
  renderContacts(contact.people);

  const coupleText = coupleNames.join(" & ");
  const waText =
    "Assalamualaikum, saya ingin bertanya tentang majlis perkahwinan " + coupleText + ".";
  const waNo = cleanWhatsappNumber(contact.whatsapp);

  const whatsappDirectBtn = document.getElementById("whatsappDirectBtn");
  if (whatsappDirectBtn && isValidWhatsappNumber(waNo)) {
    whatsappDirectBtn.href =
      "https://wa.me/" + waNo + "?text=" + encodeURIComponent(waText);
    whatsappDirectBtn.textContent = "Hubungi " + primaryContactName;
    whatsappDirectBtn.setAttribute("aria-label", "Buka WhatsApp " + primaryContactName + " (tab baharu)");
  }
  setHidden(whatsappDirectBtn, !isValidWhatsappNumber(waNo));
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
      phone: document.getElementById("guestPhone")?.value?.trim() || "",
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
