// Minimal ZIP writer for hostile test packages. It can lie about sizes, add
// duplicate names, and set flags, which no normal archiver allows.
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

const encoder = new TextEncoder();

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value & 0xffff);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

/**
 * entries: [{ name, data, method = 8, flags = 0, declaredSize }]
 * Returns a Uint8Array containing a complete ZIP archive.
 */
export function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(encoder.encode(entry.name));
    const raw = Buffer.from(typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data);
    const method = entry.method ?? 8;
    const body = method === 8 ? deflateRawSync(raw) : raw;
    const declared = entry.declaredSize ?? raw.length;
    const flags = (entry.flags ?? 0) | 0x0800;
    const checksum = crc32(raw);
    const local = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(flags),
      uint16(method),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(body.length),
      uint32(declared),
      uint16(name.length),
      uint16(0),
      name,
      body,
    ]);
    const central = Buffer.concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(flags),
      uint16(method),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(body.length),
      uint32(declared),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralBuffer.length),
    uint32(offset),
    uint16(0),
  ]);

  return new Uint8Array(Buffer.concat([...locals, centralBuffer, end]));
}

const CONTENT_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
  docm: "application/vnd.ms-word.document.macroEnabled.main+xml",
};

const MAIN_PARTS = { docx: "word/document.xml", docm: "word/document.xml", xlsx: "xl/workbook.xml", pptx: "ppt/presentation.xml" };

/** A small, valid DOCX whose body and document relationships can be replaced. */
export function makeDocx({
  body = "<w:p><w:r><w:t>Hello</w:t></w:r></w:p>",
  documentRels = "",
  mainType = "docx",
  extraEntries = [],
  contentTypesPrefix = "",
} = {}) {
  const contentTypes = `${contentTypesPrefix}<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/${MAIN_PARTS[mainType]}" ContentType="${CONTENT_TYPES[mainType]}"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const document = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${documentRels}</Relationships>`;

  return makeZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "word/document.xml", data: document },
    { name: "word/_rels/document.xml.rels", data: rels },
    ...extraEntries,
  ]);
}

/** Reads back an archive written with local-header sizes (makeZip or Office output). */
export function readZipForTest(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = [];
  let offset = 0;

  while (view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compressed = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    const body = bytes.subarray(start, start + compressed);
    entries.push({ name, data: method === 8 ? new Uint8Array(inflateRawSync(body)) : body });
    offset = start + compressed;
  }

  return entries;
}

/**
 * A copy of sample.pptx whose fifth slide points its picture at an external
 * image and adds an external video, as a hostile author could write it.
 */
export function hostilePptx(sampleBytes, trackerUrl) {
  const decoder = new TextDecoder();
  const entries = readZipForTest(sampleBytes).map((entry) => {
    if (entry.name !== "ppt/slides/_rels/slide5.xml.rels") {
      return entry;
    }

    const xml = decoder
      .decode(entry.data)
      .replace(/Target="\.\.\/media\/image\d+\.png"/u, `Target="${trackerUrl}" TargetMode="External"`)
      .replace(
        "</Relationships>",
        `<Relationship Id="rIdMovie" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/video" Target="${trackerUrl}.mp4" TargetMode="External"/></Relationships>`
      );
    return { name: entry.name, data: xml };
  });

  return makeZip(entries);
}
