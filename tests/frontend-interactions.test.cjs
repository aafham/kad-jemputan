"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

// Exercise the shipped script with a small DOM and deterministic clocks. No
// request in these tests reaches the live RSVP service or writes to a database.
function createPage({ reducedMotion = false, hover = false, fetch: fetchMock, dateTime } = {}) {
  let elapsed = 0;
  let epoch = Date.parse("2026-10-02T12:00:00Z");
  let nextTimer = 0;
  const timers = new Map();
  const nodes = new Map();
  const requests = [];
  const media = new Map();
  const schedule = (callback, delay = 0, repeat = false) => {
    const id = ++nextTimer;
    timers.set(id, { callback, at: elapsed + delay, delay, repeat });
    return id;
  };
  const flush = async () => {
    for (let index = 0; index < 15; index += 1) await Promise.resolve();
  };

  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, fn) {
      const listeners = this.listeners.get(type) || new Set();
      listeners.add(fn);
      this.listeners.set(type, listeners);
    }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    dispatch(type, event = {}) {
      const value = { target: this, currentTarget: this, preventDefault() {}, ...event };
      const results = [...(this.listeners.get(type) || [])].map(fn => fn(value));
      if (this["on" + type]) results.push(this["on" + type](value));
      return Promise.all(results);
    }
  }
  class Element extends Target {
    constructor(tagName = "div") {
      super();
      this.tagName = tagName;
      this.children = [];
      this.attributes = new Map();
      this.dataset = {};
      this.style = { setProperty() {} };
      this.value = "";
      this.hidden = false;
      this.disabled = false;
      this.textWrites = 0;
      this.ownText = "";
      const names = new Set();
      this.classList = {
        add: (...values) => values.forEach(value => names.add(value)),
        remove: (...values) => values.forEach(value => names.delete(value)),
        contains: value => names.has(value),
        toggle: (value, force) => {
          const on = force === undefined ? !names.has(value) : force;
          if (on) names.add(value); else names.delete(value);
          return on;
        },
      };
    }
    get textContent() { return this.ownText + this.children.map(child => child.textContent).join(""); }
    set textContent(value) {
      this.ownText = String(value);
      this.children = [];
      this.textWrites += 1;
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
    replaceChildren(...children) { this.children = []; this.ownText = ""; this.append(...children); }
    remove() {
      if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    }
    contains(target) { return Boolean(target && (target === this || this.children.some(child => child.contains(target)))); }
    closest(selector) { return selector === ".gallery-carousel" ? this.parentElement : null; }
    matches() { return Boolean(this.focusVisible); }
    querySelector() { return { value: this.attendance || "hadir" }; }
    checkValidity() { return true; }
    reportValidity() {}
    reset() { this.resetCount = (this.resetCount || 0) + 1; }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    setPointerCapture() {}
    releasePointerCapture() {}
  }
  const document = Object.assign(new Target(), {
    body: new Element("body"),
    hidden: false,
    activeElement: null,
    getElementById: id => nodes.get(id) || null,
    createElement: tag => new Element(tag),
    createElementNS: (_, tag) => new Element(tag),
    createTextNode: text => Object.assign(new Element("#text"), { textContent: text }),
  });
  for (const id of [
    "btn", "invitation", "invitationTitle", "floatingActions", "countdownSection", "countdownValues",
    "countdownTitle", "countdownStatus", "eventStatus", "eventStatusText", "days", "hours", "minutes", "seconds",
    "gallerySection", "galleryGrid", "galleryPrev", "galleryNext", "galleryToggle", "galleryControls", "galleryIndex",
    "wishesSection", "wishesList", "wishesControls", "wishesPrev", "wishesNext", "wishesToggle", "wishesPageStatus",
    "rsvpForm", "rsvpStatus", "rsvpDialog", "openRsvpDialog", "closeRsvpDialog", "cancelRsvp", "guestCountField",
    "guestCount", "guestWishes", "wishCount", "attendanceSummary", "rsvpDataStatus", "reloadRsvpData",
    "rsvpSubmitText", "guestName", "guestWebsite", "rsvpSuccess", "rsvpSuccessText", "shareInvite", "shareStatus", "quickRsvp",
    "attendingCount", "notAttendingCount", "guestTotalCount", "mapAddress",
  ]) nodes.set(id, new Element());
  const carousel = new Element();
  carousel.append(...["galleryGrid", "galleryControls"].map(id => nodes.get(id)));
  nodes.get("galleryControls").append(...["galleryPrev", "galleryNext", "galleryToggle"].map(id => nodes.get(id)));
  nodes.get("wishesSection").append(nodes.get("wishesList"), nodes.get("wishesControls"));
  nodes.get("wishesControls").append(...["wishesPrev", "wishesNext", "wishesToggle"].map(id => nodes.get(id)));
  nodes.get("guestCount").value = "2";
  nodes.get("guestName").value = "Tetamu Ujian";
  nodes.get("rsvpSuccess").hidden = true;

  const config = {
    audio: { enabled: false },
    metadata: { url: "https://kad-jemputan.vercel.app/" },
    couple: { displayNames: ["Nabil", "Hani"] },
    event: { dateTime: dateTime === undefined ? "2026-10-03T11:00:00+08:00" : dateTime, timeText: "11.00 pagi - 4.00 petang", address: "Alamat dikemas kini" },
    rsvp: { enabled: true, endpoint: "/api/rsvp" },
    gallery: Array.from({ length: 4 }, (_, index) => ({ src: `photo-${index}.webp`, alt: `Photo ${index}` })),
  };
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [epoch + elapsed])); }
    static now() { return epoch + elapsed; }
  }
  const window = Object.assign(new Target(), {
    invitationConfig: config,
    location: new URL("https://preview.example.test/?debug=1#gallery"),
    isSecureContext: true,
    setTimeout: (fn, delay) => schedule(fn, delay),
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => schedule(fn, 0),
    cancelAnimationFrame: id => timers.delete(id),
    matchMedia: query => {
      if (!media.has(query)) media.set(query, Object.assign(new Target(), { matches: query.includes("reduced-motion") ? reducedMotion : hover }));
      return media.get(query);
    },
    open() {},
  });
  const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
  const context = vm.createContext({
    window, document, Date: FakeDate, Intl, URL, AbortController,
    navigator: { clipboard: { writeText: async text => { window.copiedText = text; } } },
    console,
    fetch: (url, options = {}) => {
      requests.push({ url, options });
      return fetchMock ? fetchMock(url, options, response) : Promise.resolve(response({ ok: true, summary: {}, wishes: [] }));
    },
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: (fn, delay) => schedule(fn, delay, true),
    clearInterval: window.clearTimeout,
    requestAnimationFrame: fn => schedule(fn, 0),
  });
  vm.runInContext(source, context);
  return {
    document, window, nodes, config, requests, carousel, context,
    run: code => vm.runInContext(code, context),
    setDate: date => { epoch = Date.parse(date) - elapsed; },
    flush,
    async advance(duration) {
      const end = elapsed + duration;
      await flush();
      for (;;) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, timer] = next;
        elapsed = timer.at;
        if (timer.repeat) timer.at += timer.delay; else timers.delete(id);
        timer.callback();
        await flush();
      }
      elapsed = end;
      await flush();
    },
  };
}

