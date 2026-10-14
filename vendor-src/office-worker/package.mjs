import { DOMParser } from "@xmldom/xmldom";
import { PreviewError } from "./errors.mjs";
import { readZipEntries, writeStoredZip } from "./zip.mjs";

const RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const HYPERLINK_TYPE_SUFFIX = "/hyperlink";
const CONTENT_TYPES_PART = "[Content_Types].xml";

export const OOXML_MAIN_TYPES = Object.freeze({
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
});

const MACRO_MAIN_TYPES = new Set([
  "application/vnd.ms-word.document.macroenabled.main+xml",
  "application/vnd.ms-word.template.macroenabledtemplate.main+xml",
  "application/vnd.ms-excel.sheet.macroenabled.main+xml",
  "application/vnd.ms-excel.template.macroenabled.main+xml",
  "application/vnd.ms-excel.addin.macroenabled.main+xml",
  "application/vnd.ms-powerpoint.presentation.macroenabled.main+xml",
  "application/vnd.ms-powerpoint.slideshow.macroenabled.main+xml",
  "application/vnd.ms-powerpoint.template.macroenabled.main+xml",
]);

// Parts that can only carry executable or embedded binary payloads. No
// renderer here needs them, so they are removed before any library sees the
// package. Embedded audio and video are removed too: previews never play them.
const DROPPED_PART_RE =
  /(?:^|\/)(?:vbaProject\.bin|vbaData\.xml|vbaProjectSignature[^/]*\.bin)$|(?:^|\/)activeX\/|\.bin$|(?:^|\/)customUI\/|\.(?:mp4|m4v|mov|avi|wmv|mpg|mpeg|webm|ogv|mkv|mp3|wav|m4a|wma|aac|ogg|oga|flac|mid|midi)$/i;
const XML_PART_RE = /\.(?:xml|rels|vml)$/i;
const DTD_MARKERS = ["<!doctype", "<!entity"];

const XML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

function escapeXmlAttribute(value) {
  return String(value).replace(/[&<>"']/gu, (character) => XML_ESCAPES[character]);
}

function containsAsciiMarker(bytes, marker) {
  const length = marker.length;
  const first = marker.charCodeAt(0);

  outer: for (let index = 0; index <= bytes.length - length; index += 1) {
    if (bytes[index] !== first) {
      continue;
    }

    for (let offset = 1; offset < length; offset += 1) {
      let value = bytes[index + offset];

      if (value >= 0x41 && value <= 0x5a) {
        value += 0x20;
      }

      if (value !== marker.charCodeAt(offset)) {
        continue outer;
      }
    }

    return true;
  }

  return false;
}

// UTF-16 XML is legal OOXML but no Office application writes it; treating it
// as an error keeps the DTD scan honest because the scan reads bytes as ASCII.
function assertSafeXmlPart(bytes) {
  if (
    bytes.length >= 2 &&
    ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))
  ) {
    throw new PreviewError("PARSE_FAILED", "UTF-16 XML parts are not previewed");
  }

  for (const marker of DTD_MARKERS) {
    if (containsAsciiMarker(bytes, marker)) {
      throw new PreviewError("DTD_FORBIDDEN", "XML document type declarations are not allowed");
    }
  }
}

function parseXml(bytes, partName) {
  const text = new TextDecoder("utf-8").decode(bytes);
  let failed = false;
  const parser = new DOMParser({
    onError: (level) => {
      if (level !== "warning") {
        failed = true;
      }
    },
  });
  const document = parser.parseFromString(text, "application/xml");

  if (failed || !document?.documentElement) {
    throw new PreviewError("CORRUPT", `Malformed XML part ${partName}`);
  }

  return document;
}

function elementsByLocalName(document, localName) {
  const found = [];
  const stack = [document.documentElement];

  while (stack.length > 0) {
    const node = stack.pop();

    if (node?.nodeType !== 1) {
      continue;
    }

    if ((node.localName || node.nodeName) === localName) {
      found.push(node);
    }

    for (let child = node.lastChild; child; child = child.previousSibling) {
      stack.push(child);
    }
  }

  return found;
}

function readContentTypes(entries) {
  const bytes = entries.get(CONTENT_TYPES_PART);

  if (!bytes) {
    throw new PreviewError("FORMAT_MISMATCH", "Missing [Content_Types].xml");
  }

  const document = parseXml(bytes, CONTENT_TYPES_PART);
  const overrides = new Map();

  for (const element of elementsByLocalName(document, "Override")) {
    const partName = String(element.getAttribute("PartName") || "").replace(/^\//u, "");
    overrides.set(partName, String(element.getAttribute("ContentType") || "").toLowerCase());
  }

  return overrides;
}

function assertMainPart(format, overrides) {
  const types = new Set(overrides.values());

  for (const type of types) {
    if (MACRO_MAIN_TYPES.has(type)) {
      throw new PreviewError("MACRO_ENABLED", "Macro-enabled package");
    }
  }

  const expected = OOXML_MAIN_TYPES[format];

  if (!expected || !types.has(expected)) {
    throw new PreviewError("FORMAT_MISMATCH", "Package main part does not match the file extension");
  }

  const mainParts = Array.from(overrides).filter(([, type]) => type === expected);

  if (mainParts.length !== 1) {
    throw new PreviewError("FORMAT_MISMATCH", "Package must contain exactly one main part");
  }

  return mainParts[0][0];
}

function relationshipSourceDirectory(relsName) {
  // word/_rels/document.xml.rels describes word/document.xml; _rels/.rels
  // describes the package root.
  const match = relsName.match(/^(.*?)_rels\/[^/]*\.rels$/u);
  return match ? match[1] : "";
}

export function resolvePartTarget(relsName, target) {
  const raw = String(target || "").split("#")[0];

  if (!raw) {
    return "";
  }

  let decoded = raw;

  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Keep the raw spelling; it simply will not match a dropped part.
  }

  const segments = decoded.startsWith("/")
    ? []
    : relationshipSourceDirectory(relsName).split("/").filter(Boolean);

  for (const segment of decoded.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }

  return segments.join("/");
}

