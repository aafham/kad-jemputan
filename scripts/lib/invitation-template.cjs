"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const escapePattern = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function openingTag(html, id) {
  const match = new RegExp(`<([a-z][\\w:-]*)\\b[^>]*\\bid="${escapePattern(id)}"[^>]*>`, "i").exec(html);
  if (!match) throw new Error(`Elemen template tiada: ${id}`);
  return match;
}

function setContent(html, id, content) {
  const match = openingTag(html, id);
  const tags = new RegExp(`<(/?)${match[1]}\\b[^>]*>`, "gi");
  tags.lastIndex = match.index + match[0].length;
  let depth = 1;
  let tag;
  while ((tag = tags.exec(html))) {
    depth += tag[1] ? -1 : 1;
    if (depth === 0) {
      return html.slice(0, match.index + match[0].length) + content + html.slice(tag.index);
    }
  }
  throw new Error(`Tag penutup tiada: ${id}`);
}

function setAttribute(html, id, attribute, value) {
  const match = openingTag(html, id);
  const pattern = new RegExp(`\\s${escapePattern(attribute)}(?:="[^"]*"|='[^']*'|=[^\\s>]+)?(?=\\s|/?>)`, "gi");
  let updated = match[0].replace(pattern, "");
  if (value !== null && value !== undefined && value !== false) {
    updated = updated.replace(/\s*(\/?)>$/, (_, slash) => ` ${attribute}="${escapeHtml(value === true ? "" : value)}"${slash ? " /" : ""}>`);
  }
  return html.slice(0, match.index) + updated + html.slice(match.index + match[0].length);
}

function readConfig(root) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "config.js"), "utf8"), context, { timeout: 1000 });
  if (!context.window.invitationConfig) throw new Error("config.js mesti menetapkan window.invitationConfig.");
  return JSON.parse(JSON.stringify(context.window.invitationConfig));
}

const namesOf = config => {
  const names = Array.isArray(config.couple?.displayNames) ? config.couple.displayNames.filter(Boolean) : [];
  return names.length ? names.slice(0, 2) : [config.couple?.groom, config.couple?.bride].filter(Boolean);
};

function eventDate(value) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?(?:[+-]\d\d:\d\d|Z)$/.test(value || "") || !Number.isFinite(Date.parse(value))) {
    throw new Error("Tarikh perlu format ISO dengan zon masa, contoh 2030-12-21T11:00:00+08:00.");
  }
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || Number(time.slice(0, 2)) > 23) {
    throw new Error("Tarikh atau masa majlis tidak sah.");
  }
  return new Date(value);
}

function timeText(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur", hour: "numeric", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const hour = Number(parts.find(part => part.type === "hour").value);
  const minute = parts.find(part => part.type === "minute").value;
  return `${hour % 12 || 12}.${minute} ${hour < 12 ? "pagi" : hour < 15 ? "tgh." : hour < 19 ? "petang" : "malam"}`;
}

