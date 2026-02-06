const config = window.invitationConfig || {};

const btn = document.getElementById("btn");
const countdownIds = ["days", "hours", "minutes", "seconds"];
const countdownStatus = document.getElementById("countdownStatus");
const audioToggle = document.getElementById("audioToggle");
const bgAudio = document.getElementById("bgAudio");
const rsvpForm = document.getElementById("rsvpForm");
const shareInvite = document.getElementById("shareInvite");
const flowerLayer = document.getElementById("flowerLayer");
let audioShouldPlay = false;
let audioResumeTimer = null;
let audioWatchdogTimer = null;

if (bgAudio) {
  bgAudio.loop = true;
  bgAudio.preload = "auto";
}

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el && value) {
    el.textContent = value;
  }
};

const setAudioVisual = state => {
  if (!audioToggle) {
    return;
  }

  const labelMap = {
    on: "Audio ON",
    off: "Audio OFF",
    blocked: "Audio blocked oleh browser",
    missing: "Fail audio tiada",
  };

  audioToggle.dataset.state = state;
  audioToggle.title = labelMap[state] || "Toggle audio";
  audioToggle.setAttribute("aria-label", labelMap[state] || "Toggle audio");
  audioToggle.classList.toggle("is-on", state === "on");
};

const tryPlayAudio = async (source = "manual") => {
  if (!bgAudio || !audioShouldPlay) {
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
    if (source === "user") {
      setAudioVisual("blocked");
    }
    return false;
  }
};

const applyConfig = () => {
  const couple = config.couple || {};
  const event = config.event || {};
  const family = config.family || {};
  const groomSide = family.groomSide || {};
  const brideSide = family.brideSide || {};
  const dressCode = config.dressCode || {};
  const map = config.map || {};
  const contact = config.contact || {};

  setText("openGroom", couple.groom);
  setText("openBride", couple.bride);
  setText("heroGroom", couple.groom);
  setText("heroBride", couple.bride);
  setText("sealText", couple.monogram);
  setText("eventTitle", event.title ? event.title.toUpperCase() : "");
  setText("eventDateText", event.dateText);
  setText("chipTime", event.timeText);
  setText("chipVenue", event.venue);
  setText("quoteText", config.quote);

  setText("groomFamilyLabel", groomSide.label);
  setText("groomFather", groomSide.father);
  setText("groomMother", groomSide.mother);
  setText("brideFamilyLabel", brideSide.label);
  setText("brideFather", brideSide.father);
  setText("brideMother", brideSide.mother);

  setText("infoVenue", event.venue ? "Lokasi: " + event.venue : "");
  setText("infoTime", event.timeText ? "Masa: " + event.timeText : "");
  setText("dressCodeText", dressCode.text);

  const mapQuery = encodeURIComponent(map.query || event.venue || "");
  const googleMapsUrl = "https://www.google.com/maps/search/?api=1&query=" + mapQuery;
  const wazeUrl = "https://waze.com/ul?q=" + mapQuery + "&navigate=yes";

  const googleMapsLink = document.getElementById("googleMapsLink");
  const googleMapsBtn = document.getElementById("googleMapsBtn");
  const wazeBtn = document.getElementById("wazeBtn");
  const mapImage = document.getElementById("mapImage");
  const qrImage = document.getElementById("qrImage");

  if (googleMapsLink) {
    googleMapsLink.href = googleMapsUrl;
  }
  if (googleMapsBtn) {
    googleMapsBtn.href = googleMapsUrl;
  }
  if (wazeBtn) {
    wazeBtn.href = wazeUrl;
  }
  if (mapImage && map.image) {
    mapImage.src = map.image;
  }
  if (qrImage) {
    qrImage.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
      encodeURIComponent(googleMapsUrl);
  }

  const swatchRoot = document.getElementById("dressSwatches");
  if (swatchRoot && Array.isArray(dressCode.colors) && dressCode.colors.length > 0) {
    swatchRoot.innerHTML = "";
    dressCode.colors.forEach(color => {
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.setProperty("--swatch", color.hex || "#eee");
      swatch.textContent = color.name || "Color";
      swatchRoot.appendChild(swatch);
    });
  }

  const galleryRoot = document.getElementById("galleryGrid");
  if (galleryRoot && Array.isArray(config.gallery)) {
    galleryRoot.innerHTML = "";
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
      img.addEventListener("error", () => {
        if (map.image && img.src !== map.image) {
          img.src = map.image;
          return;
        }
        figure.style.display = "none";
      });

      figure.appendChild(img);
      galleryRoot.appendChild(figure);
    });
  }

  const coupleText = [couple.groom, couple.bride].filter(Boolean).join(" & ");
  const waText =
    "Assalamualaikum, saya ingin RSVP majlis " +
    (event.title || "") +
    " " +
    coupleText +
    ".";
  const waNo = contact.whatsapp || "";

  const whatsappDirectBtn = document.getElementById("whatsappDirectBtn");
  if (whatsappDirectBtn && waNo) {
    whatsappDirectBtn.href =
      "https://wa.me/" + waNo + "?text=" + encodeURIComponent(waText);
  }

  if (event.title && coupleText) {
    document.title = event.title + " " + coupleText;
  }
};

