// Office attachment formats this layer recognizes. PDF, EPUB, MOBI, and AZW3
// are deliberately absent: PDF belongs to Discourse's official PDF Previews
// component and ebooks to the Foliate reader in this component.
export const DOCUMENT_FORMATS = Object.freeze({
  docx: Object.freeze({ id: "docx", badge: "DOCX", engine: "worker", supported: true }),
  xlsx: Object.freeze({ id: "xlsx", badge: "XLSX", engine: "worker", supported: true }),
  xls: Object.freeze({ id: "xls", badge: "XLS", engine: "worker", supported: true }),
  pptx: Object.freeze({ id: "pptx", badge: "PPTX", engine: "pptx", supported: true }),
  doc: Object.freeze({ id: "doc", badge: "DOC", engine: null, supported: false }),
  ppt: Object.freeze({ id: "ppt", badge: "PPT", engine: null, supported: false }),
  docm: Object.freeze({ id: "docm", badge: "DOCM", engine: null, supported: false }),
  xlsm: Object.freeze({ id: "xlsm", badge: "XLSM", engine: null, supported: false }),
  pptm: Object.freeze({ id: "pptm", badge: "PPTM", engine: null, supported: false }),
});

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS_RE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;
// eslint-disable-next-line no-control-regex
const HAS_CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const EXTENSION_RE = /\.([A-Za-z0-9]{1,8})$/u;

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Turns a filename taken from a URL or from cooked link text into something
 * safe to show: control and bidirectional-override characters are removed so
 * a name like "report‮xcod.exe" cannot disguise its real extension.
 */
export function displayFilename(value, fallback = "") {
  const cleaned = String(value ?? "")
    .replace(/[\t\n\r\f\v]+/gu, " ")
    .replace(CONTROL_CHARACTERS_RE, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 200);

  return cleaned || fallback;
}

/**
 * Parses an attachment href into a document descriptor. The format comes only
 * from the last path segment of the actual URL, never from link text or a
 * query string, so "notes.pdf?x=.docx" and "a.docx.exe" are not documents.
 */
export function parseDocumentAttachmentUrl(href, baseUrl) {
  if (typeof href !== "string" || !href.trim()) {
    return null;
  }

  let url;

  try {
    url = new URL(href.trim(), baseUrl);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    return null;
  }

  // A path ending in "/" names a directory, not an uploaded file.
  const rawSegment = url.pathname.split("/").at(-1) || "";
  const decoded = decodeSegment(rawSegment);

  if (/[\\/]/u.test(decoded) || HAS_CONTROL_CHARACTER_RE.test(decoded)) {
    return null;
  }

  const extension = decoded.match(EXTENSION_RE)?.[1]?.toLowerCase() || "";
  const format = DOCUMENT_FORMATS[extension];

  if (!format) {
    return null;
  }

  return {
    format: format.id,
    badge: format.badge,
    engine: format.engine,
    supported: format.supported,
    filename: displayFilename(decoded, `document.${extension}`),
    url: url.href,
    origin: url.origin,
    pathname: url.pathname,
    hasQuery: url.search.length > 0,
    hasFragment: url.hash.length > 0,
  };
}

const SIZE_TEXT_RE = /^\s*\(([\d.,]+\s?(?:[KMGT]i?B|bytes?|B))\)/iu;

/** Reads Discourse's "(23.4 KB)" size hint that follows an attachment link. */
export function readAttachmentSizeText(anchor) {
  const next = anchor?.nextSibling;

  if (!next || next.nodeType !== 3) {
    return "";
  }

  return next.textContent.match(SIZE_TEXT_RE)?.[1] || "";
}