function localAsset(root, value) {
  if (!value) return;
  // Media is served from this project so the existing security policy applies.
  if (/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(value)) throw new Error(`Guna fail media lokal: ${value}`);
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.statSync(resolved, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Fail media tiada atau di luar projek: ${value}`);
  }
}

function resolveConfig(config, root) {
  const names = namesOf(config);
  if (names.length !== 2 || names.some(name => typeof name !== "string" || !name.trim())) {
    throw new Error("Isi kedua-dua nama ringkas pengantin dalam couple.groom dan couple.bride.");
  }
  if (!config.isTemplate || config.event?.dateTime) {
    const start = eventDate(config.event?.dateTime);
    const end = eventDate(config.event?.endDateTime);
    if (end <= start) throw new Error("Masa tamat mesti selepas masa mula.");
    config.event.dateText ||= new Intl.DateTimeFormat("ms-MY", {
      timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(start);
    config.event.timeText ||= `${timeText(start)} - ${timeText(end)}`;
  }
  config.metadata ||= {};
  config.metadata.title ||= `Jemputan Majlis Perkahwinan ${names.join(" & ")}`;
  config.metadata.description ||= `Undangan majlis perkahwinan ${names.join(" dan ")} pada ${config.event.dateText}${config.event.venue ? ` di ${config.event.venue}` : ""}.`;
  if (config.metadata.url) {
    const url = new URL(config.metadata.url);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("metadata.url perlu URL HTTPS kad tanpa query atau kata laluan.");
  }
  if (config.metadata.image) {
    const image = new URL(config.metadata.image);
    if (image.protocol !== "https:") throw new Error("metadata.image perlu URL HTTPS mutlak.");
  }
  localAsset(root, config.cover?.image);
  if (config.audio?.enabled && !config.audio.src) throw new Error("Isi audio.src sebelum mengaktifkan lagu.");
  localAsset(root, config.audio?.src);
  for (const photo of config.gallery || []) localAsset(root, photo.src);
  for (const field of ["googleMapsUrl", "wazeUrl", "embedUrl"]) {
    if (!config.map?.[field]) continue;
    const url = new URL(config.map[field]);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error(`Pautan peta tidak sah: map.${field}`);
    if (field === "embedUrl" && (url.protocol !== "https:" || !["www.google.com", "maps.google.com"].includes(url.hostname))) {
      throw new Error("map.embedUrl perlu pautan embed HTTPS Google Maps.");
    }
  }
  return config;
}

function namePair(names, tag = "span") {
  return (names || []).map(name => `<${tag} class="name-pair-line">${escapeHtml(name)}</${tag}>`)
    .join(`<${tag} class="name-pair-separator" role="img" aria-label="dan">&amp;</${tag}>`);
}

function monogramSvg(names, favicon = false) {
  const initials = names.map(name => Array.from(name.trim())[0].toLocaleUpperCase("ms-MY"));
  if (favicon) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#fbf4e7"/><rect x="4" y="4" width="56" height="56" rx="12" fill="none" stroke="#ad8950"/><text x="32" y="42" text-anchor="middle" font-family="Georgia,serif" font-size="28" fill="#254b49">${initials.map(escapeHtml).join("")}</text></svg>\n`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
<rect width="800" height="800" fill="#fcf8f0"/><rect x="45" y="45" width="710" height="710" rx="330" fill="none" stroke="#ad8950" stroke-width="2"/><rect x="62" y="62" width="676" height="676" rx="320" fill="none" stroke="#d9c4a0"/>
<g fill="none" stroke="#ad8950" stroke-width="2"><path d="M135 560Q65 345 205 175M665 240Q735 455 595 625"/>
<path d="M135 430Q65 395 110 355Q160 365 135 430M145 335Q105 265 155 245Q195 290 145 335M180 225Q155 160 210 145Q235 190 180 225M665 370Q735 405 690 445Q640 435 665 370M655 465Q695 535 645 555Q605 510 655 465M620 575Q645 640 590 655Q565 610 620 575" fill="#eee2ca"/></g>
<g fill="#bf9291"><circle cx="152" cy="194" r="13"/><circle cx="124" cy="223" r="7"/><circle cx="648" cy="606" r="13"/><circle cx="676" cy="577" r="7"/></g>
<text x="400" y="290" text-anchor="middle" font-family="Georgia,serif" font-size="16" letter-spacing="7" fill="#8a704d">WALIMATUL URUS</text>
<text x="400" y="448" text-anchor="middle" font-family="Georgia,serif" font-size="136" fill="#ad8950">${escapeHtml(initials[0])}<tspan font-size="68" font-style="italic"> &amp; </tspan>${escapeHtml(initials[1])}</text>
<path d="M290 520H375M425 520H510" stroke="#c9ac78"/><path d="m400 511 6 9-6 9-6-9Z" fill="#ad8950"/></svg>\n`;
}

function renderHtml(html, config) {
  const names = namesOf(config);
  const texts = {
    coverEyebrow: config.isTemplate ? "Template Kad Jemputan" : "Walimatul Urus",
    pageTitle: config.metadata.title, heroGroom: names[0], heroBride: names[1],
    eventTitle: (config.event.title || "Undangan Majlis Perkahwinan").toUpperCase(),
    eventDateText: config.event.dateText, hijriDateText: config.event.hijriDate || "",
    heroTime: config.isTemplate ? "Masa Majlis" : `Masa: ${config.event.timeText}`, quoteHeading: config.invitation?.heading || "Jemputan",
    bismillahText: config.invitation?.bismillah || "", closingText: config.invitation?.closing || "",
    wishesSubtitle: `Doa dan ucapan daripada tetamu buat ${names.join(" & ")}.`,
    gallerySubtitle: `Detik istimewa ${names.join(" & ")}`, calendarTitle: config.calendar?.title || "Tarikh Majlis",
    calendarHeader: config.event.dateTime ? new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", month: "long", year: "numeric" }).format(new Date(config.event.dateTime)) : "Tarikh Majlis",
    mapAddress: config.event.address || config.event.venue || ""
  };
  for (const [id, value] of Object.entries(texts)) html = setContent(html, id, escapeHtml(value));
  html = setContent(html, "fullNamesText", namePair(config.couple.fullNames));
  html = setContent(html, "familyList", (config.family?.hosts || []).map(host => `<div class="family-card">${host.label ? `<p class="family-title">${escapeHtml(host.label)}</p>` : ""}${namePair(host.people, "p")}</div>`).join(""));
  html = setContent(html, "pantunText", escapeHtml(config.invitation?.pantun || "").replace(/\r?\n/g, "<br>"));
  html = setContent(html, "quoteText", escapeHtml(config.invitation?.intro || ""));
  html = setContent(html, "contactList", (config.contact?.people || []).map(person => `<div class="contact-card"><p class="contact-name">${escapeHtml(person.name)}</p>${(person.phones || []).filter(phone => /^\d{8,15}$/.test(phone.number)).map(phone => `<p><a href="tel:+${phone.number}">Telefon ${escapeHtml(phone.display || phone.number)}</a> · <a href="https://wa.me/${phone.number}" target="_blank" rel="noopener noreferrer">WhatsApp</a></p>`).join("")}</div>`).join(""));
  html = setContent(html, "scheduleList", (config.schedule || []).map(item => `<div class="slot"><span>${escapeHtml(item.time)}</span><span>${escapeHtml(item.title)}</span></div>`).join(""));
  html = setContent(html, "bgAudio", config.audio?.enabled ? `<source src="${escapeHtml(config.audio.src)}" type="audio/mpeg">` : "");
  for (const [id, value] of Object.entries({
    metaDescription: config.metadata.description, metaRobots: config.metadata.robots || "noindex,nofollow",
    ogTitle: config.metadata.title, twitterTitle: config.metadata.title,
    ogDescription: config.metadata.description, twitterDescription: config.metadata.description,
    ogUrl: config.metadata.url, ogImage: config.metadata.image, twitterImage: config.metadata.image,
    ogImageAlt: config.metadata.imageAlt
  })) html = setAttribute(html, id, "content", value || null);
  html = html.replace(/\s*<meta property="og:image:(?:width|height)"[^>]*>/g, "");
  html = setAttribute(html, "canonicalUrl", "href", config.metadata.url || null);
  html = setAttribute(html, "coverImage", "src", config.cover?.image || "assets/images/cover.svg");
  html = setAttribute(html, "coverImage", "width", "800");
  html = setAttribute(html, "coverImage", "height", "800");
  html = setAttribute(html, "mapEmbed", "src", config.map?.enabled !== false && config.map?.embedUrl || null);
  html = setAttribute(html, "mapEmbed", "title", "Peta lokasi majlis");
  const query = encodeURIComponent(config.map?.query || config.event.address || config.event.venue || "");
  html = setAttribute(html, "googleMapsBtn", "href", config.map?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${query}`);
  html = setAttribute(html, "wazeBtn", "href", config.map?.wazeUrl || `https://waze.com/ul?q=${query}&navigate=yes`);
  for (const [id, label] of [["googleMapsBtn", "Google Maps"], ["wazeBtn", "Waze"]]) html = setAttribute(html, id, "aria-label", `Buka lokasi majlis di ${label} (tab baharu)`);
  html = setAttribute(html, "calendarGrid", "aria-label", "Kalendar majlis");
  html = setAttribute(html, "templateBadge", "hidden", config.isTemplate ? null : true);
  html = setAttribute(html, "calendarSection", "hidden", !config.event.dateTime ? true : null);
  html = html.replace(/<a\b([^>]*\bhref="\.\/assets\/calendar\/walimatul-urus\.ics"[^>]*)>/g, (_, attrs) => `<a${attrs.replace(/\s+hidden(?:="[^"]*")?/g, "")}${config.isTemplate ? " hidden" : ""}>`);
  html = setAttribute(html, "locationSection", "hidden", config.map?.enabled === false ? true : null);
  html = setAttribute(html, "quickLocation", "hidden", config.map?.enabled === false ? true : null);
  html = setAttribute(html, "contactSection", "hidden", config.contact?.people?.length ? null : true);
  html = setAttribute(html, "quickContact", "hidden", config.contact?.people?.length ? null : true);
  // Each exported project gets its own endpoint/deployment; disabled defaults never fetch RSVP.
  for (const id of ["rsvpSection", "wishesSection", "quickRsvp"]) html = setAttribute(html, id, "hidden", config.rsvp?.enabled === false ? true : null);
  return html;
}

