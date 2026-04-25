export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "method_not_allowed" }, 405, request);
    }

    const requestUrl = new URL(request.url);
    const tweetUrl = requestUrl.searchParams.get("url") || "";

    if (!isSupportedTweetUrl(tweetUrl)) {
      return jsonResponse({ error: "unsupported_tweet_url" }, 400, request);
    }

    const upstreamUrl = new URL("https://publish.x.com/oembed");

    upstreamUrl.searchParams.set("omit_script", "1");
    upstreamUrl.searchParams.set("dnt", requestUrl.searchParams.get("dnt") || "true");
    upstreamUrl.searchParams.set("theme", requestUrl.searchParams.get("theme") || "light");
    upstreamUrl.searchParams.set("align", requestUrl.searchParams.get("align") || "center");
    upstreamUrl.searchParams.set("url", tweetUrl);

    const cache = caches.default;
    const cacheKey = new Request(upstreamUrl.toString(), { method: "GET" });
    const cached = await cache.match(cacheKey);

    if (cached) {
      return withCors(cached, request);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!upstreamResponse.ok) {
      return jsonResponse({ error: "upstream_failed", status: upstreamResponse.status }, upstreamResponse.status, request);
    }

    const payload = await upstreamResponse.json();

    if (!payload?.html || typeof payload.html !== "string") {
      return jsonResponse({ error: "invalid_upstream_payload" }, 502, request);
    }

    const response = jsonResponse(payload, 200, request, {
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};

function isSupportedTweetUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const supportedHost =
      hostname === "twitter.com" ||
      hostname === "www.twitter.com" ||
      hostname === "mobile.twitter.com" ||
      hostname === "x.com" ||
      hostname === "www.x.com" ||
      hostname === "mobile.x.com";

    return (
      url.protocol === "https:" &&
      supportedHost &&
      /^\/(?:(?:i\/(?:web\/)?status)|(?:[A-Za-z0-9_]{1,15}\/status(?:es)?))\/\d+(?:\/.*)?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function withCors(response, request) {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload, status, request, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...headers,
    },
  });
}
