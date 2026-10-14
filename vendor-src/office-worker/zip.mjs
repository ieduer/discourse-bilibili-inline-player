import { Inflate, zipSync } from "fflate";
import { PreviewError } from "./errors.mjs";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const EOCD_MIN_LENGTH = 22;
const EOCD_MAX_COMMENT = 0xffff;
const INFLATE_CHUNK_BYTES = 64 * 1024;
const utf8 = new TextDecoder("utf-8", { fatal: false });

export const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

export function hasMagic(bytes, magic) {
  return bytes.length >= magic.length && magic.every((value, index) => bytes[index] === value);
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (
    (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)) +
    bytes[offset + 3] * 0x1000000
  );
}

function findEndOfCentralDirectory(bytes) {
  const lowest = Math.max(0, bytes.length - EOCD_MIN_LENGTH - EOCD_MAX_COMMENT);

  for (let offset = bytes.length - EOCD_MIN_LENGTH; offset >= lowest; offset -= 1) {
    if (readUint32(bytes, offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw new PreviewError("CORRUPT", "No ZIP end-of-central-directory record");
}

function inflateBounded(compressed, { maxEntryBytes, remainingTotal, checkDeadline }) {
  const chunks = [];
  let produced = 0;
  const inflater = new Inflate();

  inflater.ondata = (chunk) => {
    produced += chunk.length;

    if (produced > maxEntryBytes || produced > remainingTotal) {
      throw new PreviewError("TOO_LARGE", "Decompressed entry exceeds the preview limit");
    }

    chunks.push(chunk);
  };

  for (let offset = 0; offset < compressed.length; offset += INFLATE_CHUNK_BYTES) {
    checkDeadline();
    const end = Math.min(compressed.length, offset + INFLATE_CHUNK_BYTES);
    inflater.push(compressed.subarray(offset, end), end === compressed.length);
  }

  if (compressed.length === 0) {
    inflater.push(new Uint8Array(0), true);
  }

  const output = new Uint8Array(produced);
  let position = 0;

  for (const chunk of chunks) {
    output.set(chunk, position);
    position += chunk.length;
  }

  return output;
}

/**
 * Reads every file entry of a ZIP archive through its central directory.
 *
 * Declared sizes are only used for early rejection: every deflated entry is
 * inflated in bounded chunks and the produced byte count is enforced against
 * the per-entry and whole-archive ceilings, so a ZIP bomb that lies about its
 * uncompressed size stops at the limit instead of exhausting memory.
 */
export function readZipEntries(bytes, limits, checkDeadline = () => {}) {
  if (!(bytes instanceof Uint8Array) || !hasMagic(bytes, ZIP_MAGIC)) {
    throw new PreviewError("CORRUPT", "Not a ZIP package");
  }

  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = readUint16(bytes, eocd + 10);
  const centralSize = readUint32(bytes, eocd + 12);
  const centralOffset = readUint32(bytes, eocd + 16);

  if (entryCount === 0xffff || centralOffset === 0xffffffff || centralSize === 0xffffffff) {
    throw new PreviewError("UNSUPPORTED_ZIP", "ZIP64 archives are not previewed");
  }

  if (entryCount > limits.maxEntries) {
    throw new PreviewError("TOO_MANY_PARTS", "Too many ZIP entries");
  }

  if (centralOffset + centralSize > eocd) {
    throw new PreviewError("CORRUPT", "Central directory is outside the archive");
  }

  const entries = new Map();
  const seenNames = new Set();
  let total = 0;
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    checkDeadline();

    if (cursor + 46 > eocd || readUint32(bytes, cursor) !== CENTRAL_HEADER_SIGNATURE) {
      throw new PreviewError("CORRUPT", "Malformed central directory");
    }

    const flags = readUint16(bytes, cursor + 8);
    const method = readUint16(bytes, cursor + 10);
    const compressedSize = readUint32(bytes, cursor + 20);
    const declaredSize = readUint32(bytes, cursor + 24);
    const nameLength = readUint16(bytes, cursor + 28);
    const extraLength = readUint16(bytes, cursor + 30);
    const commentLength = readUint16(bytes, cursor + 32);
    const localOffset = readUint32(bytes, cursor + 42);
    const name = utf8.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    cursor += 46 + nameLength + extraLength + commentLength;

    if (flags & 0x1) {
      throw new PreviewError("ENCRYPTED", "Encrypted ZIP entry");
    }

    if (compressedSize === 0xffffffff || declaredSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new PreviewError("UNSUPPORTED_ZIP", "ZIP64 entry");
    }

    if (name.endsWith("/")) {
      continue;
    }

    // OPC part names are case-insensitive. Two spellings of one part would let
    // different parsers disagree about which bytes they render.
    const normalizedName = name.toLowerCase();

    if (!name || name.includes("\\") || name.includes("\0") || seenNames.has(normalizedName)) {
      throw new PreviewError("CORRUPT", "Invalid or duplicate ZIP entry name");
    }

    seenNames.add(normalizedName);

    if (method !== 0 && method !== 8) {
      throw new PreviewError("UNSUPPORTED_ZIP", "Unsupported ZIP compression method");
    }

    if (declaredSize > limits.maxEntryBytes || total + declaredSize > limits.maxTotalBytes) {
      throw new PreviewError("TOO_LARGE", "Declared entry size exceeds the preview limit");
    }

    if (localOffset + 30 > bytes.length || readUint32(bytes, localOffset) !== LOCAL_HEADER_SIGNATURE) {
      throw new PreviewError("CORRUPT", "Malformed local header");
    }

    const dataStart =
      localOffset + 30 + readUint16(bytes, localOffset + 26) + readUint16(bytes, localOffset + 28);
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > bytes.length) {
      throw new PreviewError("CORRUPT", "Truncated ZIP entry");
    }

    const compressed = bytes.subarray(dataStart, dataEnd);
    let content;

    if (method === 0) {
      if (compressedSize !== declaredSize) {
        throw new PreviewError("CORRUPT", "Stored entry size mismatch");
      }

      content = compressed.slice();
    } else {
      content = inflateBounded(compressed, {
        maxEntryBytes: limits.maxEntryBytes,
        remainingTotal: limits.maxTotalBytes - total,
        checkDeadline,
      });

      if (content.length !== declaredSize) {
        throw new PreviewError("CORRUPT", "Inflated size does not match the directory");
      }
    }

    total += content.length;
    entries.set(name, content);
  }

  return { entries, totalBytes: total };
}

export function writeStoredZip(entries) {
  const files = {};

  for (const [name, content] of entries) {
    files[name] = [content, { level: 0 }];
  }

  return zipSync(files);
}