export function isAllowedExternalHyperlink(target) {
  try {
    const url = new URL(String(target || "").trim());
    return (
      ["http:", "https:", "mailto:"].includes(url.protocol) && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

// Removed relationships are retargeted instead of deleted: renderers expect
// every r:id in a part to resolve, and a dangling id makes some of them throw.
// The placeholder is an empty part with no content type, so an image or media
// reference to it renders as missing and a hyperlink to it is not absolute.
export const NEUTRALIZED_TARGET_PART = "rich-embeds/removed-reference";

function sanitizeRelationshipsPart(relsName, bytes, droppedParts) {
  const document = parseXml(bytes, relsName);
  const kept = [];
  let neutralized = 0;

  for (const element of elementsByLocalName(document, "Relationship")) {
    const id = element.getAttribute("Id");
    const type = element.getAttribute("Type");
    const target = element.getAttribute("Target");
    const external = String(element.getAttribute("TargetMode") || "").toLowerCase() === "external";

    if (!id || !type || target === null) {
      continue;
    }

    // External relationships make a renderer fetch or open something outside
    // the package (linked images, templates, media, OLE links). Only plain
    // hyperlinks survive, and only with an http, https, or mailto target.
    const unsafeExternal =
      external && (!type.endsWith(HYPERLINK_TYPE_SUFFIX) || !isAllowedExternalHyperlink(target));
    const droppedTarget =
      !external && droppedParts.has(resolvePartTarget(relsName, target).toLowerCase());

    if (unsafeExternal || droppedTarget) {
      neutralized += 1;
      kept.push({ id, type, target: `/${NEUTRALIZED_TARGET_PART}`, external: false });
      continue;
    }

    kept.push({ id, type, target, external });
  }

  const body = kept
    .map(
      ({ id, type, target, external }) =>
        `<Relationship Id="${escapeXmlAttribute(id)}" Type="${escapeXmlAttribute(type)}" Target="${escapeXmlAttribute(target)}"${external ? ' TargetMode="External"' : ""}/>`
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${RELATIONSHIPS_NS}">${body}</Relationships>`;

  return { bytes: new TextEncoder().encode(xml), neutralized };
}

function countSlides(entries, mainPart) {
  const bytes = entries.get(mainPart);

  if (!bytes) {
    throw new PreviewError("FORMAT_MISMATCH", "Missing presentation part");
  }

  return elementsByLocalName(parseXml(bytes, mainPart), "sldId").length;
}

/**
 * Validates an OOXML package against the claimed format and returns a
 * rewritten package that no renderer can use to reach outside the browser:
 * no DTDs, no external relationships other than plain hyperlinks, no macro,
 * ActiveX, OLE, or embedded audio/video parts.
 */
export function sanitizeOoxmlPackage(bytes, format, limits, checkDeadline = () => {}) {
  const { entries, totalBytes } = readZipEntries(bytes, limits, checkDeadline);
  const overrides = readContentTypes(entries);
  const mainPart = assertMainPart(format, overrides);

  if (!entries.has(mainPart)) {
    throw new PreviewError("FORMAT_MISMATCH", "Main part is missing");
  }

  const droppedParts = new Set();

  for (const name of entries.keys()) {
    if (DROPPED_PART_RE.test(name)) {
      droppedParts.add(name.toLowerCase());
    }
  }

  const output = new Map();
  let neutralizedRelationships = 0;

  for (const [name, content] of entries) {
    checkDeadline();

    if (droppedParts.has(name.toLowerCase())) {
      continue;
    }

    if (XML_PART_RE.test(name) || name === CONTENT_TYPES_PART) {
      assertSafeXmlPart(content);
    }

    if (/\.rels$/iu.test(name)) {
      const sanitized = sanitizeRelationshipsPart(name, content, droppedParts);
      neutralizedRelationships += sanitized.neutralized;
      output.set(name, sanitized.bytes);
    } else {
      output.set(name, content);
    }
  }

  if ([...output.keys()].some((name) => name.toLowerCase() === NEUTRALIZED_TARGET_PART)) {
    throw new PreviewError("CORRUPT", "Reserved part name");
  }

  output.set(NEUTRALIZED_TARGET_PART, new Uint8Array(0));

  let slideCount = 0;

  if (format === "pptx") {
    slideCount = countSlides(output, mainPart);

    if (slideCount > limits.maxSlides) {
      throw new PreviewError("TOO_MANY_SLIDES", "Presentation exceeds the slide limit");
    }
  }

  return {
    entries: output,
    mainPart,
    slideCount,
    stats: {
      entries: entries.size,
      uncompressedBytes: totalBytes,
      droppedParts: droppedParts.size,
      neutralizedRelationships,
    },
  };
}

export function repackage(sanitized) {
  return writeStoredZip(sanitized.entries);
}
