const RAILWAY_API =
  "https://concierge-api-production-3d90.up.railway.app";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // VOXI bot API calls
    if (url.pathname.startsWith("/api/")) {
      const targetUrl =
        RAILWAY_API +
        url.pathname +
        url.search;

      const proxyRequest = new Request(
        targetUrl,
        request
      );

      return fetch(proxyRequest);
    }

    // Everything else = your VOX website
    return env.ASSETS.fetch(request);
  }
};