test("Malaysia date boundaries replace the countdown on the whole wedding day and hide it next day", () => {
  const page = createPage();
  const get = id => page.nodes.get(id);
  for (const [date, phase, hidden, valuesHidden] of [
    ["2026-10-02T15:59:59Z", "upcoming", false, false],
    ["2026-10-02T16:00:00Z", "today", false, true],
    ["2026-10-03T15:59:59Z", "today", false, true],
    ["2026-10-03T16:00:00Z", "ended", true, true],
  ]) {
    page.setDate(date);
    page.run("updateCountdown()");
    assert.equal(get("countdownSection").dataset.phase, phase);
    assert.equal(get("countdownSection").hidden, hidden);
    assert.equal(get("countdownValues").hidden, valuesHidden);
    assert.equal(get("eventStatus").hidden, phase !== "today");
    if (phase === "today") assert.equal(get("countdownTitle").textContent, "Majlis Hari Ini");
  }
  const writes = get("countdownStatus").textWrites;
  page.run("updateCountdown(); updateCountdown()");
  assert.equal(get("countdownStatus").textWrites, writes, "unchanged phases do not re-announce");
  assert.equal(createPage({ dateTime: "" }).nodes.get("countdownSection").hidden, true);
});

test("gallery advances every two seconds, loops, pauses, and resumes after a mobile swipe", async () => {
  const page = createPage();
  const gallery = page.nodes.get("galleryGrid");
  await page.run("openInvitation()");
  await page.advance(2000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "2 / 4");
  page.nodes.get("galleryToggle").onclick();
  await page.advance(6000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "2 / 4");
  page.nodes.get("galleryToggle").onclick();
  page.carousel.onmouseenter(); // Compatibility mouse event generated by touch.
  const pointer = { isPrimary: true, pointerType: "touch", pointerId: 1, currentTarget: gallery, clientY: 10 };
  gallery.onpointerdown({ ...pointer, clientX: 100 });
  gallery.onpointerup({ ...pointer, clientX: 20 });
  assert.equal(page.nodes.get("galleryIndex").textContent, "3 / 4");
  await page.advance(4000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "1 / 4");
  page.document.hidden = true;
  await page.document.dispatch("visibilitychange");
  await page.advance(4000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "1 / 4");
});

