const data = window.WK_SITE_DATA;
const $ = (selector) => document.querySelector(selector);

function ensureDesignCredit() {
  const footer = document.querySelector(".site-footer");
  if (!footer || footer.querySelector(".design-credit")) return;
  const credit = document.createElement("p");
  credit.className = "design-credit";
  credit.textContent = "Created and designed by Pete Patel.";
  footer.insertBefore(credit, footer.querySelector("a"));
}

function ensureGalleryNavAndProofButton() {
  const nav = document.querySelector(".nav");
  if (nav && !nav.querySelector('a[href="#instagram"]')) {
    const link = document.createElement("a");
    link.href = "#instagram";
    link.textContent = "Gallery";
    const whyLink = nav.querySelector('a[href="#why"]');
    nav.insertBefore(link, whyLink || null);
  }

  const proofHeading = document.querySelector("#proof .section-heading");
  if (proofHeading && !proofHeading.querySelector(".proof-gallery-link")) {
    const button = document.createElement("a");
    button.className = "button primary proof-gallery-link";
    button.href = "#instagram";
    button.textContent = "View gallery";
    proofHeading.appendChild(button);
  }
}

function ensureInstagramSection() {
  if (!data.instagram || document.querySelector("#instagram")) return;

  if (!document.querySelector('link[href="instagram.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "instagram.css";
    document.head.appendChild(link);
  }

  const section = document.createElement("section");
  section.id = "instagram";
  section.className = "section instagram-section";
  section.innerHTML = `
    <div class="section-kicker">Gallery</div>
    <div class="instagram-head">
      <div>
        <h2>Trailers, food and where the fire has travelled.</h2>
        <p>Use simple filenames in <code>assets/gallery</code>: trailer images as <code>t1.jpg</code>, <code>t2.jpg</code>, <code>t3.jpg</code>; food as <code>f1.jpg</code>, <code>f2.jpg</code>; places and past events as <code>p1.jpg</code>, <code>p2.jpg</code>. The page will show these once the files are uploaded.</p>
      </div>
      <a class="button primary" href="https://www.instagram.com/wandererskneaded/" target="_blank" rel="noreferrer">Open Instagram</a>
    </div>
    <div class="instagram-live-slot" id="instagramLiveSlot" aria-label="Live Instagram feed area"></div>
    <div class="instagram-grid" id="instagramGrid" aria-label="Trailer, food and event gallery"></div>
  `;

  const proof = document.querySelector("#proof");
  const footer = document.querySelector(".site-footer");
  if (proof) proof.insertAdjacentElement("afterend", section);
  else document.body.insertBefore(section, footer);
}

function placeGalleryNearProof() {
  const gallery = document.querySelector("#instagram");
  const proof = document.querySelector("#proof");
  if (gallery && proof && proof.nextElementSibling !== gallery) {
    proof.insertAdjacentElement("afterend", gallery);
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

function getStatus() {
  const now = new Date();
  const open = parseTime(data.today.open, now);
  const close = parseTime(data.today.close, now);
  const trading = data.today.isTradingToday;
  if (!trading) return { open: false, label: "Not trading today", timer: "Check Instagram for pop-ups", next: "Paused" };
  if (now < open) return { open: false, label: "Opens today", timer: `Opens in ${formatDuration(open - now)}`, next: formatDuration(open - now) };
  if (now >= open && now < close) return { open: true, label: "Open now", timer: `Closes in ${formatDuration(close - now)}`, next: formatDuration(close - now) };
  return { open: false, label: "Closed now", timer: "Closed for today", next: "Tomorrow" };
}

function renderLiveStatus() {
  const status = getStatus();
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date());
  $("#statusPill").textContent = status.label;
  $("#statusPill").classList.toggle("is-open", status.open);
  $("#todayLocation").textContent = `${data.today.name} - ${data.today.address}`;
  $("#todayHours").textContent = `${data.today.open} - ${data.today.close}`;
  $("#countdown").textContent = status.next;
  $("#localTime").textContent = time;
  $("#todayHeadline").textContent = status.open ? `We are at ${data.today.name}` : `Find us at ${data.today.name}`;
  $("#todayNote").textContent = data.today.note;
  $("#todayAddress").textContent = data.today.address;
  $("#todayWindow").textContent = `${data.today.open} - ${data.today.close}`;
  $("#todayTimer").textContent = status.timer;
  $("#mapLink").href = data.today.mapUrl;
  $("#todayMapsButton").href = data.today.mapUrl;
}

function card(template) {
  const node = document.createElement("article");
  node.innerHTML = template;
  return node;
}

function renderCollections() {
  const services = $("#serviceGrid");
  data.services.forEach((item) => services.appendChild(card(`<span>${item.tag}</span><h3>${item.title}</h3><p>${item.text}</p>`)));

  const locations = $("#locationsStack");
  data.locations.forEach((item) => locations.appendChild(card(`<span>${item.status}</span><h3>${item.name}</h3><p>${item.address}</p><small>${item.detail}</small>`)));

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
  data.proof.forEach((item) => proof.appendChild(card(`<h3>${item.title}</h3><p>${item.text}</p>`)));

  const reasons = $("#reasonList");
  data.reasons.forEach((reason, index) => {
    const row = document.createElement("div");
    row.innerHTML = `<span>0${index + 1}</span><p>${reason}</p>`;
    reasons.appendChild(row);
  });

  const menu = $("#menuGrid");
  data.menu.forEach((item) => menu.appendChild(card(`<span>${item.label}</span><h3>${item.name}</h3><p>${item.ingredients}</p>`)));

  const instagramSlot = $("#instagramLiveSlot");
  if (instagramSlot && data.instagram) {
    instagramSlot.innerHTML = data.instagram.widgetHtml.trim()
      ? data.instagram.widgetHtml
      : `<strong>${data.instagram.handle}</strong><span>Upload named images into <code>assets/gallery</code> or paste a live Instagram widget in <code>site-data.js</code>.</span>`;
    instagramSlot.classList.toggle("has-widget", Boolean(data.instagram.widgetHtml.trim()));
  }

  const instagramGrid = $("#instagramGrid");
  if (instagramGrid && data.instagram) {
    data.instagram.posts.forEach((post) => {
      const item = document.createElement("a");
      item.href = "https://www.instagram.com/wandererskneaded/";
      item.target = "_blank";
      item.rel = "noreferrer";
      item.innerHTML = `<img src="${post.image}" alt="${post.title}" loading="lazy" onerror="this.onerror=null;this.src='${post.fallback}'"><span><small>${post.category} / ${post.code}</small>${post.title}</span>`;
      instagramGrid.appendChild(item);
    });
  }
}

function setHeaderState() {
  const header = document.querySelector("[data-elevate]");
  header.classList.toggle("is-scrolled", window.scrollY > 20);
}

function enableReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.16 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

ensureInstagramSection();
ensureGalleryNavAndProofButton();
ensureDesignCredit();
renderCollections();
placeGalleryNearProof();
renderLiveStatus();
enableReveal();
setHeaderState();
setInterval(renderLiveStatus, 30000);
window.addEventListener("scroll", setHeaderState, { passive: true });
