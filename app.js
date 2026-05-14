const CMS_STORAGE_KEY = "WK_CMS_DRAFT";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  const merged = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = deepMerge(base[key], value);
    } else {
      merged[key] = value;
    }
  });
  return merged;
}

function getCmsDraft() {
  try {
    return JSON.parse(localStorage.getItem(CMS_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

const DEFAULT_SITE_DATA = window.WK_SITE_DATA || {};
let data = DEFAULT_SITE_DATA;
const $ = (selector) => document.querySelector(selector);

async function loadContentData() {
  try {
    const response = await fetch(`content/site.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    const contentData = await response.json();
    data = contentData;
  } catch (error) {
    console.warn("Using fallback site data.", error);
  }
}

function parseTime(value, now = new Date()) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatDuration(ms) {
  if (ms <= 0) return "now";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getTodayLocations() {
  if (Array.isArray(data.today.locations) && data.today.locations.length) {
    return [...data.today.locations].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  }

  return [{
    id: "today",
    name: data.today.name,
    shortName: data.today.name,
    address: data.today.address,
    status: data.today.isTradingToday ? "opening-soon" : "private-event",
    statusLabel: data.today.statusOverride || "Opens today",
    open: data.today.open,
    close: data.today.close,
    nextService: data.today.nextService,
    note: data.today.weatherNote,
    lastUpdated: data.today.lastUpdated,
    featured: true,
    sortOrder: 1,
    instagramUrl: "https://www.instagram.com/wandererskneaded/",
    mapUrl: data.today.mapUrl
  }];
}

function getLocationStatus(location, now = new Date()) {
  const hasHours = location.open && location.close;
  const open = hasHours ? parseTime(location.open, now) : null;
  const close = hasHours ? parseTime(location.close, now) : null;
  const baseStatus = location.status || "opening-soon";

  if (baseStatus === "sold-out") {
    return {
      state: "sold-out",
      label: location.statusLabel || "Sold out",
      headline: "Sold out",
      timer: location.nextService ? `Back ${location.nextService}` : "Check Instagram",
      isOpen: false
    };
  }

  if (baseStatus === "private-event") {
    return {
      state: "private-event",
      label: location.statusLabel || "Private event",
      headline: "Private event",
      timer: location.nextService || "Ask for availability",
      isOpen: false
    };
  }

  if (baseStatus === "weather-watch") {
    return {
      state: "weather-watch",
      label: location.statusLabel || "Weather watch",
      headline: "Weather watch",
      timer: location.nextService || location.note || "Check Instagram",
      isOpen: false
    };
  }

  if (!hasHours || baseStatus === "closed") {
    return {
      state: "closed",
      label: location.statusLabel || "Closed today",
      headline: "Closed today",
      timer: location.nextService || "Check Instagram",
      isOpen: false
    };
  }

  if (now < open) {
    const duration = formatDuration(open - now);
    return {
      state: "opening-soon",
      label: `Opens in ${duration}`,
      headline: `Opens in ${duration}`,
      timer: `${location.open} - ${location.close}`,
      isOpen: false
    };
  }

  if (now >= open && now < close) {
    const duration = formatDuration(close - now);
    return {
      state: "open",
      label: "Open now",
      headline: `Open for ${duration} more`,
      timer: `${location.open} - ${location.close}`,
      isOpen: true
    };
  }

  return {
    state: "closed",
    label: "Closed now",
    headline: "Closed for today",
    timer: location.nextService ? `Back ${location.nextService}` : "Check Instagram",
    isOpen: false
  };
}

function getStatus() {
  const now = new Date();
  const locations = getTodayLocations();
  const featured = locations.find((location) => location.featured) || locations[0];
  const status = getLocationStatus(featured, now);
  return {
    open: status.isOpen,
    label: status.label,
    timer: status.headline,
    next: status.headline,
    location: featured
  };
}

function renderLiveStatus() {
  const status = getStatus();
  const locations = getTodayLocations();
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: data.today.timezone || "Europe/London"
  }).format(new Date());
  const primary = status.location;

  $("#statusPill").textContent = status.label;
  $("#statusPill").classList.toggle("is-open", status.open);
  $("#todayLocation").textContent = `${primary.name} - ${primary.address}`;
  $("#todayHours").textContent = primary.open && primary.close ? `${primary.open} - ${primary.close}` : primary.nextService || "Check updates";
  $("#countdown").textContent = status.next;
  $("#localTime").textContent = time;
  $("#todayHeadline").textContent = locations.length > 1 ? "Find us today" : `Find us at ${primary.name}`;
  $("#todayNote").textContent = data.today.intro || "Live pitches, opening times and map links. Fast check before you travel.";
  $("#todayUpdated").textContent = `Last updated ${data.today.lastUpdated || primary.lastUpdated || `Today ${time}`}`;
  $("#lastUpdated").textContent = `Last updated ${primary.lastUpdated || data.today.lastUpdated || time}`;
  $("#mapLink").href = primary.mapUrl || "#today";
  renderTodayCards(locations);
}

function setOptionalLink(link, href) {
  link.href = href || "#today";
  if (href && href.startsWith("#")) {
    link.removeAttribute("target");
    link.removeAttribute("rel");
  } else {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
}

function renderTodayCards(locations) {
  const board = $("#todayLiveGrid");
  if (!board) return;
  board.innerHTML = "";
  const now = new Date();

  locations.forEach((location) => {
    const status = getLocationStatus(location, now);
    const mapHref = location.mapUrl || "#today";
    const mapText = mapHref.startsWith("#") ? "Book event" : "Open map";
    const item = card(`
      <div class="open-sign ${status.state}">
        <span>${status.label}</span>
      </div>
      <h3>${location.name}</h3>
      <p>${location.address}</p>
      <strong>${status.headline}</strong>
      <small>Service: ${location.open && location.close ? `${location.open} - ${location.close}` : location.nextService || "Check updates"}</small>
      <small>Next: ${location.nextService || "Check Instagram"}</small>
      <small>Note: ${location.note || "Weather permitting"}</small>
      <div class="today-card-actions">
        <a class="map-button" href="${mapHref}">${mapText}</a>
        <a class="insta-button" href="${location.instagramUrl || "https://www.instagram.com/wandererskneaded/"}" target="_blank" rel="noreferrer">Instagram</a>
      </div>
    `);
    item.className = `today-location-card ${status.state}`;
    const map = item.querySelector(".map-button");
    if (mapHref.startsWith("#")) map.classList.add("internal-link");
    setOptionalLink(map, mapHref);
    board.appendChild(item);
  });
}

function card(template) {
  const node = document.createElement("article");
  node.innerHTML = template;
  return node;
}

function renderCollections() {
  const services = $("#serviceGrid");
  data.services.forEach((item) => {
    services.appendChild(card(`
      <span>${item.tag}</span>
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    `));
  });

  const events = $("#eventGrid");
  data.eventBenefits.forEach((item) => {
    events.appendChild(card(`
      <span>${item.tag}</span>
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    `));
  });

  const partners = $("#partnerTrack");
  [...data.partners, ...data.partners].forEach((partner) => {
    const pill = document.createElement("span");
    if (partner.logo) {
      const image = document.createElement("img");
      image.src = partner.logo;
      image.alt = partner.name;
      image.loading = "lazy";
      pill.appendChild(image);
    } else {
      pill.textContent = partner.name;
    }
    pill.setAttribute("aria-label", partner.name);
    partners.appendChild(pill);
  });

  const proof = $("#proofGrid");
  data.proof.forEach((item) => {
    proof.appendChild(card(`
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    `));
  });

  const reasons = $("#reasonList");
  data.reasons.forEach((reason, index) => {
    const row = document.createElement("div");
    row.innerHTML = `<span>0${index + 1}</span><p>${reason}</p>`;
    reasons.appendChild(row);
  });

  const menu = $("#menuGrid");
  data.menu.forEach((item) => {
    menu.appendChild(card(`
      <span>${item.label}</span>
      <h3>${item.name}</h3>
      <p>${item.ingredients}</p>
    `));
  });

  const galleryGrid = $("#galleryGrid");
  data.gallery.items.forEach((post) => {
    const item = document.createElement("a");
    item.href = "https://www.instagram.com/wandererskneaded/";
    item.target = "_blank";
    item.rel = "noreferrer";
    item.innerHTML = `
      <img src="${post.image}" alt="${post.title}" loading="lazy" onerror="this.onerror=null;this.src='${post.fallback}'">
      <span><small>${post.category} / ${post.code}</small>${post.title}</span>
    `;
    galleryGrid.appendChild(item);
  });

  const instagramSlot = $("#instagramLiveSlot");
  const instagramGrid = $("#instagramGrid");
  if (instagramGrid && data.instagram.posts) {
    data.instagram.posts.forEach((post) => {
      const item = document.createElement("a");
      item.href = "https://www.instagram.com/wandererskneaded/";
      item.target = "_blank";
      item.rel = "noreferrer";
      item.className = "instagram-tile";
      item.innerHTML = `
        <img src="${post.image}" alt="${post.title}" loading="lazy">
        <span><small>${post.label}</small>${post.title}</span>
      `;
      instagramGrid.appendChild(item);
    });
  }

  if (data.instagram.widgetHtml.trim()) {
    instagramSlot.innerHTML = data.instagram.widgetHtml;
    instagramSlot.classList.add("has-widget");
  } else {
    instagramSlot.innerHTML = `
      <strong>${data.instagram.handle}</strong>
      <span>${data.instagram.fallbackText}</span>
    `;
  }
}

function placeGalleryNearProof() {
  const gallery = document.querySelector("#gallery");
  const instagram = document.querySelector("#instagram");
  const proof = document.querySelector("#proof");
  if (gallery && proof && proof.nextElementSibling !== gallery) {
    proof.insertAdjacentElement("afterend", gallery);
  }
  if (gallery && instagram && gallery.nextElementSibling !== instagram) {
    gallery.insertAdjacentElement("afterend", instagram);
  }
}

function setHeaderState() {
  const header = document.querySelector("[data-elevate]");
  const scrolled = window.scrollY > 20;
  header.classList.toggle("is-scrolled", scrolled);
  document.body.classList.toggle("has-scrolled", window.scrollY > 360);
}

function enableQuoteBrief() {
  const form = $("#quoteForm");
  const status = $("#quoteStatus");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const lines = [
      "Hi Wanderers Kneaded,",
      "",
      "I would like to check availability for an event.",
      "",
      `Name: ${fields.get("name") || ""}`,
      `Phone: ${fields.get("phone") || ""}`,
      `Email: ${fields.get("email") || ""}`,
      `Event type: ${fields.get("eventType") || ""}`,
      `Event date: ${fields.get("eventDate") || "Not confirmed"}`,
      `Venue / postcode: ${fields.get("location") || ""}`,
      `Guest numbers: ${fields.get("guests") || "Not sure yet"}`,
      `Indoor / outdoor: ${fields.get("setting") || ""}`,
      `Power available: ${fields.get("power") || ""}`,
      `Service style: ${fields.get("serviceStyle") || ""}`,
      "",
      "Notes:",
      fields.get("message") || "No extra notes yet.",
      "",
      "Thanks"
    ];

    const subject = `Event enquiry - ${fields.get("eventType") || "Wanderers Kneaded"}`;
    const mailto = `mailto:hello@wandererskneaded.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    status.textContent = "Opening your email app with the quote brief ready to send.";
    window.location.href = mailto;
  });
}

function enableReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.16 });

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

async function init() {
  await loadContentData();
  renderCollections();
  placeGalleryNearProof();
  renderLiveStatus();
  enableQuoteBrief();
  enableReveal();
  setHeaderState();

  setInterval(renderLiveStatus, 30000);
  window.addEventListener("scroll", setHeaderState, { passive: true });
}

init();