test("keyboard focus pauses gallery rotation and reduced motion starts in manual mode", async () => {
  const page = createPage({ reducedMotion: true });
  await page.run("openInvitation()");
  await page.advance(6000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "1 / 4");
  page.nodes.get("galleryNext").onclick();
  assert.equal(page.nodes.get("galleryIndex").textContent, "2 / 4");
  page.nodes.get("galleryToggle").onclick();
  const grid = page.nodes.get("galleryGrid");
  grid.focusVisible = true;
  grid.focus();
  page.carousel.onfocusin();
  await page.advance(6000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "2 / 4");
  page.document.activeElement = null;
  page.carousel.onfocusout();
  await page.advance(2000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "3 / 4");
});

test("touch-focused gallery arrows resume automatically while keyboard-focused arrows stay paused", async () => {
  const page = createPage();
  await page.run("openInvitation()");
  await page.advance(300);
  const next = page.nodes.get("galleryNext");
  await page.document.dispatch("pointerdown", { pointerType: "touch" });
  next.focus();
  page.carousel.onfocusin();
  next.onclick();
  assert.equal(page.nodes.get("galleryIndex").textContent, "2 / 4");
  await page.advance(2000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "3 / 4", "touch focus alone must not hold autoplay");

  await page.document.dispatch("keydown", { key: "Tab" });
  next.focusVisible = true;
  page.carousel.onfocusin();
  next.onclick();
  await page.advance(6000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "4 / 4", "keyboard focus keeps manual browsing stable");
  page.document.activeElement = null;
  page.carousel.onfocusout();
  await page.advance(2000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "1 / 4");
});

test("desktop hover pauses and unsupported focus-visible falls back to the input method", async () => {
  const page = createPage({ hover: true });
  await page.run("openInvitation()");
  await page.advance(300);
  const next = page.nodes.get("galleryNext");
  next.matches = () => { throw new Error("Unsupported selector"); };
  await page.document.dispatch("pointerdown", { pointerType: "mouse" });
  next.focus();
  page.carousel.onmouseenter();
  page.carousel.onfocusin();
  next.onclick();
  await page.advance(6000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "2 / 4", "hover still pauses even though focus came from a pointer");
  page.carousel.onmouseleave();
  await page.advance(2000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "3 / 4");
  await page.document.dispatch("keydown", { key: "Tab" });
  page.carousel.onfocusin();
  await page.advance(6000);
  assert.equal(page.nodes.get("galleryIndex").textContent, "3 / 4", "fallback preserves keyboard focus pause");
});

test("wishes display at most three, rotate after five seconds, loop, and pause on request", async () => {
  const page = createPage();
  page.document.body.classList.add("opened");
  page.context.sampleWishes = Array.from({ length: 7 }, (_, index) => ({ name: `Guest ${index}`, wish: `Wish ${index}` }));
  page.run("renderWishes(sampleWishes)");
  const list = page.nodes.get("wishesList");
  assert.equal(list.children.length, 3);
  await page.advance(4999);
  assert.match(list.textContent, /Wish 0/);
  await page.advance(321);
  assert.match(list.textContent, /Wish 3/);
  await page.advance(5320);
  assert.equal(list.children.length, 1);
  assert.match(list.textContent, /Wish 6/);
  await page.advance(5320);
  assert.match(list.textContent, /Wish 0/);
  page.nodes.get("wishesToggle").onclick();
  await page.advance(11000);
  assert.match(list.textContent, /Wish 0/);
});

