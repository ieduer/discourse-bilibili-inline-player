import { apiInitializer } from "discourse/lib/api";

const VIDEO_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "bilibili.com"]);
const ARTICLE_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com"]);
const DYNAMIC_HOSTS = new Set(["www.bilibili.com", "m.bilibili.com", "t.bilibili.com"]);
const LIVE_HOSTS = new Set(["live.bilibili.com", "www.live.bilibili.com"]);
const SHORT_HOSTS = new Set(["b23.tv", "www.b23.tv", "bili2233.cn", "www.bili2233.cn"]);
const PLAYER_HOSTS = new Set(["player.bilibili.com"]);
const NETEASE_HOSTS = new Set(["music.163.com", "y.music.163.com"]);
const QQMUSIC_HOSTS = new Set(["y.qq.com", "i.y.qq.com"]);
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
const QQMUSIC_SONG_DETAIL_PATH_RE = /^\/n\/ryqq\/songDetail\/([A-Za-z0-9]+)\/?$/;
const QQMUSIC_PLAYLIST_PATH_RE = /^\/n\/ryqq\/playlist\/(\d+)\/?$/;
const QQMUSIC_ALBUM_PATH_RE = /^\/n\/ryqq\/albumDetail\/([A-Za-z0-9]+)\/?$/;
const QQMUSIC_TOPLIST_PATH_RE = /^\/n\/ryqq\/toplist\/(\d+)\/?$/;
const QQMUSIC_PLAYSONG_PATH_RE = /^\/v8\/playsong\.html$/;
const QQMUSIC_OUTCHAIN_PATH_RE = /^\/n2\/m\/outchain\/player\/index\.html$/;
const QQMUSIC_SHARE_PLAYLIST_PATH_RE = /^\/n2\/m\/share\/details\/taoge\.html$/;
const IFRAME_SRC_RE = /<iframe\b[^>]*\bsrc=(["'])([^"']+)\1/gi;
const URL_LIKE_RE =
  /((?:https?:)?\/\/(?:player\.bilibili\.com\/player\.html|www\.bilibili\.com\/blackboard\/(?:live\/live-mobile-playerV3|live\/live-activity-player|webplayer\/mbplayer)\.html|(?:www\.|m\.)?bilibili\.com\/(?:s\/)?video\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/bangumi\/play\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/audio\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/read\/[^\s"'<>]+|(?:www\.|m\.)?bilibili\.com\/opus\/[^\s"'<>]+|t\.bilibili\.com\/[^\s"'<>]+|live\.bilibili\.com\/[^\s"'<>]+|(?:www\.)?(?:b23\.tv|bili2233\.cn)\/[^\s"'<>]+|(?:y\.)?music\.163\.com\/[^\s"'<>]+|(?:i\.)?y\.qq\.com\/[^\s"'<>]+))/gi;
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
const qqMusicSongInfoCache = new Map();

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

function buildQQMusicCanonicalUrl(mediaType, itemId) {
  switch (mediaType) {
    case "playlist":
      return `https://y.qq.com/n/ryqq/playlist/${itemId}`;
    case "album":
      return `https://y.qq.com/n/ryqq/albumDetail/${itemId}`;
    case "toplist":
      return `https://y.qq.com/n/ryqq/toplist/${itemId}`;
    case "song":
    default:
      return `https://y.qq.com/n/ryqq/songDetail/${itemId}`;
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

function createParsedQQMusic(mediaType, itemId, extras = {}) {
  const idType = extras.idType || "mid";
  return {
    provider: "qqmusic",
    kind: "qqmusic",
    mediaType,
    itemId: String(itemId),
    idType,
    page: 1,
    rawId: `${mediaType}:${itemId}`,
    canonicalUrl: buildQQMusicCanonicalUrl(mediaType, itemId),
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

function parseQQMusicPageUrl(url) {
  const hostname = url.hostname.toLowerCase();

  if (!QQMUSIC_HOSTS.has(hostname)) {
    return null;
  }

  if (hostname === "i.y.qq.com") {
    if (QQMUSIC_OUTCHAIN_PATH_RE.test(url.pathname)) {
      const songid = url.searchParams.get("songid");

      if (songid && /^\d+$/.test(songid)) {
        return createParsedQQMusic("song", songid, {
          idType: "id",
          officialPlayerUrl: url.toString(),
        });
      }

      return null;
    }

    if (QQMUSIC_PLAYSONG_PATH_RE.test(url.pathname)) {
      const songmid = url.searchParams.get("songmid");

      if (songmid && /^[A-Za-z0-9]{8,}$/.test(songmid)) {
        return createParsedQQMusic("song", songmid, { idType: "mid" });
      }

      const songid = url.searchParams.get("songid");

      if (songid && /^\d+$/.test(songid) && songid !== "0") {
        return createParsedQQMusic("song", songid, { idType: "id" });
      }

      return null;
    }

    if (QQMUSIC_SHARE_PLAYLIST_PATH_RE.test(url.pathname)) {
      const id = url.searchParams.get("id");

      if (id && /^\d+$/.test(id)) {
        return createParsedQQMusic("playlist", id, { idType: "id" });
      }

      return null;
    }

    return null;
  }

  const songMatch = url.pathname.match(QQMUSIC_SONG_DETAIL_PATH_RE);

  if (songMatch) {
    return createParsedQQMusic("song", songMatch[1], { idType: "mid" });
  }

  const playlistMatch = url.pathname.match(QQMUSIC_PLAYLIST_PATH_RE);

  if (playlistMatch) {
    return createParsedQQMusic("playlist", playlistMatch[1], { idType: "id" });
  }

  const albumMatch = url.pathname.match(QQMUSIC_ALBUM_PATH_RE);

  if (albumMatch) {
    return createParsedQQMusic("album", albumMatch[1], { idType: "mid" });
  }

  const toplistMatch = url.pathname.match(QQMUSIC_TOPLIST_PATH_RE);

  if (toplistMatch) {
    return createParsedQQMusic("toplist", toplistMatch[1], { idType: "id" });
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
    parseNetEasePageUrl(url) ||
    parseQQMusicPageUrl(url)
  );
}

function buildIframeUrl(parsed) {
  if (parsed.kind === "qqmusic") {
    return buildQQMusicIframeUrl(parsed, getBooleanSetting("autoplay_on_click", true));
  }

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
  if (parsed.kind === "qqmusic") {
    return buildQQMusicIframeUrl(parsed, false);
  }

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

  return parsed.mediaType === "song" || parsed.mediaType === "program" ? 130 : 430;
}

function getQQMusicEmbedHeight(parsed) {
  return parsed.idType === "id" ? 86 : 430;
}

function buildQQMusicIframeUrl(parsed, autoplay) {
  if (parsed.mediaType !== "song") {
    return "";
  }

  if (parsed.idType === "id") {
    return `https://i.y.qq.com/n2/m/outchain/player/index.html?songid=${parsed.itemId}&songtype=0`;
  }

  const params = new URLSearchParams({
    songmid: parsed.itemId,
    songtype: "0",
  });

  if (autoplay) {
    params.set("autoplay", "1");
  }

  return `https://i.y.qq.com/v8/playsong.html?${params.toString()}`;
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
      return parsed.page > 1 ? `视频 · P${parsed.page}` : "视频";
    case "bangumi":
      return parsed.episodeId ? "番剧" : "番剧";
    case "live":
      return "直播";
    case "audio":
      return parsed.isPlaylist ? "音频歌单" : "音频";
    case "article":
      return "专栏";
    case "opus":
      return "动态";
    case "dynamic":
      return "动态";
    case "netease":
      return getNetEaseMetaLine(parsed);
    case "qqmusic":
      return getQQMusicMetaLine(parsed);
    default:
      return "bilibili";
  }
}

function getQQMusicMetaLine(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return "QQ音乐歌单";
    case "album":
      return "QQ音乐专辑";
    case "toplist":
      return "QQ音乐排行榜";
    case "song":
    default:
      return "QQ音乐单曲";
  }
}

function getNetEaseMetaLine(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return "网易云歌单";
    case "album":
      return "网易云专辑";
    case "program":
      return "网易云播客节目";
    case "djradio":
      return "网易云播客";
    case "song":
    default:
      return "网易云单曲";
  }
}

function formatCompactCount(value) {
  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) {
    return "";
  }

  if (count >= 100000000) {
    const scaled = count / 100000000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")}亿`;
  }

  if (count >= 10000) {
    const scaled = count / 10000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, "")}万`;
  }

  return Math.round(count).toLocaleString("zh-CN");
}

function getPreviewStatText(parsed, viewCount = null) {
  switch (parsed.kind) {
    case "video": {
      const parts = [];

      if (Number.isFinite(Number(viewCount))) {
        parts.push(`${formatCompactCount(viewCount)} 播放`);
      }

      if (parsed.page > 1) {
        parts.push(`P${parsed.page}`);
      }

      return parts.join(" · ") || "视频";
    }
    case "bangumi":
      return parsed.episodeId ? `番剧 · EP${parsed.episodeId}` : "番剧";
    case "live":
      return "直播";
    case "audio":
    case "article":
    case "opus":
    case "dynamic":
      return getMetaLine(parsed);
    case "netease":
    case "qqmusic":
      return getMetaLine(parsed);
    default:
      return "";
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
    case "qqmusic":
      return getQQMusicFallbackTitle(parsed);
    default:
      return parsed.rawId || "bilibili";
  }
}

function getQQMusicFallbackTitle(parsed) {
  switch (parsed.mediaType) {
    case "playlist":
      return `QQ音乐歌单 ${parsed.itemId}`;
    case "album":
      return `QQ音乐专辑 ${parsed.itemId}`;
    case "toplist":
      return `QQ音乐排行榜 ${parsed.itemId}`;
    case "song":
    default:
      return `QQ音乐单曲 ${parsed.itemId}`;
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

  if (parsed.kind === "qqmusic" && parsed.mediaType === "song") {
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
      return getPreviewStatText(parsed);
    case "live":
      return getBooleanSetting("enable_experimental_live_embed", true) ? getLiveFooterMeta(parsed) : "在 bilibili 打开";
    case "audio":
      return "在 bilibili 打开";
    case "article":
      return "在 bilibili 打开";
    case "opus":
    case "dynamic":
      return "在 bilibili 打开";
    case "netease":
      return getNetEaseFooterMeta(parsed);
    case "qqmusic":
      return getQQMusicFooterMeta(parsed);
    default:
      return "bilibili";
  }
}

function getQQMusicFooterMeta() {
  return "QQ音乐外链播放器";
}

function isCompactQQMusic(parsed) {
  return parsed.kind === "qqmusic" && parsed.mediaType === "song";
}

function isCompactAudio(parsed) {
  return isCompactNetEase(parsed) || isCompactQQMusic(parsed);
}

function isCompactNetEase(parsed) {
  return parsed.kind === "netease" && (parsed.mediaType === "song" || parsed.mediaType === "program");
}

function getNetEaseFooterMeta() {
  return "网易云外链播放器";
}

function getLiveFooterMeta(parsed) {
  const liveId = String(parsed.activityCid || parsed.roomId);
  const usesActivityPlayer = !parsed.preferMobileLivePlayer && (/^\d{7,}$/.test(liveId) || Boolean(parsed.activityCid));

  return usesActivityPlayer ? "直播嵌入播放器" : "直播播放器";
}

function getOpenLabel(parsed) {
  if (parsed.provider === "qqmusic") {
    return "在QQ音乐打开";
  }

  return parsed.provider === "netease" ? "在网易云音乐打开" : "在 bilibili 打开";
}

function getEmbedTitle(parsed) {
  if (parsed.provider === "qqmusic") {
    return "QQ Music player";
  }

  return parsed.provider === "netease" ? "NetEase Cloud Music player" : "bilibili player";
}

function loadCallbackScript(src, options = {}) {
  const { callbackParam = "callback", extraParams = {} } = options;

  return new Promise((resolve, reject) => {
    const callbackName = `__bili_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const requestUrl = new URL(src, globalThis.location?.href || "https://forum.invalid/");
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

    for (const [key, value] of Object.entries(extraParams)) {
      if (value == null || requestUrl.searchParams.has(key)) {
        continue;
      }

      requestUrl.searchParams.set(key, String(value));
    }

    requestUrl.searchParams.set(callbackParam, callbackName);
    script.async = true;
    script.src = requestUrl.toString();
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

function loadJsonp(src) {
  return loadCallbackScript(src, {
    callbackParam: "callback",
    extraParams: {
      jsonp: "jsonp",
    },
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

function fetchQQMusicSongInfo(parsed) {
  if (parsed.kind !== "qqmusic" || parsed.mediaType !== "song") {
    return Promise.reject(new Error("QQ Music metadata is only supported for songs"));
  }

  const cacheKey = `${parsed.idType}:${parsed.itemId}`;

  if (!qqMusicSongInfoCache.has(cacheKey)) {
    const params = new URLSearchParams({
      tpl: "yqq_song_detail",
      format: "jsonp",
    });

    if (parsed.idType === "id") {
      params.set("songid", parsed.itemId);
    } else {
      params.set("songmid", parsed.itemId);
    }

    qqMusicSongInfoCache.set(
      cacheKey,
      loadCallbackScript(`https://i.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?${params.toString()}`).then(
        (payload) => {
          const song = Array.isArray(payload?.data) ? payload.data[0] : null;

          if (!song || payload?.code !== 0) {
            throw new Error("QQ Music metadata payload was invalid");
          }

          return song;
        }
      )
    );
  }

  return qqMusicSongInfoCache.get(cacheKey);
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

  if (provider === "qqmusic") {
    return "QQ Music";
  }

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

function normalizeTitleText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanProviderTitle(title, parsed) {
  let cleaned = normalizeTitleText(title);

  if (!cleaned) {
    return "";
  }

  if (parsed?.provider === "netease") {
    cleaned = cleaned.replace(/\s*-\s*网易云音乐\s*$/i, "");
    cleaned = cleaned.replace(/\s*-\s*(?:单曲|专辑|歌单|播客节目|播客|电台)\s*$/i, "");
  }

  if (parsed?.provider === "qqmusic") {
    cleaned = cleaned.replace(/\s*-\s*qq音乐.*$/i, "");
    cleaned = cleaned.replace(/\s*-\s*qq\s*music.*$/i, "");
  }

  return normalizeTitleText(cleaned);
}

const GENERIC_TITLE_RE =
  /^(?:bilibili|哔哩哔哩|b站|网易云音乐|netease\s*(?:cloud\s*)?music|music\.163\.com|(?:www\.)?bilibili\.com|qq音乐|qqmusic|qq\s*music|(?:i\.)?y\.qq\.com|(?:https?:\/\/)?(?:music\.163\.com|(?:www\.)?bilibili\.com|(?:i\.)?y\.qq\.com)\/\S*)$/i;

function extractStructuredProviderTitle(candidate, parsed) {
  const text = normalizeTitleText(candidate);

  if (!text) {
    return "";
  }

  if (parsed?.provider === "netease") {
    const songBySingerMatch = text.match(/歌曲名[《"]([^》"]+)[》"]\s*，\s*由\s*([^，。]+?)\s*演唱/u);

    if (songBySingerMatch) {
      return buildSongDisplayTitle(songBySingerMatch[1], [songBySingerMatch[2]]);
    }

    const titleOnlyMatch = text.match(/[《"]([^》"]+)[》"](?:下载|歌词|在线试听|无损音乐下载)/u);

    if (titleOnlyMatch) {
      return normalizeTitleText(titleOnlyMatch[1]);
    }
  }

  return "";
}

function isGenericTitle(title) {
  if (!title || title.length < 2) {
    return true;
  }

  return (
    GENERIC_TITLE_RE.test(title) ||
    /^网易云音乐(?:是一款|是一个|专注于|，)/u.test(title) ||
    /^qq音乐(?:是|，)/iu.test(title)
  );
}

function isPlaceholderTitle(title, parsed) {
  return normalizeTitleText(title) === normalizeTitleText(getFallbackTitle(parsed));
}

function collectTextTitleCandidates(target, fallbackAnchor) {
  const candidates = [];
  const pushCandidate = (value) => {
    if (value) {
      candidates.push(value);
    }
  };

  for (const element of target.querySelectorAll(".onebox-body h3 a, .onebox-body h3, h3 a, h3")) {
    pushCandidate(element.textContent);
    pushCandidate(element.getAttribute?.("title"));
    pushCandidate(element.getAttribute?.("aria-label"));
  }

  for (const element of target.querySelectorAll("[data-title], [title], [aria-label], img[alt]")) {
    pushCandidate(element.getAttribute?.("data-title"));
    pushCandidate(element.getAttribute?.("title"));
    pushCandidate(element.getAttribute?.("aria-label"));
    pushCandidate(element.getAttribute?.("alt"));
  }

  for (const line of (target.textContent || "").split(/\n+/)) {
    pushCandidate(line);
  }

  pushCandidate(fallbackAnchor?.textContent);
  pushCandidate(fallbackAnchor?.getAttribute?.("title"));
  pushCandidate(fallbackAnchor?.getAttribute?.("aria-label"));

  return candidates;
}

function extractTitle(target, fallbackAnchor, parsed) {
  for (const candidate of collectTextTitleCandidates(target, fallbackAnchor)) {
    const structuredTitle = extractStructuredProviderTitle(candidate, parsed);

    if (structuredTitle && !isGenericTitle(structuredTitle)) {
      return structuredTitle;
    }

    const title = cleanProviderTitle(candidate, parsed);

    if (!title || title.length > 120) {
      continue;
    }

    if (
      isGenericTitle(title) ||
      title === getMetaLine(parsed) ||
      title === getOpenLabel(parsed) ||
      title === getFooterMeta(parsed)
    ) {
      continue;
    }

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
    viewCount: null,
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
  const viewCount = data.stat?.view;
  const { posterUrl, fallbackPosterUrl } = resolvePosterFromData(data, state.parsed.page);
  const titleElement = wrapper.querySelector(".bilibili-inline-player__title");
  const statElement = wrapper.querySelector(".bilibili-inline-player__subline");
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

  if (Number.isFinite(Number(viewCount))) {
    wrapper.dataset.bilibiliViewCount = String(viewCount);
    wrapper.dataset.bilibiliFooterMeta = getPreviewStatText(state.parsed, viewCount);

    if (statElement) {
      statElement.textContent = getPreviewStatText(state.parsed, viewCount);
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

function formatMusicArtists(artists) {
  return artists
    .map((artist) => normalizeTitleText(artist))
    .filter(Boolean)
    .join(" / ");
}

function buildSongDisplayTitle(name, artists = []) {
  const baseName = normalizeTitleText(name);
  const artistLine = formatMusicArtists(artists);

  if (!baseName) {
    return "";
  }

  return artistLine ? `${baseName} - ${artistLine}` : baseName;
}

function updatePreviewTitle(wrapper, title) {
  const nextTitle = normalizeTitleText(title);

  if (!nextTitle) {
    return;
  }

  const state = wrapperState.get(wrapper);
  const titleElement =
    wrapper.querySelector(".bilibili-inline-player__compact-title") ||
    wrapper.querySelector(".bilibili-inline-player__title");
  const playButton = wrapper.querySelector(".bilibili-inline-player__play");
  const playLabel = wrapper.querySelector(".bilibili-inline-player__play-label");
  const iframe = wrapper.querySelector(".bilibili-inline-player__frame");

  wrapper.dataset.bilibiliTitle = nextTitle;

  if (state) {
    state.title = nextTitle;
  }

  if (titleElement) {
    titleElement.textContent = nextTitle;
  }

  if (playButton) {
    const buttonText = playLabel?.textContent?.trim() || getInitialButtonLabel(state?.parsed || {});
    playButton.setAttribute("aria-label", `${buttonText}: ${nextTitle}`);
  }

  if (iframe) {
    iframe.title = nextTitle;
  }
}

function updatePreviewCanonicalUrl(wrapper, canonicalUrl) {
  const nextUrl = normalizeUrlLikeString(canonicalUrl);

  if (!nextUrl) {
    return;
  }

  const state = wrapperState.get(wrapper);

  wrapper.dataset.bilibiliUrl = nextUrl;

  if (state?.parsed) {
    state.parsed.canonicalUrl = nextUrl;
  }

  for (const link of wrapper.querySelectorAll(".bilibili-inline-player__footer-link")) {
    link.href = nextUrl;
  }
}

function updateQQMusicPreviewMetadata(wrapper, song) {
  const title = buildSongDisplayTitle(song?.name || song?.title, (song?.singer || []).map((entry) => entry?.name));

  if (!title) {
    return;
  }

  updatePreviewTitle(wrapper, title);

  const canonicalMid = normalizeTitleText(song?.mid);

  if (canonicalMid) {
    updatePreviewCanonicalUrl(wrapper, buildQQMusicCanonicalUrl("song", canonicalMid));
  }
}

function getPreviewAspectRatio(parsed) {
  switch (parsed.kind) {
    case "video":
    case "bangumi":
    case "live":
      return "16 / 9";
    case "netease":
      return isCompactNetEase(parsed) ? "auto" : "4 / 3";
    case "qqmusic":
      return isCompactQQMusic(parsed) ? "auto" : "4 / 3";
    default:
      return "4 / 3";
  }
}

function getLoadedFrameHeight(parsed) {
  if (parsed.kind === "qqmusic") {
    return getQQMusicEmbedHeight(parsed);
  }

  return parsed.kind === "netease" ? getNetEaseEmbedHeight(parsed) : 0;
}

function buildWrapper(metadata) {
  const wrapper = createElement("div", "bilibili-inline-player");
  const compact = isCompactAudio(metadata.parsed);

  wrapper.dataset.bilibiliUrl = metadata.canonicalUrl;
  wrapper.dataset.bilibiliMeta = metadata.metaLine;
  wrapper.dataset.bilibiliFooterMeta = getFooterMeta(metadata.parsed);
  wrapper.dataset.bilibiliTitle = metadata.title;
  wrapper.dataset.bilibiliViewCount = "";
  wrapper.dataset.bilibiliKind = metadata.parsed.kind;
  wrapper.dataset.bilibiliProvider = metadata.parsed.provider || "bilibili";
  wrapper.dataset.bilibiliRiskLevel = metadata.environmentRisk?.level || "none";
  wrapper.style.setProperty("--bili-aspect-ratio", getPreviewAspectRatio(metadata.parsed));
  wrapper.classList.add(`bilibili-inline-player--${metadata.parsed.provider || "bilibili"}`);

  if (compact) {
    wrapper.classList.add("bilibili-inline-player--compact-audio");
    buildCompactAudioCard(wrapper, metadata);
  } else {
    buildStandardCard(wrapper, metadata);
  }

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

function buildCompactAudioCard(wrapper, metadata) {
  const body = createElement("div", "bilibili-inline-player__compact-body");
  const info = createElement("div", "bilibili-inline-player__compact-info");
  const musicIcon = createElement("span", "bilibili-inline-player__music-icon", "♪");
  const title = createElement("span", "bilibili-inline-player__compact-title", metadata.title);
  const badge = createElement("span", "bilibili-inline-player__compact-badge", metadata.metaLine);
  const actions = createElement("div", "bilibili-inline-player__compact-actions");
  const playButton = createElement("button", "bilibili-inline-player__play bilibili-inline-player__play--compact");
  const playIcon = createElement("span", "bilibili-inline-player__play-icon");
  const playLabel = createElement("span", "bilibili-inline-player__play-label", getInitialButtonLabel(metadata.parsed));

  playButton.type = "button";
  playButton.setAttribute("aria-label", `${getInitialButtonLabel(metadata.parsed)}: ${metadata.title}`);
  playButton.append(playIcon, playLabel);
  playButton.addEventListener("click", () => activatePlayer(wrapper));

  info.append(musicIcon, title, badge);
  actions.appendChild(playButton);

  if (getBooleanSetting("show_open_link", true)) {
    const link = createElement("a", "bilibili-inline-player__footer-link bilibili-inline-player__compact-link", getOpenLabel(metadata.parsed));
    link.href = metadata.canonicalUrl;
    link.target = "_blank";
    link.rel = "noopener nofollow ugc";
    actions.appendChild(link);
  }

  body.append(info, actions);
  wrapper.appendChild(body);
}

function buildStandardCard(wrapper, metadata) {
  const media = createElement("div", "bilibili-inline-player__media");
  const scrim = createElement("div", "bilibili-inline-player__scrim");
  const title = createElement("h3", "bilibili-inline-player__title", metadata.title);
  const subline = createElement(
    "div",
    "bilibili-inline-player__subline",
    getPreviewStatText(metadata.parsed, metadata.viewCount)
  );
  const playButton = createElement("button", "bilibili-inline-player__play");
  const playIcon = createElement("span", "bilibili-inline-player__play-icon");
  const playLabel = createElement(
    "span",
    "bilibili-inline-player__play-label",
    getInitialButtonLabel(metadata.parsed)
  );
  const footer = createElement("div", "bilibili-inline-player__footer");
  const footerContent = createElement("div", "bilibili-inline-player__footer-content");
  const footerActions = createElement("div", "bilibili-inline-player__footer-actions");

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

  media.append(scrim, playButton);
  playButton.addEventListener("click", () => activatePlayer(wrapper));

  footerContent.append(title, subline);

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

  if (metadata.parsed.kind !== "video" && !isCompactAudio(metadata.parsed)) {
    const footerMeta = createElement("div", "bilibili-inline-player__footer-meta", getFooterMeta(metadata.parsed));
    footerContent.appendChild(footerMeta);
  }

  footer.appendChild(footerContent);
  if (footerActions.childElementCount > 0) {
    footer.appendChild(footerActions);
  }

  wrapper.append(media, footer);
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

  if (state.parsed.kind === "qqmusic") {
    if (state.parsed.mediaType === "song") {
      state.iframeUrl = buildIframeUrl(state.parsed);
      state.standardIframeUrl = state.iframeUrl;
      state.noAutoplayIframeUrl = buildNoAutoplayIframeUrl(state.parsed);
      state.externalOnly = false;
    } else {
      state.iframeUrl = null;
      state.externalOnly = true;
      setButtonLabel(wrapper, getOpenLabel(state.parsed));
    }

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
      ? `${wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta} · 已关闭自动播放`
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
  const footerActions = createElement("div", "bilibili-inline-player__footer-actions");

  if (!isCompactAudio(state.parsed)) {
    const footerMeta = createElement(
      "div",
      "bilibili-inline-player__footer-meta",
      wrapper.dataset.bilibiliFooterMeta || wrapper.dataset.bilibiliMeta
    );
    footerContent.appendChild(footerMeta);
  }

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

function renderLoadedPlayer(wrapper, iframeUrl) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || !iframeUrl) {
    return;
  }

  wrapper.dataset.bilibiliLoading = "0";
  wrapper.dataset.bilibiliLoaded = "1";
  wrapper.classList.remove("bilibili-inline-player--loading");

  const frameWrap = createElement("div", "bilibili-inline-player__frame-wrap");
  const iframe = createElement("iframe", "bilibili-inline-player__frame");
  const frameHeight = getLoadedFrameHeight(state.parsed);

  if (frameHeight > 0) {
    frameWrap.classList.add("bilibili-inline-player__frame-wrap--fixed");
    frameWrap.style.setProperty("--bili-frame-height", `${frameHeight}px`);
  } else {
    frameWrap.style.setProperty("--bili-aspect-ratio", DEFAULT_ASPECT_RATIO);
  }

  iframe.src = iframeUrl;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.title = wrapper.dataset.bilibiliTitle || getEmbedTitle(state.parsed);

  frameWrap.appendChild(iframe);

  wrapper.classList.remove("bilibili-inline-player--compact-audio");
  wrapper.replaceChildren(frameWrap, buildLoadedFooter(wrapper));
  updateRetryButtonLabel(wrapper);
  updateFooterMeta(wrapper);
  maybeAttachStuckHelpNotice(wrapper);
}

function maybeAutoEmbedFallbackMusicCard(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || wrapper.dataset.bilibiliLoaded === "1" || wrapper.dataset.bilibiliLoading === "1") {
    return;
  }

  const fallbackAllowed =
    (state.parsed.kind === "netease" && state.parsed.mediaType === "song") ||
    (state.parsed.kind === "qqmusic" && state.parsed.mediaType === "song" && state.parsed.idType === "id");

  if (!fallbackAllowed) {
    return;
  }

  const iframeUrl = state.noAutoplayIframeUrl || state.standardIframeUrl || state.iframeUrl;

  if (!iframeUrl) {
    return;
  }

  renderLoadedPlayer(wrapper, iframeUrl);
}

function maybeResolveMusicPreviewMetadata(wrapper) {
  const state = wrapperState.get(wrapper);

  if (!state?.parsed || !isCompactAudio(state.parsed) || state.previewMetadataPromise) {
    return;
  }

  const currentTitle = wrapper.dataset.bilibiliTitle || state.title || "";

  if (!isPlaceholderTitle(currentTitle, state.parsed)) {
    return;
  }

  if (state.parsed.kind === "qqmusic" && state.parsed.mediaType === "song") {
    state.previewMetadataPromise = fetchQQMusicSongInfo(state.parsed)
      .then((song) => {
        updateQQMusicPreviewMetadata(wrapper, song);
      })
      .catch(() => {
        maybeAutoEmbedFallbackMusicCard(wrapper);
      });
    return;
  }

  if (state.parsed.kind === "netease" && state.parsed.mediaType === "song") {
    state.previewMetadataPromise = Promise.resolve().then(() => {
      maybeAutoEmbedFallbackMusicCard(wrapper);
    });
  }
}

async function activatePlayer(wrapper) {
  if (wrapper.dataset.bilibiliLoaded === "1" || wrapper.dataset.bilibiliLoading === "1") {
    return;
  }

  wrapper.dataset.bilibiliLoading = "1";
  wrapper.classList.add("bilibili-inline-player--loading");

  const state = wrapperState.get(wrapper);
  setButtonLabel(wrapper, "加载中…");

  if (state?.resolvePromise) {
    await state.resolvePromise;
  } else {
    primeEmbedState(wrapper);
    await state?.resolvePromise;
  }

  if (state?.externalOnly || !state?.iframeUrl) {
    wrapper.dataset.bilibiliLoading = "0";
    wrapper.classList.remove("bilibili-inline-player--loading");
    setButtonLabel(wrapper, getOpenLabel(state?.parsed || { provider: "bilibili" }));
    window.open(wrapper.dataset.bilibiliUrl, "_blank", "noopener,noreferrer");
    return;
  }

  renderLoadedPlayer(wrapper, state.iframeUrl);
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
  maybeResolveMusicPreviewMetadata(replacement);
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
