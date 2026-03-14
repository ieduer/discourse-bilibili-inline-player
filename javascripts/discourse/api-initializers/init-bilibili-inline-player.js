import { apiInitializer } from "discourse/lib/api";

const SUPPORTED_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "bilibili.com"]);
const VIDEO_PATH_RE = /^\/video\/(BV[0-9A-Za-z]+|av\d+)\/?$/i;
const BLOCK_SELECTOR = "aside.onebox, article.onebox, p";
const SKIP_SELECTOR = "pre, code, .quote, .d-editor-preview code";
const JSONP_TIMEOUT_MS = 8000;
const DEFAULT_ASPECT_RATIO = "16 / 9";

const metadataCache = new Map();

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function ensureHttps(url) {
  if (!url) {
    return "";
  }

  return url.startsWith("//") ? `https:${url}` : url;
}

function formatDuration(seconds) {
  const total = parsePositiveInt(seconds) || 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function getAspectRatio(pageData) {
  const width = parsePositiveInt(pageData?.dimension?.width);
  const height = parsePositiveInt(pageData?.dimension?.height);

  if (!width || !height) {
    return DEFAULT_ASPECT_RATIO;
  }

  return `${width} / ${height}`;
}

function buildCanonicalUrl(id, page) {
  const url = new URL(`https://www.bilibili.com/video/${id}`);

  if (page > 1) {
    url.searchParams.set("p", String(page));
  }

  return url.toString();
}

function parseBilibiliUrl(href) {
  let url;

  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (!SUPPORTED_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(VIDEO_PATH_RE);
  if (!match) {
    return null;
  }

  const rawId = match[1];
  const page = parsePositiveInt(url.searchParams.get("p")) || 1;
  const result = {
    rawId,
    page,
    canonicalUrl: buildCanonicalUrl(rawId, page),
  };

  if (/^BV/i.test(rawId)) {
    result.bvid = rawId.toUpperCase();
  } else {
    result.aid = rawId.slice(2);
  }

  return result;
}

function loadJsonp(src) {
  return new Promise((resolve, reject) => {
    const callbackName = `__bili_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      settled = true;
      script.remove();

      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    };

    const timeout = window.setTimeout(() => {
      if (settled) {
        return;
      }

      cleanup();
      reject(new Error("bilibili metadata request timed out"));
    }, JSONP_TIMEOUT_MS);

    window[callbackName] = (payload) => {
      if (settled) {
        return;
      }

      window.clearTimeout(timeout);
      cleanup();
      resolve(payload);
    };

    script.async = true;
    script.src = `${src}${src.includes("?") ? "&" : "?"}jsonp=jsonp&callback=${callbackName}`;
    script.onerror = () => {
      if (settled) {
        return;
      }

      window.clearTimeout(timeout);
      cleanup();
      reject(new Error("bilibili metadata request failed"));
    };

    document.body.appendChild(script);
  });
}

function fetchMetadata(parsed) {
  const cacheKey = parsed.bvid ? `bvid:${parsed.bvid}` : `aid:${parsed.aid}`;

  if (!metadataCache.has(cacheKey)) {
    const params = new URLSearchParams();

    if (parsed.bvid) {
      params.set("bvid", parsed.bvid);
    } else {
      params.set("aid", parsed.aid);
    }

    metadataCache.set(
      cacheKey,
      loadJsonp(`https://api.bilibili.com/x/web-interface/view?${params.toString()}`).then((payload) => {
        if (!payload || payload.code !== 0 || !payload.data) {
          throw new Error("bilibili metadata payload was invalid");
        }

        return payload.data;
      })
    );
  }

  return metadataCache.get(cacheKey);
}

function selectPageData(data, requestedPage) {
  const pages = Array.isArray(data.pages) ? data.pages : [];

  if (pages.length === 0) {
    if (data.cid && requestedPage === 1) {
      return {
        cid: data.cid,
        page: 1,
        duration: data.duration,
        dimension: null,
        part: "",
      };
    }

    return null;
  }

  return pages.find((page) => page.page === requestedPage) || null;
}

function normalizeMetadata(parsed, data) {
  const pageData = selectPageData(data, parsed.page);

  if (!pageData?.cid) {
    return null;
  }

  const effectiveBvid = data.bvid || parsed.bvid || "";
  const effectiveAid = data.aid || parsed.aid || "";
  const poster = ensureHttps(data.pic);
  const isPosterUsable = poster && !poster.includes("/transparent.png");

  return {
    aid: effectiveAid,
    bvid: effectiveBvid,
    cid: pageData.cid,
    page: pageData.page || parsed.page || 1,
    title: data.title || parsed.rawId,
    canonicalUrl: buildCanonicalUrl(effectiveBvid || `av${effectiveAid}`, pageData.page || parsed.page || 1),
    poster,
    isPosterUsable,
    duration: pageData.duration || data.duration || 0,
    part: pageData.part || "",
    ownerName: data.owner?.name || "",
    aspectRatio: getAspectRatio(pageData),
  };
}

function buildIframeUrl(metadata) {
  const params = new URLSearchParams({
    cid: String(metadata.cid),
    page: String(metadata.page),
    as_wide: "1",
    high_quality: "1",
  });

  if (settings.autoplay_on_click) {
    params.set("autoplay", "1");
  }

  if (metadata.bvid) {
    params.set("bvid", metadata.bvid);
  } else if (metadata.aid) {
    params.set("aid", String(metadata.aid));
  }

  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (typeof text === "string") {
    element.textContent = text;
  }

  return element;
}

