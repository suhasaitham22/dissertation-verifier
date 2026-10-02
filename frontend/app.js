// Dissertation Verifier - frontend (Phase 3: premium UI + search)
// Supabase anon key is designed to be public in frontend code; RLS protects the data.
const SUPABASE_URL = "https://uklhqmvkuataddjkjzms.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrbGhxbXZrdWF0YWRkamtqem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NTg4ODgsImV4cCI6MjEwNjUzNDg4OH0.LZueWxUwt_kTZem1itJfbwcMVJMb_D4tuePaO-kROlY";
const WORKER_URL = "https://dissertation-verifier-worker.suhasaitham22.workers.dev";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

/* ---------------- auth (modal) ---------------- */
let authMode = "signin";

function openAuthModal(mode) {
  authMode = mode || "signin";
  $("modal-root").innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal glass" role="dialog" aria-modal="true" aria-label="Sign in">
        <h2>${authMode === "signin" ? "Welcome back" : "Create your account"}</h2>
        <p class="sub">${authMode === "signin" ? "Sign in to save searches and build history." : "One account — your searches stay private to you."}</p>
        <div class="field">
          <label for="m-email">Email</label>
          <input class="input" id="m-email" type="email" placeholder="you@example.com" autocomplete="email" />
        </div>
        <div class="field">
          <label for="m-password">Password</label>
          <input class="input" id="m-password" type="password" placeholder="••••••••" autocomplete="${authMode === "signin" ? "current-password" : "new-password"}" />
        </div>
        <button class="btn" id="m-submit" type="button" style="width:100%">${authMode === "signin" ? "Sign in" : "Sign up"}</button>
        <p class="status" id="m-status"></p>
        <p class="switch">${authMode === "signin" ? "New here? <button id='m-switch' type='button'>Create an account</button>" : "Have an account? <button id='m-switch' type='button'>Sign in</button>"}</p>
      </div>
    </div>`;
  $("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeAuthModal();
  });
  $("m-switch").addEventListener("click", () => openAuthModal(authMode === "signin" ? "signup" : "signin"));
  $("m-submit").addEventListener("click", submitAuth);
  $("m-password").addEventListener("keydown", (e) => { if (e.key === "Enter") submitAuth(); });
  setTimeout(() => $("m-email").focus(), 50);
}

function closeAuthModal() { $("modal-root").innerHTML = ""; }

async function submitAuth() {
  const email = $("m-email").value.trim();
  const password = $("m-password").value;
  const status = $("m-status");
  if (!email || !password) { status.className = "status err"; status.textContent = "Enter an email and password."; return; }
  status.className = "status"; status.textContent = "Working…";
  const fn = authMode === "signin" ? sb.auth.signInWithPassword({ email, password }) : sb.auth.signUp({ email, password });
  const { error } = await fn;
  if (error) { status.className = "status err"; status.textContent = error.message; return; }
  status.className = "status ok"; status.textContent = authMode === "signin" ? "Signed in." : "Account created — signed in.";
  setTimeout(() => { closeAuthModal(); refreshAuthUI(); }, 600);
}

async function refreshAuthUI() {
  const { data: { session } } = await sb.auth.getSession();
  const btn = $("nav-auth-btn"), who = $("nav-user"), hint = $("search-hint");
  if (session && session.user) {
    who.style.display = "inline";
    who.textContent = session.user.email;
    btn.textContent = "Sign out";
    btn.onclick = async () => { await sb.auth.signOut(); refreshAuthUI(); };
    hint.textContent = "Signed in — your searches will be saved.";
  } else {
    who.style.display = "none";
    btn.textContent = "Sign in";
    btn.onclick = () => openAuthModal("signin");
    hint.textContent = "Sign in to save your search history.";
  }
}
sb.auth.onAuthStateChange(() => refreshAuthUI());
refreshAuthUI();

/* ---------------- search ---------------- */
const form = $("idea-form");
const resultsEl = $("results");
const searchBtn = $("btn-search");
let lastSearch = null; // { q, results } — used by Phase 5 gap analysis

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function matchedKeywords(r, keywords) {
  const hay = `${r.title} ${r.abstract || ""}`.toLowerCase();
  return keywords.filter((kw) => kw && hay.includes(kw));
}

function verdictFor(topScore) {
  if (topScore >= 12) return { cls: "verdict-high", text: "High overlap — strongly consider differentiating" };
  if (topScore >= 7) return { cls: "verdict-med", text: "Moderate overlap — related work exists" };
  return { cls: "verdict-low", text: "Low overlap — relatively unexplored" };
}

function showSkeletons() {
  resultsEl.innerHTML = `
    <div class="results-head"><h2>Searching…</h2><p class="meta">Querying OpenAlex · Crossref · Semantic Scholar</p></div>
    ${[86, 64, 74].map((w) => `<div class="skel glass"><div class="line" style="width:${w}%"></div><div class="line" style="width:96%"></div><div class="line" style="width:58%"></div></div>`).join("")}`;
}

function showError(msg) {
  resultsEl.innerHTML = `<div class="notice err glass"><b>Search failed.</b> ${esc(msg)} Please try again.</div>`;
  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResults(data, q) {
  const keywords = (q.title + " " + q.keywords + " " + q.field).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const uniqKw = [...new Set(keywords)];
  const maxScore = Math.max(1, ...data.results.map((r) => r.score || 0));
  const verdict = verdictFor(data.results.length ? data.results[0].score : 0);
  const srcNames = { openalex: "OpenAlex", crossref: "Crossref", semanticscholar: "Semantic Scholar" };
  const countsLine = Object.entries(data.counts || {}).map(([k, v]) => `${srcNames[k] || k}: ${v}`).join(" · ");

  let html = `
    <div class="results-head">
      <h2>${data.total} matching ${data.total === 1 ? "work" : "works"} found</h2>
      <div class="meta"><span>${esc(countsLine)}</span>${data.errors ? `<span>Note: ${esc(Object.keys(data.errors).join(", "))} rate-limited this run — results may grow on retry.</span>` : ""}</div>
      <div><span class="verdict ${verdict.cls}">${esc(verdict.text)}</span></div>
      <div style="margin-top:14px"><button class="btn btn-ghost" id="btn-gaps" type="button">Analyze uniqueness gaps</button></div>
    </div>
    <div id="gaps-out"></div>`;

  if (!data.results.length) {
    html += `<div class="empty glass">No close matches found. That is a good sign for originality — but double-check with a broader keyword set too.</div>`;
  }

  data.results.slice(0, 25).forEach((r, i) => {
    const matched = matchedKeywords(r, uniqKw).slice(0, 6);
    const pct = Math.round(((r.score || 0) / maxScore) * 100);
    const authors = (r.authors || []).slice(0, 4).join(", ") + ((r.authors || []).length > 4 ? " et al." : "");
    html += `
    <article class="card-result glass" style="animation-delay:${Math.min(i * 60, 600)}ms">
      <div class="top">
        <span class="src-pill src-${esc(r.source)}">${esc(srcNames[r.source] || r.source)}</span>
        <span class="src-pill">${esc(r.type === "dissertation" ? "Dissertation" : "Paper")}</span>
        ${r.year ? `<span class="src-pill">${esc(String(r.year))}</span>` : ""}
      </div>
      <h3>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}</h3>
      ${authors ? `<div class="byline">${esc(authors)}</div>` : ""}
      ${r.abstract ? `<p class="abs">${esc(r.abstract)}</p>` : ""}
      ${matched.length ? `<div class="match-line">Matched: <b>${matched.map(esc).join("</b>, <b>")}</b></div>` : ""}
      <div class="score-row">
        <div class="score-bar"><div class="score-fill" style="width:${pct}%"></div></div>
        <span class="score-num">relevance ${r.score}</span>
      </div>
    </article>`;
  });

  resultsEl.innerHTML = html;
  resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  const gapsBtn = $("btn-gaps");
  if (gapsBtn && lastSearch) {
    gapsBtn.addEventListener("click", () => analyzeGaps(gapsBtn));
  }
}

/* ---------------- Phase 5: gap analysis ---------------- */
async function analyzeGaps(btn) {
  const box = $("gaps-out");
  if (!lastSearch || !box) return;
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = "Analyzing…";
  box.innerHTML = `<div class="skel glass"><div class="line" style="width:70%"></div><div class="line" style="width:96%"></div><div class="line" style="width:50%"></div></div>`;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const res = await fetch(WORKER_URL + "/api/gaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: lastSearch.q, results: lastSearch.results.slice(0, 8) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gap analysis failed");
    renderGaps(data.suggestions);
  } catch (err) {
    box.innerHTML = `<div class="notice err glass"><b>Couldn't generate suggestions.</b> ${esc(err.message || "Unknown error")}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

