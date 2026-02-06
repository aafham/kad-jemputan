const btn = document.getElementById("btn");
const countdownIds = ["days", "hours", "minutes", "seconds"];
const countdownStatus = document.getElementById("countdownStatus");
const audioToggle = document.getElementById("audioToggle");
const bgAudio = document.getElementById("bgAudio");
const rsvpForm = document.getElementById("rsvpForm");

if (btn) {
  btn.onclick = () => {
    document.body.classList.add("opened");
    btn.style.opacity = "0";
    btn.style.pointerEvents = "none";
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
    audioToggle.textContent = "Audio: Tiada Fail";
    return;
  }

  if (bgAudio.paused) {
    try {
      await bgAudio.play();
      audioToggle.textContent = "Audio: ON";
    } catch (error) {
      audioToggle.textContent = "Audio: Blocked";
    }
    return;
  }

  bgAudio.pause();
  audioToggle.textContent = "Audio: OFF";
};

if (audioToggle) {
  audioToggle.addEventListener("click", toggleAudio);
}

if (bgAudio) {
  bgAudio.addEventListener("error", () => {
    if (audioToggle) {
      audioToggle.textContent = "Audio: Tiada Fail";
    }
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