function calendarText(config) {
  if (config.isTemplate && !config.event.dateTime) return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Kad Jemputan Template//MS\r\nEND:VCALENDAR\r\n";
  const escapeIcs = value => String(value || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const utc = value => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const names = namesOf(config);
  const uid = names.join("-").normalize("NFKD").replace(/[^a-z\d-]/gi, "").toLowerCase() || "majlis";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kad Jemputan Template//MS", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${uid}-${utc(config.event.dateTime)}@${config.metadata.url ? new URL(config.metadata.url).hostname : "kad-jemputan.local"}`,
    `DTSTAMP:${utc(config.event.dateTime)}`, `DTSTART:${utc(config.event.dateTime)}`, `DTEND:${utc(config.event.endDateTime)}`,
    `SUMMARY:${escapeIcs(`Majlis Perkahwinan ${names.join(" & ")}`)}`, `LOCATION:${escapeIcs(config.event.address || config.event.venue)}`,
    `DESCRIPTION:${escapeIcs(config.event.timeText)}`, "END:VEVENT", "END:VCALENDAR"];
  return lines.map(line => {
    let folded = "";
    let size = 0;
    for (const character of line) {
      const bytes = Buffer.byteLength(character);
      if (size + bytes > 75) { folded += "\r\n "; size = 1; }
      folded += character;
      size += bytes;
    }
    return folded;
  }).join("\r\n") + "\r\n";
}

