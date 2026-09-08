const RAILWAY_API =
  "https://concierge-api-production-3d90.up.railway.app";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // VOXI API proxy
    if (url.pathname.startsWith("/api/")) {

      // Remove the Cloudflare-side "/api" prefix.
      // /api/widget/session -> /widget/session
      const railwayPath =
        url.pathname.replace(/^\/api/, "");

      const targetUrl =
        RAILWAY_API +
        railwayPath +
        url.search;

      const proxyRequest =
        new Request(
          targetUrl,
          request
        );

      const response =
        await fetch(proxyRequest);

      // Add a diagnostic header so we can
      // confirm Cloudflare handled the proxy.
      const headers =
        new Headers(response.headers);

      headers.set(
        "x-voxi-proxy",
        "cloudflare"
      );

      return new Response(
        response.body,
        {
          status: response.status,
          statusText: response.statusText,
          headers
        }
      );
    }

    // Static VOX website
    return env.ASSETS.fetch(request);
  }
};
