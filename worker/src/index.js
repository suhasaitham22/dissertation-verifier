// Dissertation Verifier - Cloudflare Worker (Phase 2: multi-source search)
// Sources: OpenAlex (dissertations), Crossref (dissertations), Semantic Scholar (papers).
// Dependency-free single file so it can be pasted into the dashboard editor.

const FRONTEND_ORIGIN = "https://dissertation-verifier.pages.dev";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders() });
}

function buildQueryText(q) {
  const parts = [q.title || "", q.keywords || "", q.field || ""]
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 300);
}

function rebuildAbstract(inverted) {
  if (!inverted) return null;
  try {
    const words = [];
    for (const [word, positions] of Object.entries(inverted)) {
      for (const p of positions) words[p] = word;
    }
    const text = words.filter(Boolean).join(" ");
    return text.length > 600 ? text.slice(0, 600) + "…" : text;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url, options, retries = 1) {
  const res = await fetch(url, options);
  if (res.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, 1500));
    return fetch(url, options);
  }
  return res;
}

async function searchOpenAlex(queryText) {
  const params = new URLSearchParams({
    search: queryText,
    filter: "type:dissertation",
    "per-page": "25",
    select:
      "id,doi,title,publication_year,authorships,primary_location,abstract_inverted_index",
  });
  const res = await fetchWithRetry(`https://api.openalex.org/works?${params}`);
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((w) => ({
    source: "openalex",
    title: w.title || "Untitled",
    authors: (w.authorships || [])
      .map((a) => a.author && a.author.display_name)
      .filter(Boolean),
    year: w.publication_year || null,
    url: w.doi
      ? `https://doi.org/${w.doi.replace("https://doi.org/", "")}`
      : (w.primary_location && w.primary_location.landing_page_url) || w.id,
    abstract: rebuildAbstract(w.abstract_inverted_index),
    type: "dissertation",
  }));
}

async function searchCrossref(queryText) {
  const params = new URLSearchParams({
    "query.bibliographic": queryText,
    filter: "type:dissertation",
    rows: "25",
    select: "DOI,title,author,published,URL,abstract",
  });
  const res = await fetchWithRetry(`https://api.crossref.org/works?${params}`, {
    headers: { "User-Agent": "DissertationVerifier/1.0 (free-tier research tool)" },
  });
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const data = await res.json();
  const items = (data.message && data.message.items) || [];
  return items.map((it) => ({
    source: "crossref",
    title: (it.title && it.title[0]) || "Untitled",
    authors: (it.author || [])
      .map((a) => [a.given, a.family].filter(Boolean).join(" "))
      .filter(Boolean),
    year:
      (it.published &&
        it.published["date-parts"] &&
        it.published["date-parts"][0] &&
        it.published["date-parts"][0][0]) ||
      null,
    url: it.URL || (it.DOI ? `https://doi.org/${it.DOI}` : null),
    abstract: it.abstract
      ? it.abstract.replace(/<[^>]+>/g, "").slice(0, 600)
      : null,
    type: "dissertation",
  }));
}

async function searchSemanticScholar(queryText) {
  const params = new URLSearchParams({
    query: queryText,
    limit: "25",
    fields: "title,abstract,year,authors,url,openAccessPdf,externalIds",
  });
  const res = await fetchWithRetry(
    `https://api.semanticscholar.org/graph/v1/paper/search?${params}`
  );
  if (!res.ok) throw new Error(`SemanticScholar ${res.status}`);
  const data = await res.json();
  return (data.data || []).map((p) => ({
    source: "semanticscholar",
    title: p.title || "Untitled",
    authors: (p.authors || []).map((a) => a.name).filter(Boolean),
    year: p.year || null,
    url:
      p.url ||
      (p.openAccessPdf && p.openAccessPdf.url) ||
      (p.externalIds && p.externalIds.DOI
        ? `https://doi.org/${p.externalIds.DOI}`
        : null),
    abstract: p.abstract ? p.abstract.slice(0, 600) : null,
    type: "paper",
  }));
}

function scoreResult(r, keywords) {
  const hay = `${r.title} ${r.abstract || ""}`.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (kw && hay.includes(kw)) score += 2;
  }
  if (r.type === "dissertation") score += 3;
  if (r.year && r.year >= 2020) score += 1;
  return score;
}

function dedupe(results) {
  const seen = new Set();
  const out = [];
  for (const r of results) {
    const key = (r.url && r.url.toLowerCase()) || r.title.toLowerCase().trim();
    const norm = key
      .replace("https://doi.org/", "doi:")
      .replace("http://doi.org/", "doi:");
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(r);
  }
  return out;
}

async function runSearch(q) {
  const queryText = buildQueryText(q);
  if (!queryText) {
    return { error: "Provide at least a title, keywords, or field to search." };
  }
  const keywords = queryText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  const settled = await Promise.allSettled([
    searchOpenAlex(queryText),
    searchCrossref(queryText),
    searchSemanticScholar(queryText),
  ]);
  const names = ["openalex", "crossref", "semanticscholar"];
  const counts = {};
  const errors = {};
  let merged = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      counts[names[i]] = s.value.length;
      merged = merged.concat(s.value);
    } else {
      counts[names[i]] = 0;
      errors[names[i]] = String((s.reason && s.reason.message) || s.reason);
    }
  });
  merged = dedupe(merged);
  merged.forEach((r) => {
    r.score = scoreResult(r, keywords);
  });
  merged.sort((a, b) => b.score - a.score);
  const out = {
    query: {
      title: q.title || "",
      keywords: q.keywords || "",
      field: q.field || "",
      abstract: q.abstract || "",
    },
    queryText,
    counts,
    total: merged.length,
    results: merged.slice(0, 50),
  };
  if (Object.keys(errors).length) out.errors = errors;
  return out;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const headers = corsHeaders();

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return json({ status: "ok", phase: 2 });
    }

    if (
      url.pathname === "/api/search" &&
      (request.method === "GET" || request.method === "POST")
    ) {
      try {
        let q;
        if (request.method === "POST") {
          q = await request.json();
        } else {
          q = {
            title: url.searchParams.get("title") || "",
            abstract: url.searchParams.get("abstract") || "",
            keywords: url.searchParams.get("keywords") || "",
            field: url.searchParams.get("field") || "",
          };
        }
        const out = await runSearch(q);
        if (out.error) return json(out, 400);
        return json(out);
      } catch (e) {
        return json({ error: "Search failed: " + (e.message || e) }, 500);
      }
    }

    return new Response("Not found", { status: 404, headers });
  },
};
