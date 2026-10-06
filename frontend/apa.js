/* ---------------- Phase 6: APA 7th helper ---------------- */

const FIELD_LABELS = {
  authors: "Authors", year: "Year", article: "Article title", journal: "Journal title",
  volume: "Volume", issue: "Issue", pages: "Pages", doi: "DOI / URL",
  title: "Title", publisher: "Publisher", university: "University",
  database: "Database", url: "URL", pubNo: "Publication No.",
  month: "Month", paper: "Paper title", editors: "Editors",
  proceedings: "Proceedings title", site: "Site name", date: "Date",
};

function apaLink(u) {
  const clean = String(u).trim();
  return `<a href="${esc(clean)}" target="_blank" rel="noopener">${esc(clean)}</a>`;
}

const APA_TEMPLATES = {
  journal: {
    label: "Journal article",
    required: ["authors", "year", "article", "journal"],
    softMissing: ["volume", "pages", "doi"],
    fields: [
      { key: "authors", label: "Authors", wide: true, placeholder: "Smith, J. A., & Doe, R. B." },
      { key: "year", label: "Year", placeholder: "2023" },
      { key: "article", label: "Article title", wide: true, placeholder: "Title of the article in sentence case" },
      { key: "journal", label: "Journal title", wide: true, placeholder: "Journal of Something" },
      { key: "volume", label: "Volume", placeholder: "12" },
      { key: "issue", label: "Issue", placeholder: "3" },
      { key: "pages", label: "Pages", placeholder: "45–67" },
      { key: "doi", label: "DOI / URL", wide: true, placeholder: "https://doi.org/10.xxxx/yyyy" },
    ],
    build(f) {
      let h = `${esc(f.authors)} (${esc(f.year)}). ${esc(f.article)}. <i>${esc(f.journal)}</i>`;
      let t = `${f.authors} (${f.year}). ${f.article}. ${f.journal}`;
      if (f.volume) { h += `, <i>${esc(f.volume)}</i>`; t += `, ${f.volume}`; }
      if (f.issue) { h += `(${esc(f.issue)})`; t += `(${f.issue})`; }
      if (f.pages) { h += `, ${esc(f.pages)}`; t += `, ${f.pages}`; }
      h += "."; t += ".";
      if (f.doi) { h += ` ${apaLink(f.doi)}`; t += ` ${f.doi}`; }
      return { html: h, text: t };
    },
  },
  book: {
    label: "Book",
    required: ["authors", "year", "title", "publisher"],
    softMissing: ["doi"],
    fields: [
      { key: "authors", label: "Authors", wide: true, placeholder: "Smith, J. A." },
      { key: "year", label: "Year", placeholder: "2020" },
      { key: "title", label: "Book title", wide: true, placeholder: "Title of the work in sentence case" },
      { key: "publisher", label: "Publisher", wide: true, placeholder: "Publisher Name" },
      { key: "doi", label: "DOI / URL (if ebook)", wide: true, placeholder: "https://doi.org/10.xxxx/yyyy" },
    ],
    build(f) {
      let h = `${esc(f.authors)} (${esc(f.year)}). <i>${esc(f.title)}</i>. ${esc(f.publisher)}.`;
      let t = `${f.authors} (${f.year}). ${f.title}. ${f.publisher}.`;
      if (f.doi) { h += ` ${apaLink(f.doi)}`; t += ` ${f.doi}`; }
      return { html: h, text: t };
    },
  },
  dissertation: {
    label: "Dissertation / Thesis",
    required: ["authors", "year", "title", "university"],
    softMissing: ["database", "url"],
    fields: [
      { key: "authors", label: "Author", wide: true, placeholder: "Smith, J. A." },
      { key: "year", label: "Year", placeholder: "2022" },
      { key: "title", label: "Dissertation title", wide: true, placeholder: "Title in sentence case" },
      { key: "university", label: "University", wide: true, placeholder: "Stanford University" },
      { key: "pubNo", label: "Publication No. (if any)", placeholder: "28491357" },
      { key: "database", label: "Database", wide: true, placeholder: "ProQuest Dissertations and Theses Global" },
      { key: "url", label: "URL", wide: true, placeholder: "https://..." },
    ],
    build(f) {
      let h = `${esc(f.authors)} (${esc(f.year)}). <i>${esc(f.title)}</i>`;
      let t = `${f.authors} (${f.year}). ${f.title}`;
      if (f.pubNo) { h += ` (Publication No. ${esc(f.pubNo)})`; t += ` (Publication No. ${f.pubNo})`; }
      h += ` [Doctoral dissertation, ${esc(f.university)}].`;
      t += ` [Doctoral dissertation, ${f.university}].`;
      if (f.database) { h += ` ${esc(f.database)}.`; t += ` ${f.database}.`; }
      if (f.url) { h += ` ${apaLink(f.url)}`; t += ` ${f.url}`; }
      return { html: h, text: t };
    },
  },
  conference: {
    label: "Conference paper",
    required: ["authors", "year", "paper", "proceedings"],
    softMissing: ["pages", "publisher", "doi"],
    fields: [
      { key: "authors", label: "Authors", wide: true, placeholder: "Smith, J. A., & Doe, R. B." },
      { key: "year", label: "Year", placeholder: "2023" },
      { key: "month", label: "Month", placeholder: "October" },
      { key: "paper", label: "Paper title", wide: true, placeholder: "Title of the paper in sentence case" },
      { key: "editors", label: "Editors", wide: true, placeholder: "Lee, K., & Park, S." },
      { key: "proceedings", label: "Proceedings title", wide: true, placeholder: "Proceedings of the ..." },
      { key: "pages", label: "Pages", placeholder: "10–20" },
      { key: "publisher", label: "Publisher", wide: true, placeholder: "ACM" },
      { key: "doi", label: "DOI / URL", wide: true, placeholder: "https://doi.org/10.xxxx/yyyy" },
    ],
    build(f) {
      let h = `${esc(f.authors)} (${esc(f.year)}${f.month ? `, ${esc(f.month)}` : ""}). ${esc(f.paper)}.`;
      let t = `${f.authors} (${f.year}${f.month ? `, ${f.month}` : ""}). ${f.paper}.`;
      if (f.editors) { h += ` In ${esc(f.editors)} (Eds.),`; t += ` In ${f.editors} (Eds.),`; }
      h += ` <i>${esc(f.proceedings)}</i>`;
      t += ` ${f.proceedings}`;
      if (f.pages) { h += ` (pp. ${esc(f.pages)})`; t += ` (pp. ${f.pages})`; }
      h += "."; t += ".";
      if (f.publisher) { h += ` ${esc(f.publisher)}.`; t += ` ${f.publisher}.`; }
      if (f.doi) { h += ` ${apaLink(f.doi)}`; t += ` ${f.doi}`; }
      return { html: h, text: t };
    },
  },
  website: {
    label: "Webpage",
    required: ["authors", "date", "title", "site", "url"],
    softMissing: [],
    fields: [
      { key: "authors", label: "Author / Organization", wide: true, placeholder: "Smith, J. A. or Organization Name" },
      { key: "date", label: "Date", placeholder: "2021, March 5" },
      { key: "title", label: "Page title", wide: true, placeholder: "Title of the page" },
      { key: "site", label: "Site name", wide: true, placeholder: "Site Name" },
      { key: "url", label: "URL", wide: true, placeholder: "https://..." },
    ],
    build(f) {
      const h = `${esc(f.authors)} (${esc(f.date)}). <i>${esc(f.title)}</i>. ${esc(f.site)}. ${apaLink(f.url)}`;
      const t = `${f.authors} (${f.date}). ${f.title}. ${f.site}. ${f.url}`;
      return { html: h, text: t };
    },
  },
};

