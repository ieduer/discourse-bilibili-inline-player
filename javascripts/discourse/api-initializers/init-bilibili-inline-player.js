import { apiInitializer } from "discourse/lib/api";

const VIDEO_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "bilibili.com"]);
const ARTICLE_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com"]);
const DYNAMIC_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "t.bilibili.com"]);
const LIVE_HOSTS = new Set(["live.bilibili.com", "www.live.bilibili.com"]);
const SHORT_HOSTS = new Set(["b23.tv", "www.b23.tv", "bili2233.cn", "www.bili2233.cn"]);
const PLAYER_HOSTS = new Set(["player.bilibili.com"]);
const NETEASE_HOSTS = new Set(["music.163.com", "y.music.163.com"]);
const VIDEO_PATH_RE = /^\/(?:s\/)?video\/(BV[0-9A-Za-z]+|av\d+)\/?$/i;
const SHORT_VIDEO_PATH_RE = /^\/(?:video\/)?(BV[0-9A-Za-z]+|av\d+)(?:\/p(\d+))?\/?$/i;
const BANGUMI_PATH_RE = /^\/bangumi\/play\/(ep|ss)(\d+)\/?$/i;
const AUDIO_PATH_RE = /^\/audio\/(au|am)(\d+)\/?$/i;
const ARTICLE_PATH_RE = /^\/read\/cv(\d+)\/?$/i;
const OPUS_PATH_RE = /^\/opus\/(\d+)\/?$/i;
const DYNAMIC_PATH_RE = /^\/(\d+)\/?$/i;
const LIVE_PATH_RE = /^\/(?:blanc\/)?(\d+)\/?$/i;
const LIVE_IFRAME_PATH_RE = /^\/blackboard\/live\/live-mobile-playerV3\.html$/i;
const LIVE_IFRAME_FALLBACK_PATH_RE = /^\/blackboard\/live\/live-activity-player\.html$/i;
const BILIBILI_COMPAT_PLAYER_PATH_RE = /^\/blackboard\/webplayer\/mbplayer\.html$/i;
const NETEASE_OUTCHAIN_PATH_RE = /^\/(?:m\/)?outchain\/player$/i;
const IFRAME_SRC_RE = /<iframe\b[^>]*\bsrc=(["'])([^"']+)\1/gi;
const URL_LIKE_RE =
  /((?:https?:)?\/\/(?:player\.bilibili\.com\/player\.html|www\.bilibili\.com\/blackboard\/(?:live\/live-mobile-playerV3|live\/live-activity-player|webplayer\/mbplayer)\.html|(?:www\.|m\.)?bilibili\.com\/(?:s\/)?video\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/bangumi\/play\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/audio\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/read\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/opus\/[^\s"'<>]+|t\.bilibili\.com\/[^\s"'<>]+|live\.bilibili\.com\/[^\s"'<>]+|(?:www\.)?(?:b23\.tv|bili2233\.cn)\/[^\s"'<>]+|(?:y\.)?music\.163\.com\/[^\s"'<>]+))/gi;
const DEFAULT_ASPECT_RATIO = "16 / 9";
const JSONP_TIMEOUT_MS = 8000;
const BILIBILI_STUCK_HELP_DELAY_MS = 5000;
const NETEASE_OUTCHAIN_TYPE_BY_MEDIA = {
  playlist: "0",
  album: "1",
  song: "2",
  program: "3",
  djradio: "4",
};
const NETEASE_MEDIA_BY_OUTCHAIN_TYPE = Object.fromEntries(
  Object.entries(NETEASE_OUTCHAIN_TYPE_BY_MEDIA).map(([mediaType, type]) => [type, mediaType])
);

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

function buildVideoCanonicalUrl(id, page) {
  const url = new URL(`https://www.bilibili.com/video/${id}`);

  if (page > 1) {
    url.searchParams.set("p", String(page));
  }

  return url.toString();
}

function buildBangumiCanonicalUrl(episodeId, seasonId) {
  if (episodeId) {
    return `https://www.bilibili.com/bangumi/play/ep${episodeId}`;
  }

  return `https://www.bilibili.com/bangumi/play/ss${seasonId}`;
}

function buildLiveCanonicalUrl(roomId) {
  return `https://live.bilibili.com/${roomId}`;
}

function buildAudioCanonicalUrl(audioId, isPlaylist = false) {
  return `https://www.bilibili.com/audio/${isPlaylist ? "am" : "au"}${audioId}`;
}

function buildArticleCanonicalUrl(articleId) {
  return `https://www.bilibili.com/read/cv${articleId}`;
}

function buildOpusCanonicalUrl(opusId) {
  return `https://www.bilibili.com/opus/${opusId}`;
}

function buildDynamicCanonicalUrl(dynamicId) {
  return `https://t.bilibili.com/${dynamicId}`;
}

function buildNetEaseCanonicalUrl(mediaType, itemId) {
  switch (mediaType) {
    case "playlist":
      return `https://music.163.com/playlist?id=${itemId}`;
    case "album":
      return `https://music.163.com/album?id=${itemId}`;
    case "program":
      return `https://music.163.com/program?id=${itemId}`;
    case "djradio":
      return `https://music.163.com/djradio?id=${itemId}`;
    case "song":
    default:
      return `https://music.163.com/song?id=${itemId}`;
  }
}

function normalizeVideoId(rawId) {
  return /^BV/i.test(rawId) ? `BV${rawId.slice(2)}` : `av${rawId.slice(2)}`;
}

function createParsedVideo(rawId, page, extras = {}) {
  const normalizedId = normalizeVideoId(rawId);
  const parsed = {
    provider: "bilibili",
    kind: "video",
    rawId: normalizedId,
    page,
    canonicalUrl: buildVideoCanonicalUrl(normalizedId, page),
    ...extras,
  };

  if (/^BV/i.test(normalizedId)) {
    parsed.bvid = normalizedId;
  } else {
    parsed.aid = normalizedId.slice(2);
  }

  return parsed;
}

function createParsedBangumi({ episodeId = "", seasonId = "", extras = {} }) {
  return {
    provider: "bilibili",
    kind: "bangumi",
    episodeId,
    seasonId,
    page: 1,
    rawId: episodeId ? `ep${episodeId}` : `ss${seasonId}`,
    canonicalUrl: buildBangumiCanonicalUrl(episodeId, seasonId),
    ...extras,
  };
}

function createParsedLive(roomId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "live",
    roomId,
    page: 1,
    rawId: String(roomId),
    canonicalUrl: buildLiveCanonicalUrl(roomId),
    ...extras,
  };
}

function createParsedAudio(audioId, isPlaylist = false, extras = {}) {
  return {
    provider: "bilibili",
    kind: "audio",
    audioId,
    isPlaylist,
    page: 1,
    rawId: `${isPlaylist ? "am" : "au"}${audioId}`,
    canonicalUrl: buildAudioCanonicalUrl(audioId, isPlaylist),
    ...extras,
  };
}

function createParsedArticle(articleId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "article",
    articleId,
    page: 1,
    rawId: `cv${articleId}`,
    canonicalUrl: buildArticleCanonicalUrl(articleId),
    ...extras,
  };
}

function createParsedOpus(opusId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "opus",
    opusId,
    page: 1,
    rawId: String(opusId),
    canonicalUrl: buildOpusCanonicalUrl(opusId),
    ...extras,
  };
}

function createParsedDynamic(dynamicId, extras = {}) {
  return {
    provider: "bilibili",
    kind: "dynamic",
    dynamicId,
    page: 1,
    rawId: String(dynamicId),
    canonicalUrl: buildDynamicCanonicalUrl(dynamicId),
    ...extras,
  };
}

function createParsedNetEase(mediaType, itemId, extras = {}) {
  return {
    provider: "netease",
    kind: "netease",
    mediaType,
    itemId: String(itemId),
    outchainType: NETEASE_OUTCHAIN_TYPE_BY_MEDIA[mediaType],
    page: 1,
    rawId: `${mediaType}:${itemId}`,
    canonicalUrl: buildNetEaseCanonicalUrl(mediaType, itemId),
    ...extras,
  };
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

function parseBangumiPageUrl(url) {
  if (!VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(BANGUMI_PATH_RE);

  if (!match) {
    return null;
  }

  return match[1].toLowerCase() === "ep"
    ? createParsedBangumi({ episodeId: match[2] })
    : createParsedBangumi({ seasonId: match[2] });
}

function parseLivePageUrl(url) {
  if (!LIVE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(LIVE_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedLive(match[1]);
}

function parseAudioPageUrl(url) {
  if (!VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(AUDIO_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedAudio(match[2], match[1].toLowerCase() === "am");
}

function parseArticlePageUrl(url) {
  if (!ARTICLE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const directMatch = url.pathname.match(ARTICLE_PATH_RE);

  if (directMatch) {
    return createParsedArticle(directMatch[1]);
  }

  if (url.pathname === "/read/mobile" && /^\d+$/.test(url.searchParams.get("id") || "")) {
    return createParsedArticle(url.searchParams.get("id"));
  }

  return null;
}

function parseOpusPageUrl(url) {
  if (!DYNAMIC_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(OPUS_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedOpus(match[1]);
}

function parseDynamicPageUrl(url) {
  if (url.hostname.toLowerCase() !== "t.bilibili.com") {
    return null;
  }

  const match = url.pathname.match(DYNAMIC_PATH_RE);

  if (!match) {
    return null;
  }

  return createParsedDynamic(match[1]);
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
  const episodeId = url.searchParams.get("episodeId");
  const seasonId = url.searchParams.get("seasonId");

  if (episodeId || seasonId) {
    return createParsedBangumi({
      episodeId: episodeId || "",
      seasonId: seasonId || "",
      extras: {
        officialPlayerUrl: url.toString(),
      },
    });
  }

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

function parseLiveIframeUrl(url) {
  if (url.hostname.toLowerCase() !== "www.bilibili.com") {
    return null;
  }

  const isMobilePlayer = LIVE_IFRAME_PATH_RE.test(url.pathname);
  const isActivityPlayer = LIVE_IFRAME_FALLBACK_PATH_RE.test(url.pathname);

  if (!isMobilePlayer && !isActivityPlayer) {
    return null;
  }

  const roomId = url.searchParams.get("roomId") || url.searchParams.get("cid");

  if (!/^\d+$/.test(roomId || "")) {
    return null;
  }

  return createParsedLive(roomId, {
    officialLivePlayerUrl: url.toString(),
    preferMobileLivePlayer: isMobilePlayer,
    activityCid: isActivityPlayer ? roomId : "",
  });
}

function parseCompatPlayerUrl(url) {
  if (url.hostname.toLowerCase() !== "www.bilibili.com" || !BILIBILI_COMPAT_PLAYER_PATH_RE.test(url.pathname)) {
    return null;
  }

  const bvid = url.searchParams.get("bvid");
  const aid = url.searchParams.get("aid");
  const cid = url.searchParams.get("cid");
  const episodeId = url.searchParams.get("episodeId");
  const seasonId = url.searchParams.get("seasonId");

  if (episodeId || seasonId) {
    return createParsedBangumi({
      episodeId: episodeId || "",
      seasonId: seasonId || "",
      extras: {
        compatibilityPlayerUrl: url.toString(),
      },
    });
  }

  if (!bvid && !aid) {
    return null;
  }

  const rawId = bvid || `av${aid}`;
  const parsed = createParsedVideo(rawId, parsePageNumber(url.searchParams.get("p"), url.searchParams.get("page")), {
    compatibilityPlayerUrl: url.toString(),
  });

  if (aid) {
    parsed.aid = aid;
  }

  if (cid) {
    parsed.cid = cid;
  }

  return parsed;
}

function normalizeNetEaseRoutePath(pathname) {
  if (!pathname) {
    return "/";
  }

  if (pathname.startsWith("/m/")) {
    return pathname.slice(2);
  }

  return pathname;
}

function parseNetEaseRoute(routeUrl) {
  const pathname = normalizeNetEaseRoutePath(routeUrl.pathname);
  const id = routeUrl.searchParams.get("id");

  if (!/^\d+$/.test(id || "")) {
    return null;
  }

  switch (pathname) {
    case "/song":
      return createParsedNetEase("song", id);
    case "/playlist":
      return createParsedNetEase("playlist", id);
    case "/album":
      return createParsedNetEase("album", id);
    case "/program":
      return createParsedNetEase("program", id);
    case "/dj":
    case "/djradio":
      return createParsedNetEase("djradio", id);
    default:
      return null;
  }
}

function parseNetEaseOutchainUrl(url) {
  if (url.hostname.toLowerCase() !== "music.163.com" || !NETEASE_OUTCHAIN_PATH_RE.test(url.pathname)) {
    return null;
  }

  const mediaType = NETEASE_MEDIA_BY_OUTCHAIN_TYPE[url.searchParams.get("type") || ""];
  const itemId = url.searchParams.get("id");

  if (!mediaType || !/^\d+$/.test(itemId || "")) {
    return null;
  }

  const height = Number.parseInt(url.searchParams.get("height"), 10);

  return createParsedNetEase(mediaType, itemId, {
    officialPlayerUrl: url.toString(),
    outchainHeight: Number.isInteger(height) && height > 0 ? height : null,
  });
}

function parseNetEasePageUrl(url) {
  if (!NETEASE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const outchainParsed = parseNetEaseOutchainUrl(url);
  if (outchainParsed) {
    return outchainParsed;
  }

  const directParsed = parseNetEaseRoute(url);
  if (directParsed) {
    return directParsed;
  }

  if (url.hash?.startsWith("#/")) {
    try {
      const hashRoute = new URL(`https://music.163.com${url.hash.slice(1)}`);
      return parseNetEaseRoute(hashRoute);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeUrlLikeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`.replace(/[),.;]+$/u, "");
  }

  return trimmed.replace(/[),.;]+$/u, "");
}

function parseBilibiliUrl(href) {
  let url;

  try {
    url = new URL(normalizeUrlLikeString(href));
  } catch {
    return null;
  }

  return (
    parseVideoPageUrl(url) ||
    parseBangumiPageUrl(url) ||
    parseLivePageUrl(url) ||
    parseAudioPageUrl(url) ||
    parseArticlePageUrl(url) ||
    parseOpusPageUrl(url) ||
    parseDynamicPageUrl(url) ||
    parseShortVideoUrl(url) ||
    parsePlayerUrl(url) ||
    parseLiveIframeUrl(url) ||
    parseCompatPlayerUrl(url) ||
    parseNetEasePageUrl(url)
  );
}

function buildIframeUrl(parsed) {
  if (parsed.kind === "netease") {
    return buildNetEaseIframeUrl(parsed, getBooleanSetting("autoplay_on_click", true));
  }

  if (parsed.kind === "bangumi") {
    const params = new URLSearchParams();

    if (parsed.episodeId) {
      params.set("episodeId", String(parsed.episodeId));
    }

    if (parsed.seasonId) {
      params.set("seasonId", String(parsed.seasonId));
    }

    if (getBooleanSetting("autoplay_on_click", true)) {
      params.set("autoplay", "1");
    }

    return `https://player.bilibili.com/player.html?${params.toString()}`;
  }

  if (parsed.kind === "live") {
    return buildLiveIframeUrl(parsed);
  }

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

function buildNoAutoplayIframeUrl(parsed) {
  if (parsed.kind === "netease") {
    return buildNetEaseIframeUrl(parsed, false);
  }

  if (parsed.kind === "bangumi") {
    const params = new URLSearchParams();

    if (parsed.episodeId) {
      params.set("episodeId", String(parsed.episodeId));
    }

    if (parsed.seasonId) {
      params.set("seasonId", String(parsed.seasonId));
    }

    return `https://player.bilibili.com/player.html?${params.toString()}`;
  }

  const isVideoLike = parsed.kind === "video" || (!parsed.kind && (parsed.bvid || parsed.aid));

  if (!isVideoLike) {
    return "";
  }

  const params = new URLSearchParams({
    isOutside: "true",
    page: String(parsed.page),
    as_wide: "1",
    high_quality: "1",
  });

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

function buildLiveIframeUrl(parsed) {
  const liveId = String(parsed.activityCid || parsed.roomId);
  const shouldPreferActivityPlayer =
    !parsed.preferMobileLivePlayer && (/^\d{7,}$/.test(liveId) || Boolean(parsed.activityCid));

  if (shouldPreferActivityPlayer) {
    const params = new URLSearchParams({
      cid: liveId,
      quality: "1",
      entrance: "1",
      reload: "1",
      danmaku: getBooleanSetting("enable_live_danmaku", true) ? "1" : "0",
      fullscreen: "1",
      send: "0",
      recommend: "0",
      logo: "0",
      mute: "0",
      enableCtrlUI: "1",
      enableAutoPlayTips: "1",
    });

    return `https://www.bilibili.com/blackboard/live/live-activity-player.html?${params.toString()}`;
  }

  const params = new URLSearchParams({
    roomId: String(parsed.roomId),
    danmaku: getBooleanSetting("enable_live_danmaku", true) ? "1" : "0",
  });

  return `https://www.bilibili.com/blackboard/live/live-mobile-playerV3.html?${params.toString()}`;
}

function getNetEaseEmbedHeight(parsed) {
  if (Number.isInteger(parsed.outchainHeight) && parsed.outchainHeight > 0) {
    return parsed.outchainHeight;
  }

  return parsed.mediaType === "song" || parsed.mediaType === "program" ? 66 : 430;
}

function buildNetEaseIframeUrl(parsed, autoplay) {
  const params = new URLSearchParams({
    type: parsed.outchainType,
    id: String(parsed.itemId),
    auto: autoplay ? "1" : "0",
    height: String(getNetEaseEmbedHeight(parsed)),
  });

  const basePath = getClientEnvironment().isMobileLike
    ? "https://music.163.com/m/outchain/player"
    : "https://music.163.com/outchain/player";

  return `${basePath}?${params.toString()}`;
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

function extractUrlsFromText(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  const urls = [];

  for (const match of text.matchAll(IFRAME_SRC_RE)) {
    urls.push(normalizeUrlLikeString(match[2]));
  }

  for (const match of text.matchAll(URL_LIKE_RE)) {
    urls.push(normalizeUrlLikeString(match[1]));
  }

  return [...new Set(urls.filter(Boolean))];
}

function getMetaLine(parsed) {
  switch (parsed.kind) {
    case "video":
      return parsed.page > 1 ? `bilibili video · P${parsed.page}` : "bilibili video";
    case "bangumi":
      return parsed.episodeId ? "bilibili bangumi · episode" : "bilibili bangumi · season";
    case "live":
      return "bilibili live";
    case "audio":
      return parsed.isPlaylist ? "bilibili audio · playlist" : "bilibili audio";
    case "article":
      return "bilibili article";
    case "opus":
      return "bilibili opus";
    case "dynamic":
      return "bilibili dynamic";
    case "netease":
      return getNetEaseMetaLine(parsed);
    default:
      return "bilibili";
  }
}

function getNetEaseMetaLine(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return "NetEase Cloud Music playlist";
    case "album":
      return "NetEase Cloud Music album";
    case "program":
      return "NetEase Cloud Music DJ program";
    case "djradio":
      return "NetEase Cloud Music DJ radio";
    case "song":
    default:
      return "NetEase Cloud Music song";
  }
}

function getClientEnvironment() {
  const userAgent = (globalThis.navigator?.userAgent || "").toLowerCase();
  const platform = (globalThis.navigator?.platform || "").toLowerCase();
  const maxTouchPoints = globalThis.navigator?.maxTouchPoints || 0;
  const isIPadOSDesktop = /mac/.test(platform) && maxTouchPoints > 1;
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || isIPadOSDesktop;
  const isAndroid = /android/.test(userAgent);
  const isMobileLike = isIOS || isAndroid;

  return {
    userAgent,
    platform,
    maxTouchPoints,
    isIPadOSDesktop,
    isIOS,
    isAndroid,
    isMobileLike,
  };
}

function detectEmbedEnvironmentRisk(provider = "bilibili") {
  if (provider !== "bilibili") {
    return {
      level: "none",
      message: "",
    };
  }

  const { userAgent, isIOS } = getClientEnvironment();
  const isInAppBrowser =
    /micromessenger|weibo|qq\/|qqbrowser|aliapp|dingtalk|baiduboxapp|toutiao|newsarticle/.test(userAgent);
  const isAndroidWebView = /; wv\)/.test(userAgent) || /\bversion\/[\d.]+ chrome\/[\d.]+ mobile safari\/[\d.]+\b/.test(userAgent);

  if (isInAppBrowser || isAndroidWebView) {
    return {
      level: "hard",
      message: "当前内置浏览器对 bilibili 第三方播放器兼容性较差，优先在 B 站打开更稳。",
    };
  }

  if (isIOS) {
    return {
      level: "soft",
      message: "当前设备上 bilibili iframe 可能被降级，如遇卡住请改用 B 站打开。",
    };
  }

  return {
    level: "none",
    message: "",
  };
}

function getFallbackTitle(parsed) {
  switch (parsed.kind) {
    case "video":
      return parsed.bvid || (parsed.aid ? `av${parsed.aid}` : parsed.rawId);
    case "bangumi":
      return parsed.episodeId ? `番剧 EP${parsed.episodeId}` : `番剧 SS${parsed.seasonId}`;
    case "live":
      return `直播间 ${parsed.roomId}`;
    case "audio":
      return parsed.isPlaylist ? `音频歌单 am${parsed.audioId}` : `音频 au${parsed.audioId}`;
    case "article":
      return `专栏 cv${parsed.articleId}`;
    case "opus":
      return `动态 opus ${parsed.opusId}`;
    case "dynamic":
      return `动态 ${parsed.dynamicId}`;
    case "netease":
      return getNetEaseFallbackTitle(parsed);
    default:
      return parsed.rawId || "bilibili";
  }
}

function getNetEaseFallbackTitle(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return `网易云歌单 ${parsed.itemId}`;
    case "album":
      return `网易云专辑 ${parsed.itemId}`;
    case "program":
      return `网易云播客节目 ${parsed.itemId}`;
    case "djradio":
      return `网易云播客 ${parsed.itemId}`;
    case "song":
    default:
      return `网易云单曲 ${parsed.itemId}`;
  }
}

function isKnownInlineKind(parsed) {
  if (parsed.kind === "video" || parsed.kind === "bangumi" || parsed.kind === "netease") {
    return true;
  }

  if (parsed.kind === "live") {
    return getBooleanSetting("enable_experimental_live_embed", true);
  }

  return false;
}

function getInitialButtonLabel(parsed) {
  return isKnownInlineKind(parsed) ? getStringSetting("button_label", "点击播放") : getOpenLabel(parsed);
}

function getFooterMeta(parsed) {
  switch (parsed.kind) {
    case "video":
    case "bangumi":
      return "Official bilibili external player";
    case "live":
      return getBooleanSetting("enable_experimental_live_embed", true)
        ? getLiveFooterMeta(parsed)
        : "Open on bilibili live";
    case "audio":
      return "Open on bilibili audio";
    case "article":
      return "Open on bilibili article";
    case "opus":
    case "dynamic":
      return "Open on bilibili";
    case "netease":
      return getNetEaseFooterMeta(parsed);
    default:
      return "bilibili";
  }
}

function getNetEaseFooterMeta(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
    case "album":
    case "djradio":
      return "Official NetEase Cloud Music outchain player";
    case "program":
      return "Official NetEase Cloud Music outchain player";
    case "song":
    default:
      return "Official NetEase Cloud Music outchain player";
  }
}

function getLiveFooterMeta(parsed) {
  const liveId = String(parsed.activityCid || parsed.roomId);
  const usesActivityPlayer = !parsed.preferMobileLivePlayer && (/^\d{7,}$/.test(liveId) || Boolean(parsed.activityCid));

  return usesActivityPlayer
    ? "Official bilibili live activity player"
    : "Official bilibili live H5 player";
}

function getOpenLabel(parsed) {
  return parsed.provider === "netease" ? "Open on NetEase Cloud Music" : "Open on bilibili";
}

function getEmbedTitle(parsed) {
  return parsed.provider === "netease" ? "NetEase Cloud Music player" : "bilibili player";
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

function getPlaceholderLabel(parsedOrProvider) {
  const provider =
    typeof parsedOrProvider === "string" ? parsedOrProvider : parsedOrProvider?.provider || "bilibili";
  return provider === "netease" ? "NetEase Cloud Music" : "bilibili";
}

function ensurePosterPlaceholder(media) {
  if (!media || media.querySelector(".bilibili-inline-player__placeholder")) {
    return;
  }

  media.prepend(
    createElement("div", "bilibili-inline-player__placeholder", media.dataset.placeholderLabel || "bilibili")
  );
}

function configurePosterElement(poster, title, fallbackUrl = "") {
  poster.alt = title || "bilibili";
  poster.loading = "lazy";
  poster.referrerPolicy = "no-referrer";
  poster.dataset.bilibiliFallbackPoster = fallbackUrl || "";
  poster.onerror = () => {
    const nextFallback = poster.dataset.bilibiliFallbackPoster;

    if (nextFallback && poster.src !== nextFallback) {
      poster.dataset.bilibiliFallbackPoster = "";
      poster.src = nextFallback;
      return;
    }

    const media = poster.parentElement;
    poster.remove();
    ensurePosterPlaceholder(media);
  };
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

  return getFallbackTitle(parsed);
}

function buildMetadata(target, fallbackAnchor, parsed) {
  return {
    parsed,
    title: extractTitle(target, fallbackAnchor, parsed),
    poster: extractPoster(target),
    canonicalUrl: parsed.canonicalUrl,
    metaLine: getMetaLine(parsed),
    environmentRisk: detectEmbedEnvironmentRisk(parsed.provider),
  };
}

function resolvePosterFromData(data, page) {
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  const pageData = pages.find((entry) => entry.page === page) || null;
  return {
    posterUrl: normalizeMediaUrl(data?.pic || pageData?.first_frame || ""),
    fallbackPosterUrl: normalizeMediaUrl(pageData?.first_frame || ""),
  };
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
  const canonicalUrl = buildVideoCanonicalUrl(canonicalId, state.parsed.page);
  const title = data.title?.trim();
  const { posterUrl, fallbackPosterUrl } = resolvePosterFromData(data, state.parsed.page);
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
      configurePosterElement(existingPoster, wrapper.dataset.bilibiliTitle || title || "bilibili", fallbackPosterUrl);
    } else {
      const poster = createElement("img", "bilibili-inline-player__poster");
      poster.src = posterUrl;
      configurePosterElement(poster, wrapper.dataset.bilibiliTitle || title || "bilibili", fallbackPosterUrl);
      placeholder?.remove();
      media.prepend(poster);
    }
  }
}

function getPreviewAspectRatio(parsed) {
  return parsed.provider === "netease" ? "4 / 3" : DEFAULT_ASPECT_RATIO;
}

function getLoadedFrameHeight(parsed) {
  return parsed.kind === "netease" ? getNetEaseEmbedHeight(parsed) : 0;
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
    getInitialButtonLabel(metadata.parsed)
  );
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerMeta = createElement("div", "bilibili-inline-player__footer-meta", getFooterMeta(metadata.parsed));
  const footerContent = createElement("div", "bilibili-inline-player__footer-content");
  const footerActions = createElement("div", "bilibili-inline-player__footer-actions");

  wrapper.dataset.bilibiliUrl = metadata.canonicalUrl;
  wrapper.dataset.bilibiliMeta = metadata.metaLine;
  wrapper.dataset.bilibiliFooterMeta = getFooterMeta(metadata.parsed);
  wrapper.dataset.bilibiliTitle = metadata.title;
  wrapper.dataset.bilibiliKind = metadata.parsed.kind;
  wrapper.dataset.bilibiliProvider = metadata.parsed.provider || "bilibili";
  wrapper.dataset.bilibiliRiskLevel = metadata.environmentRisk?.level || "none";
  wrapper.style.setProperty("--bili-aspect-ratio", getPreviewAspectRatio(metadata.parsed));
  wrapper.classList.add(`bilibili-inline-player--${metadata.parsed.provider || "bilibili"}`);
  media.dataset.placeholderLabel = getPlaceholderLabel(metadata.parsed);

  if (metadata.poster) {
    const poster = createElement("img", "bilibili-inline-player__poster");
    poster.src = metadata.poster;
    configurePosterElement(poster, metadata.title);
    media.appendChild(poster);
  } else {
    media.appendChild(
      createElement("div", "bilibili-inline-player__placeholder", getPlaceholderLabel(metadata.parsed))
    );
  }

  playButton.type = "button";
  playButton.setAttribute("aria-label", `${getInitialButtonLabel(metadata.parsed)}: ${metadata.title}`);
  playButton.append(playIcon, playLabel);
  meta.append(title, subline);
  media.append(scrim, meta, playButton);
  footerContent.appendChild(footerMeta);

  if (metadata.environmentRisk?.message && isKnownInlineKind(metadata.parsed)) {
    footerContent.appendChild(createElement("div", "bilibili-inline-player__notice", metadata.environmentRisk.message));
  }

  if (getBooleanSetting("show_open_link", true)) {
    const link = createElement("a", "bilibili-inline-player__footer-link", getOpenLabel(metadata.parsed));
    link.href = metadata.canonicalUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footerActions.appendChild(link);
  }

  footer.appendChild(footerContent);
  if (footerActions.childElementCount > 0) {
    footer.appendChild(footerActions);
  }

  wrapper.append(media, footer);
  playButton.addEventListener("click", () => activatePlayer(wrapper));
  wrapperState.set(wrapper, metadata);

  if (
    metadata.environmentRisk?.level === "hard" &&
    isKnownInlineKind(metadata.parsed) &&
    getBooleanSetting("auto_open_on_high_risk_env", true)
  ) {
    setButtonLabel(wrapper, getOpenLabel(metadata.parsed));
  }

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

  const isHardRiskEmbedEnv =
    state.environmentRisk?.level === "hard" &&
    isKnownInlineKind(state.parsed) &&
    getBooleanSetting("auto_open_on_high_risk_env", true);

  if (isHardRiskEmbedEnv) {
    state.iframeUrl = null;
    state.externalOnly = true;
    setButtonLabel(wrapper, getOpenLabel(state.parsed));
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "bangumi") {
    state.iframeUrl = buildIframeUrl(state.parsed);
    state.standardIframeUrl = state.iframeUrl;
    state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
    state.externalOnly = false;
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "live") {
    if (getBooleanSetting("enable_experimental_live_embed", true)) {
      state.iframeUrl = buildIframeUrl(state.parsed);
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = "";
      state.externalOnly = false;
    } else {
      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind === "netease") {
    state.iframeUrl = buildIframeUrl(state.parsed);
    state.standardIframeUrl = state.iframeUrl;
    state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
    state.externalOnly = false;
    state.resolvePromise = Promise.resolve(state.parsed);
    return;
  }

  if (state.parsed.kind !== "video") {
    state.iframeUrl = null;
    state.externalOnly = true;
    setButtonLabel(wrapper, getOpenLabel(state.parsed));
    state.resolvePromise = Promise.resolve(state.parsed);
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
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(resolved);
      state.externalOnly = false;
      return resolved;
    })
    .catch(() => {
      if (directEmbedReady) {
        state.iframeUrl = buildIframeUrl(state.parsed);
        state.standardIframeUrl = state.iframeUrl;
        state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
        state.externalOnly = false;
        return state.parsed;
      }

      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
      return null;
    });
}

function supportsNoAutoplayRetry(state) {
  return Boolean(
    state?.noAutoplayIframeUrl &&
      state.noAutoplayIframeUrl !== state.standardIframeUrl &&
      state.parsed?.provider === "bilibili" &&
      (state.parsed.kind === "video" || state.parsed.kind === "bangumi")
  );
}

function updateRetryButtonLabel(wrapper) {
  const button = wrapper.querySelector(".bilibili-inline-player__retry-button");
  const state = wrapperState.get(wrapper);

  if (!button || !state) {
    return;
  }

  button.textContent = state.autoplayDisabled ? "已关闭自动播放" : "关闭自动播放重试";
  button.disabled = Boolean(state.autoplayDisabled);
}

function updateFooterMeta(wrapper) {
  const footerMeta = wrapper.querySelector(".bilibili-inline-player__footer-meta");
  const state = wrapperState.get(wrapper);

  if (!footerMeta || !state?.parsed) {
    return;
  }

  footerMeta.textContent =
    state.autoplayDisabled && supportsNoAutoplayRetry(state)
      ? `${wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta} · autoplay off`
      : wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta;
}

function swapIframeSource(wrapper, nextUrl) {
  const iframe = wrapper.querySelector(".bilibili-inline-player__frame");

  if (!iframe || !nextUrl) {
    return;
  }

  iframe.src = nextUrl;
}

function retryWithoutAutoplay(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!supportsNoAutoplayRetry(state) || state.autoplayDisabled) {
    return;
  }

  state.autoplayDisabled = true;
  swapIframeSource(wrapper, state.noAutoplayIframeUrl);
  updateRetryButtonLabel(wrapper);
  updateFooterMeta(wrapper);
}

function maybeAttachStuckHelpNotice(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!supportsNoAutoplayRetry(state)) {
    return;
  }

  window.setTimeout(() => {
    if (!wrapper.isConnected || wrapper.dataset.bilibiliLoaded !== "1") {
      return;
    }

    const footerContent = wrapper.querySelector(".bilibili-inline-player__footer-content");

    if (!footerContent || footerContent.querySelector(".bilibili-inline-player__notice--stuck")) {
      return;
    }

    footerContent.appendChild(
      createElement(
        "div",
        "bilibili-inline-player__notice bilibili-inline-player__notice--stuck",
        "若卡在“你感兴趣的视频都在B站”，请先点“关闭自动播放重试”，仍不行再点下方打开原站。"
      )
    );
  }, BILIBILI_STUCK_HELP_DELAY_MS);
}

function buildLoadedFooter(wrapper) {
  const state = wrapperState.get(wrapper);
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerContent = createElement("div", "bilibili-inline-player__footer-content");
  const footerMeta = createElement(
    "div",
    "bilibili-inline-player__footer-meta",
    wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta
  );
  const footerActions = createElement("div", "bilibili-inline-player__footer-actions");

  footerContent.appendChild(footerMeta);

  if (supportsNoAutoplayRetry(state)) {
    const retryButton = createElement(
      "button",
      "bilibili-inline-player__footer-button bilibili-inline-player__retry-button",
      state.autoplayDisabled ? "已关闭自动播放" : "关闭自动播放重试"
    );
    retryButton.type = "button";
    retryButton.disabled = Boolean(state.autoplayDisabled);
    retryButton.addEventListener("click", () => retryWithoutAutoplay(wrapper));
    footerActions.appendChild(retryButton);
  }

  if (getBooleanSetting("show_open_link", true)) {
    const link = createElement("a", "bilibili-inline-player__footer-link", getOpenLabel(state.parsed));
    link.href = wrapper.dataset.bilibiliUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    footerActions.appendChild(link);
  }

  footer.appendChild(footerContent);
  if (footerActions.childElementCount > 0) {
    footer.appendChild(footerActions);
  }

  return footer;
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
    setButtonLabel(wrapper, getOpenLabel(state?.parsed || { provider: "bilibili" }));
    window.open(wrapper.dataset.bilibiliUrl, "_blank", "noopener,noreferrer");
    return;
  }

  wrapper.dataset.bilibiliLoading = "0";
  wrapper.dataset.bilibiliLoaded = "1";

  const frameWrap = createElement("div", "bilibili-inline-player__frame-wrap");
  const iframe = createElement("iframe", "bilibili-inline-player__frame");
  const frameHeight = getLoadedFrameHeight(state.parsed);

  if (frameHeight > 0) {
    frameWrap.classList.add("bilibili-inline-player__frame-wrap--fixed");
    frameWrap.style.setProperty("--bili-frame-height", `${frameHeight}px`);
  } else {
    frameWrap.style.setProperty("--bili-aspect-ratio", DEFAULT_ASPECT_RATIO);
  }
  iframe.src = state.iframeUrl;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.title = wrapper.dataset.bilibiliTitle || getEmbedTitle(state.parsed);

  frameWrap.appendChild(iframe);
  const footer = buildLoadedFooter(wrapper);

  wrapper.replaceChildren(frameWrap, footer);
  updateRetryButtonLabel(wrapper);
  updateFooterMeta(wrapper);
  maybeAttachStuckHelpNotice(wrapper);
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
    const parsed = parseFirstSupportedUrl(...collectSourceUrls(block));

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

function collectSourceUrls(target) {
  const urls = [];

  if (target.dataset?.oneboxSrc) {
    urls.push(target.dataset.oneboxSrc);
  }

  for (const anchor of target.querySelectorAll("a[href]")) {
    urls.push(anchor.href);
  }

  for (const iframe of target.querySelectorAll("iframe[src]")) {
    urls.push(iframe.src);
  }

  urls.push(...extractUrlsFromText(target.textContent || ""));

  return [...new Set(urls.map(normalizeUrlLikeString).filter(Boolean))];
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

function collectIframeCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const seen = new Set(existingTargets);

  for (const iframe of element.querySelectorAll("iframe[src]")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    const target = iframe.closest("p, figure") || iframe.parentElement || iframe;

    if (!target || seen.has(target) || target.dataset?.bilibiliInlinePlayer) {
      continue;
    }

    const parsed = parseBilibiliUrl(iframe.src);

    if (!parsed) {
      continue;
    }

    seen.add(target);
    results.push({ target, anchor: null, parsed });
  }

  return results;
}

function collectEmbedTextCandidates(element, existingTargets) {
  const limit = Math.max(1, getIntegerSetting("max_embeds_per_post", 4));
  const results = [];
  const seen = new Set(existingTargets);

  for (const block of element.querySelectorAll("pre, p")) {
    if (results.length + existingTargets.length >= limit) {
      break;
    }

    if (seen.has(block) || block.dataset?.bilibiliInlinePlayer) {
      continue;
    }

    if (block.querySelector("a[href], iframe[src], aside.onebox, article.onebox")) {
      continue;
    }

    const parsed = parseFirstSupportedUrl(...extractUrlsFromText(block.textContent || ""));

    if (!parsed) {
      continue;
    }

    seen.add(block);
    results.push({ target: block, anchor: null, parsed });
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
    const iframeCandidates = collectIframeCandidates(
      element,
      [...oneboxCandidates, ...standaloneCandidates].map((candidate) => candidate.target)
    );
    const embedTextCandidates = collectEmbedTextCandidates(
      element,
      [...oneboxCandidates, ...standaloneCandidates, ...iframeCandidates].map((candidate) => candidate.target)
    );

    for (const candidate of [...oneboxCandidates, ...standaloneCandidates, ...iframeCandidates, ...embedTextCandidates]) {
      replaceCandidate(candidate);
    }
  });
});