function buildMetaLine(metadata) {
  const parts = ["bilibili"];

  if (metadata.ownerName) {
    parts.push(metadata.ownerName);
  }

  if (metadata.duration) {
    parts.push(formatDuration(metadata.duration));
  }

  if (metadata.page > 1) {
    parts.push(`P${metadata.page}`);
  }

  if (metadata.part) {
    parts.push(metadata.part);
  }

  return parts.join(" · ");
}

function buildWrapper(metadata) {
  const wrapper = createElement("div", "bilibili-inline-player");
  const media = createElement("div", "bilibili-inline-player__media");
  const scrim = createElement("div", "bilibili-inline-player__scrim");
  const meta = createElement("div", "bilibili-inline-player__meta");
  const title = createElement("h3", "bilibili-inline-player__title", metadata.title);
  const subline = createElement("div", "bilibili-inline-player__subline", buildMetaLine(metadata));
  const playButton = createElement("button", "bilibili-inline-player__play");
  const playIcon = createElement("span", "bilibili-inline-player__play-icon");
  const playLabel = createElement("span", "bilibili-inline-player__play-label", settings.button_label);
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerMeta = createElement("div", "bilibili-inline-player__footer-meta", "Official bilibili external player");

  wrapper.style.setProperty("--bili-aspect-ratio", metadata.aspectRatio);
  wrapper.dataset.bilibiliUrl = metadata.canonicalUrl;
  wrapper.dataset.bilibiliIframe = buildIframeUrl(metadata);
  wrapper.dataset.bilibiliMeta = buildMetaLine(metadata);
  wrapper.dataset.bilibiliAspectRatio = metadata.aspectRatio;
  wrapper.dataset.bilibiliTitle = metadata.title;

  if (metadata.isPosterUsable) {
    const poster = createElement("img", "bilibili-inline-player__poster");
    poster.src = metadata.poster;
    poster.alt = metadata.title;
    poster.loading = "lazy";
    media.appendChild(poster);
  } else {
    media.appendChild(createElement("div", "bilibili-inline-player__placeholder", "bilibili"));
  }

  playButton.type = "button";
  playButton.setAttribute("aria-label", `${settings.button_label}: ${metadata.title}`);

  playButton.append(playIcon, playLabel);
  meta.append(title, subline);
  media.append(scrim, meta, playButton);
  footer.appendChild(footerMeta);

  if (settings.show_open_link) {
    const link = createElement("a", "bilibili-inline-player__footer-link", "Open on bilibili");
    link.href = metadata.canonicalUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footer.appendChild(link);
  }

  wrapper.append(media, footer);
  playButton.addEventListener("click", () => activatePlayer(wrapper));

  return wrapper;
}

function activatePlayer(wrapper) {
  if (wrapper.dataset.bilibiliLoaded === "1") {
    return;
  }

  wrapper.dataset.bilibiliLoaded = "1";

  const frameWrap = createElement("div", "bilibili-inline-player__frame-wrap");
  const iframe = createElement("iframe", "bilibili-inline-player__frame");
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerMeta = createElement("div", "bilibili-inline-player__footer-meta", wrapper.dataset.bilibiliMeta);

  frameWrap.style.setProperty("--bili-aspect-ratio", wrapper.dataset.bilibiliAspectRatio || DEFAULT_ASPECT_RATIO);
  iframe.src = wrapper.dataset.bilibiliIframe;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.title = wrapper.dataset.bilibiliTitle || "bilibili player";

  frameWrap.appendChild(iframe);
  footer.appendChild(footerMeta);

  if (settings.show_open_link) {
    const link = createElement("a", "bilibili-inline-player__footer-link", "Open on bilibili");
    link.href = wrapper.dataset.bilibiliUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footer.appendChild(link);
  }

  wrapper.replaceChildren(frameWrap, footer);
}

function findReplacementTarget(anchor) {
  if (anchor.closest(SKIP_SELECTOR)) {
    return null;
  }

  const block = anchor.closest(BLOCK_SELECTOR);

  if (!block || block.dataset.bilibiliInlinePlayer) {
    return null;
  }

  if (block.matches("p")) {
    const links = block.querySelectorAll("a");

    if (links.length !== 1 || links[0] !== anchor) {
      return null;
    }

    if (block.textContent.trim() !== anchor.textContent.trim()) {
      return null;
    }
  }

  return block;
}

async function enhanceAnchor(anchor, target) {
  const parsed = parseBilibiliUrl(anchor.href);

  if (!parsed) {
    return;
  }

  target.dataset.bilibiliInlinePlayer = "processing";

  try {
    const data = await fetchMetadata(parsed);
    const metadata = normalizeMetadata(parsed, data);

    if (!metadata) {
      target.dataset.bilibiliInlinePlayer = "failed";
      return;
    }

    const replacement = buildWrapper(metadata);
    replacement.dataset.bilibiliInlinePlayer = "done";
    target.replaceWith(replacement);
  } catch {
    target.dataset.bilibiliInlinePlayer = "failed";
  }
}

function collectCandidates(element) {
  const anchors = element.querySelectorAll("a[href*='bilibili.com/video/']");
  const results = [];
  const seen = new Set();
  const limit = Math.max(1, settings.max_embeds_per_post || 4);

  for (const anchor of anchors) {
    if (results.length >= limit) {
      break;
    }

    const target = findReplacementTarget(anchor);

    if (!target || seen.has(target)) {
      continue;
    }

    if (!parseBilibiliUrl(anchor.href)) {
      continue;
    }

    seen.add(target);
    results.push({ anchor, target });
  }

  return results;
}

export default apiInitializer("1.8.0", (api) => {
  if (!settings.enabled) {
    return;
  }

  api.decorateCookedElement((element) => {
    for (const { anchor, target } of collectCandidates(element)) {
      enhanceAnchor(anchor, target);
    }
  });
});