let apaType = "journal";
const apaState = {};

const VIEW_IDS = { verifier: "view-verifier", apa: "view-apa", history: "view-history" };
const TAB_IDS = { verifier: "tab-verifier", apa: "tab-apa", history: "tab-history" };

function switchView(name) {
  Object.entries(VIEW_IDS).forEach(([k, id]) => { $(id).style.display = k === name ? "" : "none"; });
  Object.entries(TAB_IDS).forEach(([k, id]) => { $(id).classList.toggle("active", k === name); });
  if (name === "history" && typeof loadHistory === "function") loadHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$("tab-verifier").addEventListener("click", () => switchView("verifier"));
$("tab-apa").addEventListener("click", () => switchView("apa"));
$("tab-history").addEventListener("click", () => switchView("history"));

function renderTplRow() {
  $("tpl-row").innerHTML = Object.entries(APA_TEMPLATES).map(([k, t]) =>
    `<button type="button" class="tpl-card${k === apaType ? " active" : ""}" data-tpl="${k}">${esc(t.label)}</button>`
  ).join("");
  document.querySelectorAll("#tpl-row [data-tpl]").forEach((b) =>
    b.addEventListener("click", () => {
      apaType = b.dataset.tpl;
      $("parse-out").innerHTML = ""; // notes belong to the last parse, not the new template
      renderTplRow();
      renderApaForm();
    })
  );
}

function renderApaForm() {
  const t = APA_TEMPLATES[apaType];
  $("apa-form").innerHTML = `
    <div class="grid">
      ${t.fields.map((f) => `
        <div class="field${f.wide ? " full" : ""}">
          <label for="apa-${f.key}">${esc(f.label)}${t.required.includes(f.key) ? " *" : ""}</label>
          <input class="input" id="apa-${f.key}" type="text" placeholder="${esc(f.placeholder || "")}" value="${esc(apaState[f.key] || "")}" />
        </div>`).join("")}
      <div class="actions full">
        <button class="btn" id="btn-apa-format" type="button">Format reference</button>
      </div>
    </div>`;
  $("btn-apa-format").addEventListener("click", formatApa);
}

function readApaFields() {
  APA_TEMPLATES[apaType].fields.forEach((f) => {
    const el = $("apa-" + f.key);
    apaState[f.key] = el ? el.value.trim() : (apaState[f.key] || "");
  });
}

function fieldLabel(k) { return FIELD_LABELS[k] || k; }

function formatApa() {
  readApaFields();
  const t = APA_TEMPLATES[apaType];
  const { html, text } = t.build(apaState);
  const missing = t.required.filter((k) => !apaState[k]);
  const soft = (t.softMissing || []).filter((k) => !apaState[k]);
  $("apa-out").innerHTML = `
    <div class="apa-preview glass">
      <p>${html}</p>
      <div class="copy-row"><button class="btn btn-ghost" id="btn-apa-copy" type="button">Copy plain text</button></div>
    </div>
    ${missing.length
      ? `<div class="warns">${missing.map((k) => `<span class="warn-chip">Missing: ${esc(fieldLabel(k))}</span>`).join("")}</div>`
      : `<div class="ok-line">All required fields present.</div>`}
    ${soft.length
      ? `<div class="warns">${soft.map((k) => `<span class="warn-chip soft">Often needed: ${esc(fieldLabel(k))}</span>`).join("")}</div>`
      : ""}`;
  $("btn-apa-copy").addEventListener("click", (e) => copyText(e.currentTarget, text));
}

function copyText(btn, text) {
  const done = () => { const o = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(() => { btn.textContent = o; }, 1500); };
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch { /* ignore */ }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else fallback();
}

/* ---- messy-reference parser (best-effort) ---- */
function normalizeAuthors(raw) {
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const parts = raw.split(/\s*;\s*|\s+&\s+|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  const norm = parts.map((p) => {
    if (/,/.test(p)) {
      const [fam, ...rest] = p.split(",");
      return ([cap(fam.trim()), ...rest].join(",")).replace(/\s+/g, " ").replace(/,+$/, "").trim();
    }
    const words = p.split(/\s+/);
    if (words.length < 2) return cap(p);
    const last = cap(words[words.length - 1]);
    const initials = words.slice(0, -1).map((w) => w.replace(/\./g, "").charAt(0).toUpperCase() + ".").join(" ");
    return `${last}, ${initials}`;
  });
  if (norm.length > 1) return norm.slice(0, -1).join(", ") + ", & " + norm[norm.length - 1];
  return norm.join("");
}

function parseReference() {
  const raw = $("paste-ref").value.trim();
  const out = $("parse-out");
  out.innerHTML = ""; // clear stale notes from any previous parse
  if (!raw) { out.innerHTML = `<div class="notice err glass">Paste a reference first.</div>`; return; }
  const t = raw.replace(/\s+/g, " ");
  const bag = {};
  const notes = [];
  let rest = t;

  const ym = t.match(/\((19|20)\d{2}[a-z]?\)/);
  if (ym) {
    bag.year = ym[0].replace(/[()]/g, "").replace(/[a-z]$/, "");
    const yi = t.indexOf(ym[0]);
    const aRaw = t.slice(0, yi).trim().replace(/[,;]+$/, "");
    if (aRaw) bag.authors = normalizeAuthors(aRaw);
    rest = t.slice(yi + ym[0].length).trim().replace(/^\.\s*/, "");
  } else {
    notes.push("Couldn't find a (Year) — add it in the form.");
    // Fallback: a leading "Last, F." author block (comma required so titles aren't eaten)
    const am = t.match(/^([A-Z][^.(]*,\s*[A-Z][^.(]{0,30}?)\.\s+(?=[A-Z])/);
    if (am) {
      bag.authors = normalizeAuthors(am[1]);
      rest = t.slice(am[0].length).trim();
    }
  }

  const um = rest.match(/https?:\/\/[^\s)]+|doi:\s*[^\s]+|10\.\d{4,}\/[^\s)]+/i);
  if (um) {
    bag.doi = um[0].replace(/[.,;)\]]+$/, "");
    rest = rest.replace(um[0], " ").replace(/\s+/g, " ").trim();
  }

  // Title FIRST (before volume/journal extraction), then the source remainder
  let title = "", source = "";
  const ti = rest.search(/\.\s+[A-Z(]/);
  if (ti > 0) { title = rest.slice(0, ti + 1); source = rest.slice(ti + 1).trim().replace(/^\.\s*/, ""); }
  else {
    const pi = rest.indexOf(".");
    if (pi > 0) { title = rest.slice(0, pi + 1); source = rest.slice(pi + 1).trim(); }
    else title = rest;
  }
  title = title
    .replace(/\s*\[Doctoral dissertation,[^\]]*\]/gi, "")
    .replace(/\s*\(Publication No\.[^)]*\)/gi, "")
    .replace(/\.$/, "").trim();
  if (title) bag.article = title;
  else notes.push("Couldn't split the title from the source — check the title field.");

  let journal = "";
  const vm = source.match(/,\s*(\d+)\s*\((\d+)\)\s*,?\s*(\d+\s*[–—-]\s*\d+|\d+)/);
  if (vm) {
    bag.volume = vm[1]; bag.issue = vm[2]; bag.pages = vm[3].replace(/\s+/g, "");
    journal = source.slice(0, vm.index).trim();
    source = source.slice(vm.index + vm[0].length).trim().replace(/^[.,;]\s*/, "");
  }

  const low = t.toLowerCase();
  let guess = "journal";
  if (/dissertation|doctoral thesis|ph\.?\s?d\.?\s?thesis/.test(low)) guess = "dissertation";
  else if (/conference|proceedings/i.test(low)) guess = "conference";
  else if (bag.volume) guess = "journal";
  else if (bag.doi) guess = "website";

  const srcText = (journal || source).replace(/^[.,;]\s*/, "").trim();
  if (guess === "journal") {
    bag.journal = srcText;
  } else if (guess === "dissertation") {
    bag.title = bag.article; delete bag.article;
    const dm = t.match(/\[Doctoral dissertation,\s*([^\]]+)\]/i) || t.match(/doctoral dissertation,\s*([^.,]+)/i);
    if (dm) bag.university = dm[1].trim();
    else notes.push("Couldn't detect the university — add it in the form.");
    if (/proquest/i.test(t)) bag.database = "ProQuest Dissertations and Theses Global";
    if (bag.doi) { bag.url = bag.doi; delete bag.doi; }
  } else if (guess === "conference") {
    bag.paper = bag.article; delete bag.article;
    bag.proceedings = srcText;
  } else if (guess === "website") {
    bag.title = bag.article; delete bag.article;
    bag.site = srcText;
    if (bag.doi) { bag.url = bag.doi; delete bag.doi; }
    if (bag.year) bag.date = bag.year;
  }

  apaType = guess;
  Object.keys(apaState).forEach((k) => delete apaState[k]);
  Object.assign(apaState, bag);
  renderTplRow();
  renderApaForm();
  formatApa();
  if (notes.length) {
    $("parse-out").insertAdjacentHTML("afterbegin",
      `<div class="warns" style="margin-bottom:12px">${notes.map((n) => `<span class="warn-chip soft">${esc(n)}</span>`).join("")}</div>`);
  }
}

$("btn-parse").addEventListener("click", parseReference);

// init APA view
renderTplRow();
renderApaForm();