test("touch-focused wish arrows resume and keyboard-focused wish arrows pause until blur", async () => {
  const page = createPage();
  page.document.body.classList.add("opened");
  page.context.sampleWishes = Array.from({ length: 4 }, (_, index) => ({ name: "Guest", wish: `Wish ${index}` }));
  page.run("renderWishes(sampleWishes)");
  const next = page.nodes.get("wishesNext");
  const section = page.nodes.get("wishesSection");
  await page.document.dispatch("touchstart");
  next.focus();
  section.onfocusin();
  next.onclick();
  await page.advance(320);
  assert.match(page.nodes.get("wishesList").textContent, /Wish 3/);
  await page.advance(5320);
  assert.match(page.nodes.get("wishesList").textContent, /Wish 0/);
  next.focusVisible = true;
  await page.document.dispatch("keydown", { key: "Tab" });
  section.onfocusin();
  next.onclick();
  await page.advance(6320);
  assert.match(page.nodes.get("wishesList").textContent, /Wish 3/);
  page.document.activeElement = null;
  section.onfocusout();
  await page.advance(5320);
  assert.match(page.nodes.get("wishesList").textContent, /Wish 0/);
});

test("wish pages reserve the tallest page, remeasure on width/font changes, and clear on single-page or empty data", async () => {
  const page = createPage({ reducedMotion: true });
  let width = 320;
  let fontHeight = 1;
  const observers = [];
  let measurements = 0;
  page.window.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  page.document.fonts = {
    listeners: new Set(),
    addEventListener(_, callback) { this.listeners.add(callback); },
    removeEventListener(_, callback) { this.listeners.delete(callback); },
  };
  const list = page.nodes.get("wishesList");
  list.getBoundingClientRect = () => ({ width, height: Number.parseFloat(list.style.minHeight) || 0 });
  const originalCreate = page.document.createElement;
  page.document.createElement = tag => {
    const element = originalCreate(tag);
    element.getBoundingClientRect = () => {
      measurements += 1;
      const height = element.children.reduce((sum, card) => sum + (card.textContent.includes("Long wish") ? 400 : 80), 0);
      return { width, height: height * (320 / width) * fontHeight };
    };
    return element;
  };
  page.context.sampleWishes = ["One", "Two", "Three", "Long wish"].map(wish => ({ name: "Guest", wish }));
  page.run("renderWishes(sampleWishes)");
  assert.equal(list.style.minHeight, "400px", "one long final wish can be taller than three short wishes");
  assert.equal(page.nodes.get("wishesSection").children.length, 2, "temporary measuring element is removed immediately");
  page.nodes.get("wishesNext").onclick();
  assert.equal(list.children.length, 1);
  assert.equal(list.style.minHeight, "400px", "last page keeps the full carousel height");
  const initialMeasurements = measurements;
  observers[0].callback();
  await page.advance(0);
  assert.equal(measurements, initialMeasurements, "height-only observer changes do not trigger a measurement loop");
  width = 240;
  observers[0].callback();
  await page.advance(0);
  assert.equal(list.style.minHeight, "534px");
  fontHeight = 1.2;
  for (const callback of page.document.fonts.listeners) callback();
  await page.advance(0);
  assert.equal(list.style.minHeight, "640px");
  page.run("renderWishes(sampleWishes.slice(0, 1))");
  assert.equal(list.style.minHeight, "");
  assert.equal(observers[0].disconnected, true);
  assert.equal(page.document.fonts.listeners.size, 0);
  page.run("renderWishes(sampleWishes); renderWishes([])");
  assert.equal(list.style.minHeight, "");
  assert.equal(observers[1].disconnected, true);
});

