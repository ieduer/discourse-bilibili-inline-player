import { convertDocx } from "./docx.mjs";
import { createDeadline, PreviewError } from "./errors.mjs";
import { repackage, sanitizeOoxmlPackage } from "./package.mjs";
import { convertWorkbook } from "./spreadsheet.mjs";
import { hasMagic, ZIP_MAGIC } from "./zip.mjs";

export const WORKER_PROTOCOL_VERSION = 1;

const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const NUMERIC_LIMITS = [
  "timeoutMs",
  "maxEntries",
  "maxEntryBytes",
  "maxTotalBytes",
  "maxSlides",
  "maxImages",
  "maxImageBytes",
  "maxHtmlChars",
  "maxSheets",
  "maxRows",
  "maxColumns",
  "maxCells",
  "maxCellChars",
  "maxMerges",
];

function readLimits(value) {
  const limits = {};

  for (const name of NUMERIC_LIMITS) {
    const number = Number(value?.[name]);

    if (!Number.isFinite(number) || number <= 0) {
      throw new PreviewError("PARSE_FAILED", `Missing limit ${name}`);
    }

    limits[name] = Math.floor(number);
  }

  return limits;
}

function assertZip(bytes) {
  if (hasMagic(bytes, CFB_MAGIC)) {
    // An Office file saved with a password is a compound file that wraps the
    // encrypted OOXML package.
    throw new PreviewError("ENCRYPTED", "Encrypted or legacy compound document");
  }

  if (!hasMagic(bytes, ZIP_MAGIC)) {
    throw new PreviewError("FORMAT_MISMATCH", "Not an Office Open XML package");
  }
}

export async function handlePreviewRequest(request) {
  const limits = readLimits(request?.limits);
  const checkDeadline = createDeadline(limits.timeoutMs);
  const bytes = request?.bytes instanceof ArrayBuffer ? new Uint8Array(request.bytes) : null;

  if (!bytes || bytes.length === 0) {
    throw new PreviewError("CORRUPT", "Empty file");
  }

  switch (request.format) {
    case "docx": {
      assertZip(bytes);
      const sanitized = sanitizeOoxmlPackage(bytes, "docx", limits, checkDeadline);
      const document = await convertDocx(repackage(sanitized), limits, checkDeadline);
      return {
        result: { format: "docx", ...document, stats: sanitized.stats },
        transfer: document.images.map((image) => image.buffer),
      };
    }

    case "xlsx": {
      assertZip(bytes);
      const sanitized = sanitizeOoxmlPackage(bytes, "xlsx", limits, checkDeadline);
      const workbook = convertWorkbook(repackage(sanitized), limits, checkDeadline);
      return { result: { format: "xlsx", ...workbook, stats: sanitized.stats }, transfer: [] };
    }

    case "xls": {
      if (!hasMagic(bytes, CFB_MAGIC)) {
        throw new PreviewError("FORMAT_MISMATCH", "Not a legacy Excel compound document");
      }

      const workbook = convertWorkbook(bytes, limits, checkDeadline);
      return { result: { format: "xls", ...workbook, stats: {} }, transfer: [] };
    }

    case "pptx": {
      assertZip(bytes);
      const sanitized = sanitizeOoxmlPackage(bytes, "pptx", limits, checkDeadline);
      const packageBytes = repackage(sanitized);
      return {
        result: {
          format: "pptx",
          packageBytes: packageBytes.buffer,
          slideCount: sanitized.slideCount,
          stats: sanitized.stats,
        },
        transfer: [packageBytes.buffer],
      };
    }

    default:
      throw new PreviewError("FORMAT_MISMATCH", "Unsupported preview format");
  }
}

function errorPayload(error) {
  return {
    code: error instanceof PreviewError ? error.code : "PARSE_FAILED",
  };
}

const workerScope = typeof self === "object" && self ? self : null;

if (workerScope && typeof workerScope.postMessage === "function") {
  workerScope.onmessage = async (event) => {
    const request = event?.data || {};
    const id = request.id;

    if (request.protocol !== WORKER_PROTOCOL_VERSION) {
      workerScope.postMessage({ id, ok: false, error: { code: "PARSE_FAILED" } });
      return;
    }

    try {
      const { result, transfer } = await handlePreviewRequest(request);
      workerScope.postMessage({ id, ok: true, result }, transfer);
    } catch (error) {
      workerScope.postMessage({ id, ok: false, error: errorPayload(error) });
    }
  };
}