function renderGaps(text) {
  const box = $("gaps-out");
  let body = "";
  try {
    const g = JSON.parse(text);
    const gaps = Array.isArray(g.gaps) ? g.gaps : [];
    body =
      (g.covered ? `<p class="gaps-covered">${esc(g.covered)}</p>` : "") +
      gaps.map((gp, i) => `
        <div class="gap-item">
          <b>${i + 1}. ${esc(gp.angle || "Angle")}</b>
          <span>${esc(gp.detail || "")}</span>
        </div>`).join("");
    if (!body.trim()) throw new Error("empty");
  } catch {
    body = `<pre class="raw">${esc(text)}</pre>`;
  }
  box.innerHTML = `
    <div class="gaps glass">
      <h3>Ways to make it yours</h3>
      ${body}
      <p class="disclaimer">AI-generated positioning ideas — verify each against the actual literature before committing.</p>
    </div>`;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function getEmbedding(text) {
  const res = await fetch(WORKER_URL + "/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Embedding failed");
  return data.embedding;
}

async function checkDuplicate(q) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const text = [q.title, q.abstract].filter(Boolean).join("\n");
    if (!text.trim()) return null;
    const embedding = await getEmbedding(text);
    const { data, error } = await sb.rpc("match_ideas", {
      query_embedding: embedding,
      match_threshold: 0.70,
      match_count: 3,
    });
    if (error || !data || !data.length) return null;
    return data;
  } catch {
    return null;
  }
}