function buildProject(root) {
  const config = resolveConfig(readConfig(root), root);
  const htmlPath = path.join(root, "index.html");
  const html = renderHtml(fs.readFileSync(htmlPath, "utf8"), config);
  // Resolve every output before writing; the source config stays editable and is not overwritten.
  const runtimeConfig = `window.invitationConfig = ${JSON.stringify(config, null, 2)};\n`;
  const images = path.join(root, "assets/images");
  const calendars = path.join(root, "assets/calendar");
  fs.mkdirSync(images, { recursive: true });
  fs.mkdirSync(calendars, { recursive: true });
  fs.writeFileSync(htmlPath, html.replace(/src="config\.js"/, 'src="invitation.generated.js"').replace(/[\t ]+$/gm, ""));
  fs.writeFileSync(path.join(root, "invitation.generated.js"), runtimeConfig);
  fs.writeFileSync(path.join(root, "site-settings.json"), JSON.stringify({ template: config.isTemplate === true }, null, 2) + "\n");
  fs.writeFileSync(path.join(calendars, "walimatul-urus.ics"), calendarText(config));
  fs.writeFileSync(path.join(images, "cover.svg"), monogramSvg(namesOf(config)));
  fs.writeFileSync(path.join(images, "favicon.svg"), monogramSvg(namesOf(config), true));
  return config;
}

module.exports = { buildProject, resolveConfig, renderHtml, calendarText, monogramSvg, readConfig };