applyConfig();

const initFlowerRain = () => {
  if (!flowerLayer) {
    return;
  }

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

initFlowerRain();

const eventDate = new Date(config?.event?.dateTime || "2026-08-20T11:00:00").getTime();

const pad = value => String(value).padStart(2, "0");

const updateCountdown = () => {
  const now = Date.now();
  const rawDiff = eventDate - now;
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
      el.innerText = id === "days" ? values[id] : pad(values[id]);
    }
  });

  if (countdownStatus) {
    countdownStatus.textContent =
      rawDiff <= 0
        ? "Majlis sedang berlangsung. Selamat datang."
        : "Persiapan menuju hari bahagia sedang berjalan.";
  }
};

const toggleAudio = async () => {
  if (!audioToggle || !bgAudio) {
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

if (btn) {
  btn.onclick = async () => {
    document.body.classList.add("opened");
    btn.style.opacity = "0";
    btn.style.pointerEvents = "none";

    if (bgAudio) {
      audioShouldPlay = true;
      const ok = await tryPlayAudio("user");
      if (!ok) {
        audioShouldPlay = false;
      }
    }
  };
}

if (audioToggle) {
  audioToggle.addEventListener("click", toggleAudio);
}

if (bgAudio) {
  bgAudio.addEventListener("pause", () => {
    if (!audioShouldPlay) {
      return;
    }

    clearTimeout(audioResumeTimer);
    audioResumeTimer = setTimeout(async () => {
      if (!audioShouldPlay || !bgAudio.paused) {
        return;
      }
      await tryPlayAudio("auto");
    }, 350);
  });

  bgAudio.addEventListener("ended", async () => {
    if (!audioShouldPlay) {
      return;
    }
    bgAudio.currentTime = 0;
    await tryPlayAudio("auto");
  });

  bgAudio.addEventListener("error", () => {
    audioShouldPlay = false;
    setAudioVisual("missing");
  });
}

document.addEventListener("visibilitychange", async () => {
  if (!bgAudio || !audioShouldPlay || document.hidden || !bgAudio.paused) {
    return;
  }
  await tryPlayAudio("auto");
});

window.addEventListener("focus", async () => {
  if (!audioShouldPlay) {
    return;
  }
  await tryPlayAudio("auto");
});

window.addEventListener("pageshow", async () => {
  if (!audioShouldPlay) {
    return;
  }
  await tryPlayAudio("auto");
});

const shareMessage =
  "Jemputan Walimatul Urus " +
  [config?.couple?.groom, config?.couple?.bride].filter(Boolean).join(" & ") +
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
        shareInvite.setAttribute("aria-label", "Link disalin");
        shareInvite.classList.add("is-copied");
        setTimeout(() => {
          shareInvite.title = "Share jemputan";
          shareInvite.setAttribute("aria-label", "Share jemputan");
          shareInvite.classList.remove("is-copied");
        }, 1500);
      }
      return;
    }
  } catch (error) {
    // Fallback continues to WhatsApp URL below.
  }

  const waUrl = "https://wa.me/?text=" + encodeURIComponent(textToCopy);
  window.open(waUrl, "_blank", "noopener");
};

if (shareInvite) {
  shareInvite.addEventListener("click", async () => {
    const shareData = {
      title: "Jemputan Walimatul Urus",
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

if (rsvpForm) {
  rsvpForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("guestName")?.value?.trim() || "Tetamu";
    const count = document.getElementById("guestCount")?.value || "1";
    const wishes = document.getElementById("guestWishes")?.value?.trim() || "-";

    const waNo = config?.contact?.whatsapp || "";
    const coupleText = [config?.couple?.groom, config?.couple?.bride]
      .filter(Boolean)
      .join(" & ");

    const message = [
      "Assalamualaikum, saya ingin RSVP majlis " + (config?.event?.title || "") + " " + coupleText + ".",
      "Nama: " + name,
      "Jumlah hadir: " + count,
      "Ucapan: " + wishes,
    ].join("\n");

    const url = "https://wa.me/" + waNo + "?text=" + encodeURIComponent(message);

    window.open(url, "_blank", "noopener");
  });
}

updateCountdown();
setInterval(updateCountdown, 1000);
setAudioVisual("off");
if (shareInvite) {
  shareInvite.title = "Share jemputan";
}

if (audioWatchdogTimer) {
  clearInterval(audioWatchdogTimer);
}
audioWatchdogTimer = setInterval(async () => {
  if (!audioShouldPlay || !bgAudio || document.hidden) {
    return;
  }
  if (bgAudio.paused) {
    await tryPlayAudio("auto");
  }
}, 4000);
