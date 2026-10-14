// Rebuilds converter output in the live document from an allowlist. Nothing
// from a document is ever assigned to innerHTML: the HTML is parsed into an
// inert document, and only allowed elements, attributes, and text are copied.
import { STRINGS } from "./strings.js";

export const DOCX_IMAGE_SOURCE_PREFIX = "rich-embeds-image:";

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

// Elements whose whole subtree is discarded rather than unwrapped.
const DROPPED_TAGS = new Set([
  "audio",
  "base",
  "button",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "input",
  "link",
  "math",
  "meta",
  "noscript",
  "object",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "title",
  "video",
]);

const ALLOWED_CLASSES = new Set(["doc-title", "doc-subtitle"]);
const ID_RE = /^doc-[A-Za-z0-9_-]{1,80}$/u;

export function isSafeExternalHref(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function copyAttributes(source, target, tag, options) {
  const id = source.getAttribute("id");

  if (id && ID_RE.test(id)) {
    target.id = `${options.idPrefix}-${id}`;
  }

  const classes = String(source.getAttribute("class") || "")
    .split(/\s+/u)
    .filter((name) => ALLOWED_CLASSES.has(name));

  if (classes.length) {
    target.className = classes.join(" ");
  }

  if (tag === "td" || tag === "th") {
    for (const name of ["colspan", "rowspan"]) {
      const value = Number.parseInt(source.getAttribute(name) || "", 10);

      if (Number.isInteger(value) && value > 1 && value <= 1000) {
        target.setAttribute(name, String(value));
      }
    }
  }
}

function buildAnchor(source, doc, options) {
  const href = String(source.getAttribute("href") || "").trim();

  if (href.startsWith("#")) {
    const fragment = href.slice(1);

    if (ID_RE.test(fragment)) {
      const anchor = doc.createElement("a");
      anchor.setAttribute("href", `#${options.idPrefix}-${fragment}`);
      return anchor;
    }

    return doc.createElement("span");
  }

  if (!isSafeExternalHref(href)) {
    return doc.createElement("span");
  }

  const anchor = doc.createElement("a");
  anchor.setAttribute("href", new URL(href).href);
  anchor.setAttribute("target", "_blank");
  anchor.setAttribute("rel", "noopener noreferrer nofollow ugc");
  anchor.setAttribute("referrerpolicy", "no-referrer");
  return anchor;
}

function buildImage(source, doc, options) {
  const src = String(source.getAttribute("src") || "");
  const index = src.startsWith(DOCX_IMAGE_SOURCE_PREFIX)
    ? Number.parseInt(src.slice(DOCX_IMAGE_SOURCE_PREFIX.length), 10)
    : NaN;
  const objectUrl = Number.isInteger(index) ? options.imageUrls[index] : undefined;
  const alt = String(source.getAttribute("alt") || "").slice(0, 300);

  if (!objectUrl) {
    const placeholder = doc.createElement("span");
    placeholder.className = "rich-embeds-document__omitted";
    placeholder.textContent = alt ? `［${alt}］` : STRINGS.omittedImage;
    return placeholder;
  }

  const image = doc.createElement("img");
  image.setAttribute("src", objectUrl);
  image.setAttribute("alt", alt);
  image.setAttribute("loading", "lazy");
  image.setAttribute("decoding", "async");
  return image;
}

/**
 * Converts untrusted converter HTML into a DocumentFragment of the live
 * document. `imageUrls` maps the worker's image indexes to blob: URLs the page
 * created; any other image source becomes a visible placeholder.
 */
export function sanitizeDocumentHtml(html, { doc, parser, imageUrls = [], idPrefix, maxNodes }) {
  const inert = parser.parseFromString(`<!doctype html><body>${String(html)}`, "text/html");
  const fragment = doc.createDocumentFragment();
  const options = { imageUrls, idPrefix };
  let nodeCount = 0;
  let truncated = false;
  const stack = [{ source: inert.body, target: fragment, child: inert.body.firstChild }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const node = frame.child;

    if (!node) {
      stack.pop();
      continue;
    }

    frame.child = node.nextSibling;

    if (nodeCount >= maxNodes) {
      truncated = true;
      break;
    }

    if (node.nodeType === 3) {
      nodeCount += 1;
      frame.target.appendChild(doc.createTextNode(node.nodeValue));
      continue;
    }

    if (node.nodeType !== 1) {
      continue;
    }

    const tag = node.localName;

    if (DROPPED_TAGS.has(tag)) {
      continue;
    }

    nodeCount += 1;

    if (!ALLOWED_TAGS.has(tag)) {
      // Unknown wrappers are unwrapped so their text stays readable.
      stack.push({ source: node, target: frame.target, child: node.firstChild });
      continue;
    }

    let element;

    if (tag === "a") {
      element = buildAnchor(node, doc, options);
    } else if (tag === "img") {
      frame.target.appendChild(buildImage(node, doc, options));
      continue;
    } else {
      element = doc.createElement(tag);
    }

    copyAttributes(node, element, tag, options);
    frame.target.appendChild(element);
    stack.push({ source: node, target: element, child: node.firstChild });
  }

  return { fragment, truncated, nodeCount };
}

const RENDERED_MEDIA_SELECTOR =
  "script, iframe, frame, object, embed, audio, video, source, track, form, input, textarea, select, link, meta, base, foreignObject";
const URL_ATTRIBUTES = ["src", "href", "xlink:href", "poster", "srcset", "action", "formaction", "data"];

function isLocalResource(value) {
  const text = String(value || "").trim().toLowerCase();
  return text.startsWith("blob:") || text.startsWith("data:image/") || text.startsWith("#");
}

function neutralizeElement(element) {
  for (const name of URL_ATTRIBUTES) {
    if (!element.hasAttribute?.(name)) {
      continue;
    }

    const value = element.getAttribute(name);
    const tag = element.localName;

    if ((tag === "a" || tag === "area") && name === "href") {
      if (isSafeExternalHref(value)) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer nofollow ugc");
        element.setAttribute("referrerpolicy", "no-referrer");
      } else if (!String(value).startsWith("#")) {
        element.removeAttribute(name);
      }
    } else if (!isLocalResource(value)) {
      element.removeAttribute(name);
    }
  }

  for (const attribute of Array.from(element.attributes || [])) {
    const name = attribute.name.toLowerCase();

    if (name.startsWith("on")) {
      element.removeAttribute(attribute.name);
    } else if (name === "style" && /url\(\s*['"]?\s*(?!blob:|data:image\/|#)/iu.test(attribute.value)) {
      element.removeAttribute(attribute.name);
    }
  }
}

/**
 * Applies the same boundary to renderer-generated DOM. The PPTX package has
 * already lost its external relationships in the worker; this is the second
 * line: active elements are removed, network URLs are stripped, and links
 * open in a new browsing context without a referrer.
 */
export function neutralizeRenderedSubtree(root) {
  if (!root?.querySelectorAll) {
    return 0;
  }

  let removed = 0;

  for (const element of Array.from(root.querySelectorAll(RENDERED_MEDIA_SELECTOR))) {
    element.remove();
    removed += 1;
  }

  if (root.nodeType === 1) {
    neutralizeElement(root);
  }

  for (const element of root.querySelectorAll("*")) {
    neutralizeElement(element);
  }

  return removed;
}

export function watchRenderedSubtree(root, MutationObserverImpl = globalThis.MutationObserver) {
  neutralizeRenderedSubtree(root);

  if (typeof MutationObserverImpl !== "function") {
    return () => {};
  }

  const observer = new MutationObserverImpl((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        neutralizeElement(record.target);
      }

      for (const node of record.addedNodes || []) {
        if (node.nodeType === 1) {
          if (node.matches?.(RENDERED_MEDIA_SELECTOR)) {
            node.remove();
          } else {
            neutralizeRenderedSubtree(node);
          }
        }
      }
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "href", "xlink:href", "poster", "srcset", "style"],
  });

  return () => observer.disconnect();
}
