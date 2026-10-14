export const MICROSOFT_VIEWER_ORIGIN = "https://view.officeapps.live.com";
export const MICROSOFT_VIEWER_PATH = "/op/embed.aspx";
export const EXTERNAL_VIEWERS = Object.freeze(["microsoft"]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const PROTECTED_UPLOAD_PATH_RE = /\/secure-(?:media-)?uploads\//iu;

function isLoopback(url) {
  return LOOPBACK_HOSTS.has(url.hostname) || url.hostname.endsWith(".localhost");
}

/** Parses one administrator-supplied origin. Paths, queries, and http are rejected. */
export function parseOriginSetting(value) {
  let url;

  try {
    url = new URL(String(value || "").trim());
  } catch {
    return null;
  }

  const httpAllowed = url.protocol === "http:" && isLoopback(url);

  if (
    (url.protocol !== "https:" && !httpAllowed) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  ) {
    return null;
  }

  return url.origin;
}

export function splitListSetting(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function originFromStorageValue(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  // Discourse stores S3 locations protocol-relative ("//bucket.example").
  return parseOriginSetting(text.startsWith("//") ? `https:${text}` : text);
}

/**
 * Origins this page may read attachment bytes from: the forum itself, the
 * upload CDN and bucket Discourse announces in its boot data, and origins an
 * administrator lists explicitly. Nothing else is fetched.
 */
export function buildTrustedOrigins({ pageOrigin, setupData = {}, extraOrigins = "" }) {
  const origins = new Set();
  const page = parseOriginSetting(pageOrigin);

  if (page) {
    origins.add(page);
  }

  for (const value of [setupData.s3Cdn, setupData.s3BaseUrl]) {
    const origin = originFromStorageValue(value);

    if (origin) {
      origins.add(origin);
    }
  }

  for (const value of splitListSetting(extraOrigins)) {
    const origin = parseOriginSetting(value);

    if (origin) {
      origins.add(origin);
    }
  }

  return origins;
}

export function isTrustedUrl(value, trustedOrigins) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      trustedOrigins.has(url.origin)
    );
  } catch {
    return false;
  }
}

/** Parses the administrator's list of URL prefixes certified as public. */
export function parsePublicPrefixes(value) {
  const prefixes = [];

  for (const item of splitListSetting(value)) {
    let url;

    try {
      url = new URL(item);
    } catch {
      continue;
    }

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.endsWith("/") ||
      PROTECTED_UPLOAD_PATH_RE.test(url.pathname)
    ) {
      continue;
    }

    prefixes.push({ origin: url.origin, pathname: url.pathname });
  }

  return prefixes;
}

/**
 * Decides whether one attachment may be handed to an external viewer. Every
 * condition must hold; any unknown fact denies. A successful fetch by the
 * signed-in reader is never evidence that the file is public, so the decision
 * rests on the administrator's certified prefixes and the post's own context.
 */
export function evaluateExternalViewer({ attachment, provider, publicPrefixes, context = {} }) {
  if (!EXTERNAL_VIEWERS.includes(provider)) {
    return { allowed: false, reason: "disabled" };
  }

  if (!attachment?.url || publicPrefixes.length === 0) {
    return { allowed: false, reason: "no_public_prefix" };
  }

  let url;

  try {
    url = new URL(attachment.url);
  } catch {
    return { allowed: false, reason: "malformed" };
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return { allowed: false, reason: "not_https" };
  }

  // Signed or temporary links carry their capability in the query string.
  if (url.search || url.hash) {
    return { allowed: false, reason: "query_or_fragment" };
  }

  if (PROTECTED_UPLOAD_PATH_RE.test(url.pathname)) {
    return { allowed: false, reason: "protected_upload" };
  }

  const matchesPrefix = publicPrefixes.some(
    (prefix) => prefix.origin === url.origin && url.pathname.startsWith(prefix.pathname)
  );

  if (!matchesPrefix) {
    return { allowed: false, reason: "outside_public_prefix" };
  }

  if (context.hasPostModel !== true) {
    return { allowed: false, reason: "no_post_context" };
  }

  if (context.isPrivateMessage !== false) {
    return { allowed: false, reason: "private_message" };
  }

  if (context.categoryReadRestricted !== false) {
    return { allowed: false, reason: "restricted_category" };
  }

  if (context.loginRequired !== false) {
    return { allowed: false, reason: "login_required" };
  }

  if (context.secureUploads !== false) {
    return { allowed: false, reason: "secure_uploads" };
  }

  return { allowed: true, reason: "allowed" };
}

export function buildMicrosoftViewerUrl(documentUrl) {
  const viewer = new URL(MICROSOFT_VIEWER_PATH, MICROSOFT_VIEWER_ORIGIN);
  viewer.searchParams.set("src", documentUrl);
  return viewer.href;
}

/** Reads the post facts the external-viewer policy needs from a decorator helper. */
export function readPostContext(helper, siteSettings) {
  let post = null;

  try {
    post = helper?.model ?? helper?.getModel?.() ?? null;
  } catch {
    post = null;
  }

  const topic = post?.topic;
  const archetype = topic?.archetype;
  const category = topic?.category;

  return {
    hasPostModel: Boolean(post && topic),
    isPrivateMessage:
      archetype === undefined && topic?.isPrivateMessage === undefined
        ? undefined
        : archetype === "private_message" || topic?.isPrivateMessage === true,
    categoryReadRestricted:
      typeof category?.read_restricted === "boolean" ? category.read_restricted : undefined,
    loginRequired:
      typeof siteSettings?.login_required === "boolean" ? siteSettings.login_required : undefined,
    secureUploads:
      typeof siteSettings?.secure_uploads === "boolean" ? siteSettings.secure_uploads : undefined,
  };
}
