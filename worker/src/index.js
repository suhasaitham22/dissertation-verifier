// Dissertation Verifier - Cloudflare Worker stub (Phase 0)
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({ status: "ok", phase: 0 });
    }
    if (url.pathname === "/api/search" && request.method === "GET") {
      return Response.json({ message: "search stub - phase 2" });
    }
    return new Response("Not found", { status: 404 });
  },
};
