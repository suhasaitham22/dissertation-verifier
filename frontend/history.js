/* ---------------- Search History ---------------- */
// Depends on globals from app.js: sb, $, esc, openAuthModal.

const HISTORY_LIMIT = 50;

function histDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return ""; }
}

function histSnippet(s, n) {
  s = String(s || "").trim();
  return s.length > n ? s.slice(0, n).trimEnd() + "..." : s;
}

async function loadHistory() {
  const box = $("history-list");
  if (!box) return;
  let session = null;
  try {
    ({ data: { session } } = await sb.auth.getSession());
  } catch { /* fall through to signed-out state */ }
  if (!session || !session.user) {
    box.innerHTML = `
      <div class="empty glass">
        <p class="hist-empty-title">Your saved searches live here.</p>
        <p class="hist-empty-sub">Sign in to save searches and build history.</p>
        <button class="btn" id="hist-signin" type="button">Sign in</button>
      </div>`;
    $("hist-signin").addEventListener("click", () => openAuthModal("signin"));
    return;
  }
  box.innerHTML = `<div class="skel glass"><div class="line" style="width:60%"></div><div class="line" style="width:90%"></div></div>`;
  try {
    const { data, error } = await sb.from("ideas")
      .select("id,title,abstract,created_at,searches(results)")
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) throw error;
    renderHistory(data || []);
  } catch (err) {
    box.innerHTML = `<div class="notice err glass"><b>Could not load history.</b> ${esc(err.message || "Unknown error")}</div>`;
  }
}

function renderHistory(items) {
  const box = $("history-list");
  if (!items.length) {
    box.innerHTML = `
      <div class="empty glass">
        <p class="hist-empty-title">No saved searches yet.</p>
        <p class="hist-empty-sub">Your checks will appear here once you run your first search.</p>
      </div>`;
    return;
  }
  box.innerHTML = `
    <div class="hist-head">
      <span class="hist-count">${items.length} saved ${items.length === 1 ? "search" : "searches"}</span>
      <button class="btn btn-ghost btn-danger" id="hist-clear" type="button">Clear all</button>
    </div>
    <div id="hist-confirm"></div>
    ${items.map(histRow).join("")}`;
  $("hist-clear").addEventListener("click", () => confirmClearAll(items.map((it) => it.id)));
  box.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => confirmDelete(b.dataset.del, b.dataset.title || "this search", b)));
}

function histRow(it) {
  const res = it.searches && it.searches[0] && Array.isArray(it.searches[0].results)
    ? it.searches[0].results : [];
  const works = res.length;
  return `
  <article class="card-result glass hist-row">
    <div class="hist-main">
      <h3>${esc(it.title || "Untitled idea")}</h3>
      <div class="hist-meta">${esc(histDate(it.created_at))}${works ? ` · ${works} matching ${works === 1 ? "work" : "works"}` : ""}</div>
      ${it.abstract ? `<p class="abs">${esc(histSnippet(it.abstract, 160))}</p>` : ""}
    </div>
    <button class="btn btn-ghost btn-danger hist-del" type="button"
      data-del="${esc(it.id)}" data-title="${esc(it.title || "this search")}">Delete</button>
  </article>`;
}

function confirmDelete(id, title, btn) {
  const wrap = document.createElement("span");
  wrap.className = "hist-confirm";
  wrap.innerHTML = `
    <span class="hist-q">Delete "${esc(histSnippet(title, 48))}"?</span>
    <button class="btn btn-danger" type="button" data-yes>Yes, delete</button>
    <button class="btn btn-ghost" type="button" data-no>Keep</button>`;
  btn.replaceWith(wrap);
  wrap.querySelector("[data-yes]").addEventListener("click", async (e) => {
    const yesBtn = e.currentTarget;
    yesBtn.disabled = true;
    yesBtn.textContent = "Deleting...";
    try {
      const { error } = await sb.from("ideas").delete().eq("id", id);
      if (error) throw error;
      loadHistory();
    } catch (err) {
      wrap.innerHTML = `<span class="hist-q">Delete failed. ${esc(err.message || "Please try again.")}</span>
        <button class="btn btn-ghost" type="button" data-retry>OK</button>`;
      wrap.querySelector("[data-retry]").addEventListener("click", () => loadHistory());
    }
  });
  wrap.querySelector("[data-no]").addEventListener("click", () => loadHistory());
}

function confirmClearAll(ids) {
  const slot = $("hist-confirm");
  if (!slot) return;
  slot.innerHTML = `
    <div class="notice glass hist-confirm-all">
      <span>Delete all ${ids.length} saved ${ids.length === 1 ? "search" : "searches"}? This cannot be undone.</span>
      <span class="hist-confirm-btns">
        <button class="btn btn-danger" id="hist-clear-yes" type="button">Yes, clear all</button>
        <button class="btn btn-ghost" id="hist-clear-no" type="button">Keep them</button>
      </span>
    </div>`;
  slot.scrollIntoView({ behavior: "smooth", block: "center" });
  $("hist-clear-no").addEventListener("click", () => { slot.innerHTML = ""; });
  $("hist-clear-yes").addEventListener("click", async (e) => {
    const yesBtn = e.currentTarget;
    yesBtn.disabled = true;
    yesBtn.textContent = "Clearing...";
    try {
      const { error } = await sb.from("ideas").delete().in("id", ids);
      if (error) throw error;
      loadHistory();
    } catch (err) {
      slot.innerHTML = `<div class="notice err glass"><b>Clear failed.</b> ${esc(err.message || "Please try again.")}</div>`;
    }
  });
}