function duplicateNotice(matches) {
  const m = matches[0];
  const pct = Math.round(m.similarity * 100);
  const when = m.created_at ? new Date(m.created_at).toLocaleDateString() : "";
  return `<div class="notice glass">Heads up — this looks <b>${pct}% similar</b> to an idea you already checked${when ? ` on ${esc(when)}` : ""}: <b>${esc(m.title || "untitled")}</b>.${matches.length > 1 ? ` Plus ${matches.length - 1} more similar past ${matches.length - 1 === 1 ? "search" : "searches"}.` : ""}</div>`;
}

async function saveSearch(q, data) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    const kwArr = q.keywords.split(",").map((s) => s.trim()).filter(Boolean);
    let embedding = null;
    try {
      const text = [q.title, q.abstract].filter(Boolean).join("\n");
      if (text.trim()) embedding = await getEmbedding(text);
    } catch { /* embedding is best-effort */ }
    const { data: idea, error } = await sb.from("ideas").insert({
      user_id: session.user.id,
      title: q.title, abstract: q.abstract, keywords: kwArr, field: q.field,
      embedding,
    }).select("id").single();
    if (error || !idea) return;
    await sb.from("searches").insert({ idea_id: idea.id, results: data.results.slice(0, 20) });
  } catch { /* history save is best-effort */ }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = {
    title: $("f-title").value.trim(),
    abstract: $("f-abstract").value.trim(),
    keywords: $("f-keywords").value.trim(),
    field: $("f-field").value.trim(),
  };
  if (!q.title && !q.keywords && !q.field && !q.abstract) {
    showError("Type at least a title, some keywords, or a field first.");
    return;
  }
  searchBtn.disabled = true;
  searchBtn.textContent = "Searching…";
  showSkeletons();
  try {
    const res = await fetch(WORKER_URL + "/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Search failed");
    lastSearch = { q, results: data.results || [] };
    renderResults(data, q);
    const matches = await checkDuplicate(q);
    if (matches && matches.length) {
      resultsEl.insertAdjacentHTML("afterbegin", duplicateNotice(matches));
    }
    await saveSearch(q, data);
  } catch (err) {
    showError(err.message || "Network error");
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Check originality";
  }
});