test("reduced-motion users can read every wish manually and stale rotations are removed", async () => {
  const page = createPage({ reducedMotion: true });
  page.document.body.classList.add("opened");
  page.context.sampleWishes = Array.from({ length: 4 }, (_, index) => ({ name: "Guest", wish: `Wish ${index}` }));
  page.run("renderWishes(sampleWishes); renderWishes(sampleWishes)");
  assert.equal(page.nodes.get("wishesControls").hidden, false);
  await page.advance(12000);
  assert.match(page.nodes.get("wishesList").textContent, /Wish 0/);
  page.nodes.get("wishesNext").onclick();
  assert.match(page.nodes.get("wishesList").textContent, /Wish 3/);
  page.nodes.get("wishesPrev").onclick();
  assert.match(page.nodes.get("wishesList").textContent, /Wish 0/);
  page.run("renderWishes([])");
  assert.equal(page.nodes.get("wishesControls").hidden, true);
});

test("RSVP fetch waits for opening and same-origin endpoint validation rejects protocol-relative URLs", async () => {
  const page = createPage();
  assert.equal(page.requests.length, 0);
  for (const endpoint of ["//attacker.example/api", "/\\attacker.example/api", "https://attacker.example/api"]) {
    page.config.rsvp.endpoint = endpoint;
    assert.equal(page.run("getRsvpEndpoint()"), "/api/rsvp");
  }
  await page.run("openInvitation()");
  await page.flush();
  assert.equal(page.requests.length, 1);
  assert.equal(page.nodes.get("mapAddress").textContent, "Lokasi: Alamat dikemas kini");
  page.config.rsvp.enabled = false;
  page.run("applyConfig()");
  assert.equal(page.nodes.get("quickRsvp").hidden, true);
});

test("RSVP double-submit is blocked, success has a summary, and the dialog can be reopened", async () => {
  let releasePost;
  const page = createPage({ fetch: (_, options, response) => options.method === "POST"
    ? new Promise(resolve => { releasePost = () => resolve(response({ ok: true, wishStatus: "published" }, 201)); })
    : Promise.resolve(response({ ok: true, summary: { hadir: 1, tetamuHadir: 2 }, wishes: [] })) });
  const form = page.nodes.get("rsvpForm");
  page.run("openRsvpForm()");
  const first = form.dispatch("submit");
  await form.dispatch("submit");
  assert.equal(page.requests.filter(request => request.options.method === "POST").length, 1);
  assert.equal(page.nodes.get("rsvpSubmitText").disabled, true);
  releasePost();
  await first;
  assert.equal(form.hidden, true);
  assert.equal(page.nodes.get("rsvpSuccess").hidden, false);
  assert.match(page.nodes.get("rsvpSuccessText").textContent, /Tetamu Ujian — Hadir, 2 orang/);
  assert.equal(page.nodes.get("rsvpSubmitText").disabled, false);
  page.run("closeRsvpForm(); openRsvpForm()");
  assert.equal(form.hidden, false);
  assert.equal(page.nodes.get("rsvpSuccess").hidden, true);
});

test("RSVP times out after twelve seconds, preserves the draft, and exposes a working read retry", async () => {
  const page = createPage({ fetch: (_, options) => new Promise((_, reject) => {
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  }) });
  const form = page.nodes.get("rsvpForm");
  const submission = form.dispatch("submit");
  await page.advance(12000);
  await submission;
  assert.equal(page.nodes.get("guestName").value, "Tetamu Ujian");
  assert.equal(form.resetCount, undefined);
  assert.equal(page.nodes.get("rsvpSubmitText").disabled, false);
  assert.match(page.nodes.get("rsvpStatus").textContent, /belum dapat disahkan/);
  const read = page.run("loadRsvpData()");
  await page.advance(12000);
  await read;
  assert.equal(page.nodes.get("reloadRsvpData").hidden, false);
  assert.equal(page.nodes.get("reloadRsvpData").disabled, false);
  assert.match(page.nodes.get("rsvpDataStatus").textContent, /terlalu lama/);
});

test("sharing uses the canonical public URL, never the preview URL or its debug query", async () => {
  const page = createPage();
  await page.run("fallbackShare()");
  assert.match(page.window.copiedText, /https:\/\/kad-jemputan\.vercel\.app\/$/);
  assert.doesNotMatch(page.window.copiedText, /debug|preview/);
  page.config.metadata.url = "";
  assert.equal(page.run("getShareUrl()"), "https://preview.example.test/");
});
