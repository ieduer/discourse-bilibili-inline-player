import { apiInitializer } from "discourse/lib/api";

const VIDEO_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "bilibili.com"]);
const SHORT_HOSTS = new Set(["b23.tv", "www.b23.tv", "bili2233.cn", "www.bili2233.cn"]);
const PLAYER_HOSTS = new Set(["player.bilibili.com"]);
const VIDEO_PATH_RE = /^\/(?:s\/)?video\/(BV[0-9A-Za-z]+|av\d+)\/?$/i;
const SHORT_VIDEO_PATH_RE = /^\/(?:video\/)?(BV[0-9A-Za-z]+|av\d+)(?:\/p(\d+))?\/?$/i;
const DEFAULT_ASPECT_RATIO = "16 / 9";
const JSONP_TIMEOUT_MS = 8000;

const themeSettings = globalThis.settings || {};
const wrapperState = new WeakMap();
const videoInfoCache = new Map();

function getBooleanSetting(name, fallback) {
  const value = themeSettings[name];
  return typeof value === "boolean" ? value : fallback;
}

function getIntegerSetting(name, fallback) {
  const value = Number.parseInt(themeSettings[name], 10);
  return Number.isInteger(value) ? value : fallback;
}

function getStringSetting(name, fallback) {
  const value = themeSettings[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function buildCanonicalUrl(id, page) {
  const url = new URL(`https://www.bilibili.com/video/${id}`);

  if (page > 1) {
    url.searchParams.set("p", String(page));
  }

  return url.toString();
}

function normalizeVideoId(rawId) {
  return /^BV/i.test(rawId) ? `BV${rawId.slice(2)}` : `av${rawId.slice(2)}`;
}

function createParsedVideo(rawId, page, extras = {}) {
  const normalizedId = normalizeVideoId(rawId);
  const parsed = {
    rawId: normalizedId,
    page,
    canonicalUrl: buildCanonicalUrl(normalizedId, page),
    ...extras,
  };

  if (/^BV/i.test(normalizedId)) {
    parsed.bvid = normalizedId;
  } else {
    parsed.aid = normalizedId.slice(2);
  }

  return parsed;
}

function parsePageNumber(...values) {
  for (const value of values) {
    const page = Number.parseInt(value, 10);

    if (Number.isInteger(page) && page > 0) {
      return page;
    }
  }

  return 1;
}

function parseVideoPageUrl(url) {
  if (!VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(VIDEO_PATH_RE);
  if (!match) {
    return null;
  }

  return createParsedVideo(match[1], parsePageNumber(url.searchParams.get("p")));
}

function parseShortVideoUrl(url) {
  if (!SHORT_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(SHORT_VIDEO_PATH_RE);
  if (!match) {
    return null;
  }

  return createParsedVideo(match[1], parsePageNumber(url.searchParams.get("p"), match[2]), {
    shortUrl: url.toString(),
  });
}

function parsePlayerUrl(url) {
  if (!PLAYER_HOSTS.has(url.hostname.toLowerCase()) || url.pathname !== "/player.html") {
    return null;
  }

  const bvid = url.searchParams.get("bvid");
  const aid = url.searchParams.get("aid");
  const cid = url.searchParams.get("cid");

  if (!bvid && !aid) {
    return null;
  }

  const rawId = bvid || `av${aid}`;
  const parsed = createParsedVideo(rawId, parsePageNumber(url.searchParams.get("p"), url.searchParams.get("page")), {
    officialPlayerUrl: url.toString(),
  });

  if (aid) {
    parsed.aid = aid;
  }

  if (cid) {
    parsed.cid = cid;
  }

  return parsed;
}

function parseBilibiliUrl(href) {
  let url;

  try {
    url = new URL(href);
  } catch {
    return null;
  }

  return parseVideoPageUrl(url) || parseShortVideoUrl(url) || parsePlayerUrl(url);
}

function buildIframeUrl(parsed) {
  const params = new URLSearchParams({
    isOutside: "true",
    page: String(parsed.page),
    as_wide: "1",
    high_quality: "1",
  });

  if (getBooleanSetting("autoplay_on_click", true)) {
    params.set("autoplay", "1");
  }

  if (parsed.bvid) {
    params.set("bvid", parsed.bvid);
  }

  if (parsed.aid) {
    params.set("aid", String(parsed.aid));
  }

  if (parsed.cid) {
    params.set("cid", String(parsed.cid));
  }

  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

function parseFirstSupportedUrl(...hrefs) {
  for (const href of hrefs) {
    if (!href) {
      continue;
    }

    const parsed = parseBilibiliUrl(href);

    if (parsed) {
      return parsed;
    }
  }

  return null;
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

function fetchVideoInfo(parsed) {
  const cacheKey = parsed.bvid ? `bvid:${parsed.bvid}` : `aid:${parsed.aid}`;

  if (!videoInfoCache.has(cacheKey)) {
    const params = new URLSearchParams();

    if (parsed.bvid) {
      params.set("bvid", parsed.bvid);
    } else {
      params.set("aid", parsed.aid);
    }

    videoInfoCache.set(
      cacheKey,
      loadJsonp(`https://api.bilibili.com/x/web-interface/view?${params.toString()}`).then((payload) => {
        if (!payload || payload.code !== 0 || !payload.data) {
          throw new Error("bilibili metadata payload was invalid");
        }

        return payload.data;
      })
    );
  }

  return videoInfoCache.get(cacheKey);
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

function normalizeMediaUrl(url) {
  if (!url) {
    return "";
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }

  return url;
}

function extractPoster(target) {
  const image = target.querySelector("img");
  return normalizeMediaUrl(image?.src || "");
}

function extractTitle(target, fallbackAnchor, parsed) {
  const titleElement =
    target.querySelector(".onebox-body h3 a, .onebox-body h3, h3 a, h3, a[href]") || fallbackAnchor;
  const title = titleElement?.textContent?.trim();

  if (title) {
    return title;
  }

  return parsed.bvid || (parsed.aid ? `av${parsed.aid}` : parsed.rawId);
}

function buildMetadata(target, fallbackAnchor, parsed) {
  return {
    parsed,
    title: extractTitle(target, fallbackAnchor, parsed),
    poster: extractPoster(target),
    canonicalUrl: parsed.canonicalUrl,
    metaLine: parsed.page > 1 ? `bilibili · P${parsed.page}` : "bilibili",
  };
}

function resolvePosterFromData(data, page) {
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  const pageData = pages.find((entry) => entry.page === page) || null;
  return normalizeMediaUrl(pageData?.first_frame || data?.pic || "");
}

function updateWrapperMetadata(wrapper, data) {
  if (!data) {
    return;
  }

  const state = wrapperState.get(wrapper);
  if (!state?.parsed) {
    return;
  }

  const resolvedAid = data.aid || state.parsed.aid;
  const canonicalId =
    data.bvid || state.parsed.bvid || (resolvedAid ? `av${resolvedAid}` : state.parsed.rawId);
  const canonicalUrl = buildCanonicalUrl(canonicalId, state.parsed.page);
  const title = data.title?.trim();
  const posterUrl = resolvePosterFromData(data, state.parsed.page);
  const titleElement = wrapper.querySelector(".bilibili-inline-player__title");
  const openLink = wrapper.querySelector(".bilibili-inline-player__footer-link");
  const media = wrapper.querySelector(".bilibili-inline-player__media");
  const existingPoster = wrapper.querySelector(".bilibili-inline-player__poster");
  const placeholder = wrapper.querySelector(".bilibili-inline-player__placeholder");

  state.parsed.canonicalUrl = canonicalUrl;
  wrapper.dataset.bilibiliUrl = canonicalUrl;

  if (openLink) {
    openLink.href = canonicalUrl;
  }

  if (title) {
    wrapper.dataset.bilibiliTitle = title;

    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  if (posterUrl && media) {
    if (existingPoster) {
      existingPoster.src = posterUrl;
      existingPoster.alt = wrapper.dataset.bilibiliTitle || title || "bilibili";
    } else {
      const poster = createElement("img", "bilibili-inline-player__poster");
      poster.src = posterUrl;
      poster.alt = wrapper.dataset.bilibiliTitle || title || "bilibili";
      poster.loading = "lazy";
      placeholder?.remove();
      media.prepend(poster);
    }
  }
}

function buildWrapper(metadata) {
  const wrapper = createElement("div", "bilibili-inline-player");
  const media = createElement("div", "bilibili-inline-player__media");
  const scrim = createElement("div", "bilibili-inline-player__scrim");
  const meta = createElement("div", "bilibili-inline-player__meta");
  const title = createElement("h3", "bilibili-inline-player__title", metadata.title);
  const subline = createElement("div", "bilibili-inline-player__subline", metadata.metaLine);
  const playButton = createElement("button", "bilibili-inline-player__play");
  const playIcon = createElement("span", "bilibili-inline-player__play-icon");
  const playLabel = createElement(
    "span",
    "bilibili-inline-player__play-label",
    getStringSetting("button_label", "点击播放")
  );
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerMeta = createElement("div", "bilibili-inline-player__footer-meta", "Official bilibili external player");

  wrapper.dataset.bilibiliUrl = metadata.canonicalUrl;
  wrapper.dataset.bilibiliMeta = metadata.metaLine;
  wrapper.dataset.bilibiliTitle = metadata.title;
  wrapper.style.setProperty("--bili-aspect-ratio", DEFAULT_ASPECT_RATIO);

  if (metadata.poster) {
    const poster = createElement("img", "bilibili-inline-player__poster");
    poster.src = metadata.poster;
    poster.alt = metadata.title;
    poster.loading = "lazy";
    media.appendChild(poster);
  } else {
    media.appendChild(createElement("div", "bilibili-inline-player__placeholder", "bilibili"));
  }

  playButton.type = "button";
  playButton.setAttribute("aria-label", `${getStringSetting("button_label", "点击播放")}: ${metadata.title}`);
  playButton.append(playIcon, playLabel);
  meta.append(title, subline);
  media.append(scrim, meta, playButton);
  footer.appendChild(footerMeta);

  if (getBooleanSetting("show_open_link", true)) {
    const link = createElement("a", "bilibili-inline-player__footer-link", "Open on bilibili");
    link.href = metadata.canonicalUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footer.appendChild(link);
  }

  wrapper.append(media, footer);
  playButton.addEventListener("click", () => activatePlayer(wrapper));
  wrapperState.set(wrapper, metadata);
  primeEmbedState(wrapper);

  return wrapper;
}

function setButtonLabel(wrapper, text) {
  const buttonLabel = wrapper.querySelector(".bilibili-inline-player__play-label");

  if (buttonLabel) {
    buttonLabel.textContent = text;
  }
}

function primeEmbedState(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || state.resolvePromise) {
    return;
  }

  const directEmbedReady = Boolean(state.parsed.cid && (state.parsed.bvid || state.parsed.aid));

  state.resolvePromise = fetchVideoInfo(state.parsed)
    .then((data) => {
      updateWrapperMetadata(wrapper, data);
      const pages = Array.isArray(data.pages) ? data.pages : [];
      const pageData = pages.find((page) => page.page === state.parsed.page) || null;
      const resolved = {
        page: state.parsed.page,
        bvid: data.bvid || state.parsed.bvid,
        aid: data.aid || state.parsed.aid,
        cid: pageData?.cid || state.parsed.cid || (state.parsed.page === 1 ? data.cid : null),
      };

      if (!resolved?.cid) {
        throw new Error("bilibili cid was unavailable");
      }

      state.iframeUrl = buildIframeUrl(resolved);
      state.externalOnly = false;
      return resolved;
    })
    .catch(() => {
      if (directEmbedReady) {
        state.iframeUrl = buildIframeUrl(state.parsed);
        state.externalOnly = false;
        return state.parsed;
      }

      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, "Open on bilibili");
      return null;
    });
}

async function activatePlayer(wrapper) {
  if (wrapper.dataset.bilibiliLoaded === "1" || wrapper.dataset.bilibiliLoading === "1") {
    return;
  }

  wrapper.dataset.bilibiliLoading = "1";

  const state = wrapperState.get(wrapper);
  setButtonLabel(wrapper, "加载中");

  if (state?.resolvePromise) {
    await state.resolvePromise;
  } else {
    primeEmbedState(wrapper);
    await state?.resolvePromise;
  }

  if (state?.externalOnly || !state?.iframeUrl) {
    wrapper.dataset.bilibiliLoading = "0";
    setButtonLabel(wrapper, "Open on bilibili");
    window.open(wrapper.dataset.bilibiliUrl, "_blank", "noopener,noreferrer");
    return;
  }

  wrapper.dataset.bilibiliLoading = "0";
  wrapper.dataset.bilibiliLoaded = "1";

  const frameWrap = createElement("div", "bilibili-inline-player__frame-wrap");
  const iframe = createElement("iframe", "bilibili-inline-player__frame");
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerMeta = createElement("div", "bilibili-inline-player__footer-meta", wrapper.dataset.bilibiliMeta);

  frameWrap.style.setProperty("--bili-aspect-ratio", DEFAULT_ASPECT_RATIO);
  iframe.src = state.iframeUrl;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.title = wrapper.dataset.bilibiliTitle || "bilibili player";

  frameWrap.appendChild(iframe);
  footer.appendChild(footerMeta);

  if (getBooleanSetting("show_open_link", true)) {
    const link = createElement("a", "bilibili-inline-player__footer-link", "Open on bilibili");
    link.href = wrapper.dataset.bilibiliUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footer.appendChild(link);
  }

  wrapper.replaceChildren(frameWrap, footer);
}

function collectOneboxCandidates(element) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];

  for (const block of element.querySelectorAll("aside.onebox[data-onebox-src], article.onebox[data-onebox-src]")) {
    if (results.length >= limit) {
      break;
    }

    if (block.dataset.bilibiliInlinePlayer) {
      continue;
    }

    const anchor = block.querySelector("a[href]");
    const parsed = parseFirstSupportedUrl(block.dataset.oneboxSrc, anchor?.href);

    if (!parsed) {
      continue;
    }

    results.push({
      target: block,
      anchor,
      parsed,
    });
  }

  return results;
}

function collectStandaloneCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const seen = new Set(existingTargets);

  for (const anchor of element.querySelectorAll("p > a[href]:only-child")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    const target = anchor.closest("p");

    if (!target || seen.has(target) || target.dataset.bilibiliInlinePlayer) {
      continue;
    }

    const parsed = parseBilibiliUrl(anchor.href);

    if (!parsed) {
      continue;
    }

    seen.add(target);
    results.push({ target, anchor, parsed });
  }

  return results;
}

function replaceCandidate(candidate) {
  candidate.target.dataset.bilibiliInlinePlayer = "processing";
  const replacement = buildWrapper(buildMetadata(candidate.target, candidate.anchor, candidate.parsed));
  replacement.dataset.bilibiliInlinePlayer = "done";
  candidate.target.replaceWith(replacement);
}

export default apiInitializer("1.8.0", (api) => {
  if (!getBooleanSetting("enabled", true)) {
    return;
  }

  api.decorateCookedElement((element) => {
    const oneboxCandidates = collectOneboxCandidates(element);
    const standaloneCandidates = collectStandaloneCandidates(
      element,
      oneboxCandidates.map((candidate) => candidate.target)
    );

    for (const candidate of [...oneboxCandidates, ...standaloneCandidates]) {
      replaceCandidate(candidate);
    }
  });
});
