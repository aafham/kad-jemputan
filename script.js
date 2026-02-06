const btn = document.getElementById("btn");
const countdownIds = ["days", "hours", "minutes", "seconds"];
const countdownStatus = document.getElementById("countdownStatus");
const audioToggle = document.getElementById("audioToggle");
const bgAudio = document.getElementById("bgAudio");
const rsvpForm = document.getElementById("rsvpForm");
const shareInvite = document.getElementById("shareInvite");
const audioIcon = audioToggle ? audioToggle.querySelector(".fab-icon") : null;
const shareIcon = shareInvite ? shareInvite.querySelector(".fab-icon") : null;

if (bgAudio) {
  bgAudio.loop = true;
}

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

  if (audioIcon) {
    audioIcon.textContent = state === "on" ? "♫" : "♪";
  }
};

if (btn) {
  btn.onclick = async () => {
    document.body.classList.add("opened");
    btn.style.opacity = "0";
    btn.style.pointerEvents = "none";

    if (bgAudio) {
      try {
        await bgAudio.play();
        setAudioVisual("on");
      } catch (error) {
        setAudioVisual("blocked");
      }
    }
  };
}

const eventDate = new Date("2026-08-20T11:00:00").getTime();

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
    try {
      await bgAudio.play();
      setAudioVisual("on");
    } catch (error) {
      setAudioVisual("blocked");
    }
    return;
  }

  bgAudio.pause();
  setAudioVisual("off");
};

if (audioToggle) {
  audioToggle.addEventListener("click", toggleAudio);
}

if (bgAudio) {
  bgAudio.addEventListener("error", () => {
    setAudioVisual("missing");
  });
}

const shareMessage =
  "Jemputan Walimatul Urus Afham & Pasangan pada 20 Ogos 2026 di Dewan Seri Indah.";

const fallbackShare = async () => {
  const shareUrl = window.location.href;
  const textToCopy = shareMessage + " " + shareUrl;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
      if (shareInvite) {
        shareInvite.title = "Link disalin";
        shareInvite.setAttribute("aria-label", "Link disalin");
        if (shareIcon) {
          shareIcon.textContent = "✓";
        }
        setTimeout(() => {
          shareInvite.title = "Share jemputan";
          shareInvite.setAttribute("aria-label", "Share jemputan");
          if (shareIcon) {
            shareIcon.textContent = "⇪";
          }
        }, 1500);
      }
      return;
    }
  } catch (error) {
    // Fallback continues to WhatsApp URL below.
  }

  const waUrl =
    "https://wa.me/?text=" + encodeURIComponent(textToCopy);
  window.open(waUrl, "_blank", "noopener");
};

if (shareInvite) {
  shareInvite.addEventListener("click", async () => {
    const shareData = {
      title: "Jemputan Walimatul Urus Afham & Pasangan",
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

    const message = [
      "Assalamualaikum, saya ingin RSVP majlis Walimatul Urus Afham & Pasangan.",
      "Nama: " + name,
      "Jumlah hadir: " + count,
      "Ucapan: " + wishes,
    ].join("\n");

    const url =
      "https://wa.me/60134747876?text=" + encodeURIComponent(message);

    window.open(url, "_blank", "noopener");
  });
}

updateCountdown();
setInterval(updateCountdown, 1000);
setAudioVisual("off");
