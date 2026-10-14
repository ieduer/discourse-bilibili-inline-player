import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorkerBundle, readFixture } from "./helpers/worker-bundle.mjs";
import { hostilePptx, makeDocx, makeZip, readZipForTest } from "./helpers/zip.mjs";

const worker = loadWorkerBundle();
const text = (bytes) => new TextDecoder().decode(bytes);

function readStoredEntries(buffer) {
  // The sanitized package is written with stored (uncompressed) entries, so
  // part bodies can be read directly from local headers.
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = new Map();
  let offset = 0;

  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = text(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    entries.set(name, bytes.subarray(start, start + size));
    offset = start + size;
  }

  return entries;
}

test("worker renders the representative DOCX fixture to semantic HTML", async () => {
  const { message, transferred } = await worker.request("docx", readFixture("sample.docx"));

  assert.equal(message.ok, true);
  assert.equal(message.result.format, "docx");
  assert.match(message.result.html, /<h1 class="doc-title">季度阅读报告 Quarterly reading report<\/h1>/u);
  assert.match(message.result.html, /<h2>三、表格 Table<\/h2><table>/u);
  assert.match(message.result.html, /<ul><li>第一项 first<\/li>/u);
  assert.match(message.result.html, /<ol><li>步骤一 step one<\/li>/u);
  assert.match(message.result.html, /<strong>粗体 bold<\/strong>/u);
  assert.match(message.result.html, /<u>下划线 underline<\/u>/u);
  assert.match(message.result.html, /<a href="https:\/\/example\.org\/reading">/u);
  assert.match(message.result.html, /<img src="rich-embeds-image:0" \/>/u);
  assert.equal(message.result.images.length, 1);
  assert.equal(message.result.images[0].contentType, "image/png");
  assert.deepEqual(transferred, [message.result.images[0].buffer.byteLength], "image buffers are transferred");
  // mammoth drops OMML equations; the documented limitation is visible here.
  assert.doesNotMatch(message.result.html, /E=mc/u);
});

test("worker reads cached workbook values, sheet states, merges, and limits for XLSX", async () => {
  const { message } = await worker.request("xlsx", readFixture("sample.xlsx"));
  assert.equal(message.ok, true);
  const { sheets, sheetCount, activeSheet } = message.result;
  const byName = Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet]));

  assert.equal(sheetCount, 5);
  assert.equal(activeSheet, 0);
  assert.deepEqual(byName["成绩 Scores"].rows[2], ["甲", "12", "40%", "2026-09-03"]);
  assert.deepEqual(byName["成绩 Scores"].rows[5].slice(0, 3), ["合计 Total", "30", "100.0%"]);
  assert.equal(byName["成绩 Scores"].kinds[2], "snnn");
  assert.deepEqual(byName["成绩 Scores"].merges, [{ row: 0, column: 0, rowSpan: 1, columnSpan: 4 }]);
  assert.equal(byName["隐藏 Hidden"].state, "hidden");
  assert.equal(byName["长表 Long"].rows.length, 1000);
  assert.equal(byName["长表 Long"].totalRows, 2501);
  assert.equal(byName["长表 Long"].truncatedRows, true);
  assert.equal(byName["宽表 Wide"].rows[0].length, 100);
  assert.equal(byName["宽表 Wide"].totalColumns, 260);
  assert.equal(byName["宽表 Wide"].truncatedColumns, true);
  // Formula results are the values saved with the file; nothing is evaluated.
  assert.deepEqual(byName["公式 Formulas"].rows.map((row) => row[0]), ["2", "3", "6", "link", "#DIV/0!"]);
});

test("worker reads the legacy XLS fixture through the same model", async () => {
  const { message } = await worker.request("xls", readFixture("sample.xls"));
  assert.equal(message.ok, true);
  const scores = message.result.sheets.find((sheet) => sheet.name === "成绩 Scores");
  assert.deepEqual(scores.rows[2], ["甲", "12", "40%", "2026-09-03"]);
  assert.equal(message.result.sheets.find((sheet) => sheet.name === "隐藏 Hidden").state, "hidden");
});

test("worker sanitizes the PPTX fixture into a stored package and keeps safe hyperlinks", async () => {
  const { message, transferred } = await worker.request("pptx", readFixture("sample.pptx"));
  assert.equal(message.ok, true);
  assert.equal(message.result.slideCount, 5);
  assert.deepEqual(transferred, [message.result.packageBytes.byteLength]);
  const entries = readStoredEntries(message.result.packageBytes);
  assert.ok(entries.has("ppt/presentation.xml"));
  assert.ok(entries.has("rich-embeds/removed-reference"));
  const slideRels = text(entries.get("ppt/slides/_rels/slide2.xml.rels"));
  assert.match(slideRels, /Target="https:\/\/example\.org\/slides" TargetMode="External"/u);
});

test("cell, row, sheet, and slide limits are enforced in the worker", async () => {
  const cells = await worker.request("xlsx", readFixture("sample.xlsx"), { maxCells: 30, maxRows: 10 });
  const long = cells.message.result.sheets.find((sheet) => sheet.name === "长表 Long");
  assert.ok(long.rows.length <= 10);

  const sheets = await worker.request("xlsx", readFixture("sample.xlsx"), { maxSheets: 2 });
  assert.equal(sheets.message.result.sheets.length, 2);
  assert.equal(sheets.message.result.truncatedSheets, true);

  const slides = await worker.request("pptx", readFixture("sample.pptx"), { maxSlides: 2 });
  assert.deepEqual(slides.message, { id: 7, ok: false, error: { code: "TOO_MANY_SLIDES" } });
});

test("spoofed extensions and non-Office bytes are rejected", async () => {
  const cases = [
    ["xlsx", readFixture("sample.docx"), "FORMAT_MISMATCH"],
    ["docx", readFixture("sample.pptx"), "FORMAT_MISMATCH"],
    ["pptx", readFixture("sample.xlsx"), "FORMAT_MISMATCH"],
    ["xls", readFixture("sample.xlsx"), "FORMAT_MISMATCH"],
    ["docx", new TextEncoder().encode("<html><body>login</body></html>"), "FORMAT_MISMATCH"],
    ["docx", readFixture("sample.xls"), "ENCRYPTED"],
    ["docx", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), "CORRUPT"],
    ["pdf", readFixture("sample.docx"), "FORMAT_MISMATCH"],
  ];

  for (const [format, bytes, code] of cases) {
    const { message } = await worker.request(format, bytes);
    assert.equal(message.ok, false, `${format} ${code}`);
    assert.equal(message.error.code, code, `${format} ${code}`);
  }
});

test("ZIP bombs stop at the decompression limit even when sizes are forged", async () => {
  const zeros = new Uint8Array(20 * 1024 * 1024);
  const honest = makeDocx({ extraEntries: [{ name: "word/media/zeros.bin.png", data: zeros }] });
  const forged = makeDocx({
    extraEntries: [{ name: "word/media/zeros.png", data: zeros, declaredSize: 1024 }],
  });
  const spread = makeDocx({
    extraEntries: Array.from({ length: 4 }, (_, index) => ({
      name: `word/media/part${index}.png`,
      data: new Uint8Array(6 * 1024 * 1024),
    })),
  });
  const limits = { maxEntryBytes: 8 * 1024 * 1024, maxTotalBytes: 16 * 1024 * 1024 };

  assert.equal((await worker.request("docx", honest, limits)).message.error.code, "TOO_LARGE");
  assert.equal((await worker.request("docx", forged, limits)).message.error.code, "TOO_LARGE");
  assert.equal((await worker.request("docx", spread, limits)).message.error.code, "TOO_LARGE");
  assert.ok(honest.byteLength < 100 * 1024, "the bomb itself is small");
});

test("archive structure abuse is rejected", async () => {
  const shrunk = makeDocx({ extraEntries: [{ name: "word/x.xml", data: "<a>abcdef</a>", declaredSize: 99 }] });
  assert.equal((await worker.request("docx", shrunk)).message.error.code, "CORRUPT");

  const duplicate = makeDocx({ extraEntries: [{ name: "WORD/document.xml", data: "<x/>" }] });
  assert.equal((await worker.request("docx", duplicate)).message.error.code, "CORRUPT");

  const encrypted = makeDocx({ extraEntries: [{ name: "word/secret.xml", data: "<x/>", flags: 1 }] });
  assert.equal((await worker.request("docx", encrypted)).message.error.code, "ENCRYPTED");

  const many = makeDocx({
    extraEntries: Array.from({ length: 50 }, (_, index) => ({ name: `customXml/i${index}.xml`, data: "<x/>" })),
  });
  assert.equal((await worker.request("docx", many, { maxEntries: 20 })).message.error.code, "TOO_MANY_PARTS");

  const stored = makeDocx({ extraEntries: [{ name: "word/odd.xml", data: "<x/>", method: 12 }] });
  assert.equal((await worker.request("docx", stored)).message.error.code, "UNSUPPORTED_ZIP");
});

test("XML document type declarations and entities are refused in every part", async () => {
  const laughs =
    '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;">]><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>&lol2;</w:t></w:r></w:p></w:body></w:document>';
  const inDocument = makeZip([
    ...readZipForTest(makeDocx()).filter((entry) => entry.name !== "word/document.xml"),
    { name: "word/document.xml", data: laughs },
  ]);
  const inContentTypes = makeDocx({ contentTypesPrefix: '<!DOCTYPE x SYSTEM "https://tracker.invalid/x.dtd">' });
  const lowerCaseEntity = makeDocx({ extraEntries: [{ name: "word/extra.xml", data: '<!entity x "y"><x/>' }] });

  for (const bytes of [inDocument, inContentTypes, lowerCaseEntity]) {
    assert.equal((await worker.request("docx", bytes)).message.error.code, "DTD_FORBIDDEN");
  }
});

test("external images and media in a PPTX are neutralized before the renderer sees them", async () => {
  const tracker = "https://tracker.invalid/pixel.png";
  const { message } = await worker.request("pptx", hostilePptx(readFixture("sample.pptx"), tracker));
  assert.equal(message.ok, true);
  const entries = readStoredEntries(message.result.packageBytes);
  const rels = text(entries.get("ppt/slides/_rels/slide5.xml.rels"));
  assert.doesNotMatch(rels, /tracker\.invalid|TargetMode="External"/u);
  assert.equal((rels.match(/Target="\/rich-embeds\/removed-reference"/gu) || []).length, 2);
  for (const [name, content] of entries) {
    assert.doesNotMatch(text(content), /tracker\.invalid/u, name);
  }
});

test("macro-enabled packages are refused even when renamed to .docx", async () => {
  const bytes = makeDocx({ mainType: "docm" });
  assert.equal((await worker.request("docx", bytes)).message.error.code, "MACRO_ENABLED");
});

test("external relationships are neutralized before conversion", async () => {
  const pixel = "https://tracker.invalid/pixel.png";
  const body = [
    '<w:p><w:hyperlink r:id="rIdSafe"><w:r><w:t>safe link</w:t></w:r></w:hyperlink></w:p>',
    '<w:p><w:hyperlink r:id="rIdScript"><w:r><w:t>script link</w:t></w:r></w:hyperlink></w:p>',
    '<w:p><w:r><w:t>&lt;script&gt;alert(1)&lt;/script&gt;</w:t></w:r></w:p>',
    '<w:p><w:r><w:drawing><wp:inline><wp:docPr id="1" name="p" descr="linked"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:link="rIdPixel"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>',
  ].join("");
  const rels = [
    '<Relationship Id="rIdSafe" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.org/ok" TargetMode="External"/>',
    '<Relationship Id="rIdScript" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:alert(1)" TargetMode="External"/>',
    `<Relationship Id="rIdPixel" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${pixel}" TargetMode="External"/>`,
    '<Relationship Id="rIdTemplate" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate" Target="https://tracker.invalid/t.dotm" TargetMode="External"/>',
    '<Relationship Id="rIdVba" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/>',
  ].join("");
  const bytes = makeDocx({
    body,
    documentRels: rels,
    extraEntries: [{ name: "word/vbaProject.bin", data: new Uint8Array([1, 2, 3]) }],
  });
  const { message } = await worker.request("docx", bytes);

  assert.equal(message.ok, true, JSON.stringify(message.error));
  assert.match(message.result.html, /<a href="https:\/\/example\.org\/ok">safe link<\/a>/u);
  assert.doesNotMatch(message.result.html, /javascript:|tracker\.invalid|<script/u);
  assert.match(message.result.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.equal(message.result.stats.droppedParts, 1);
  assert.equal(message.result.stats.neutralizedRelationships, 4);
});

test("the parse deadline is enforced inside the worker", async () => {
  const bytes = makeDocx({
    extraEntries: Array.from({ length: 3000 }, (_, index) => ({ name: `customXml/n${index}.xml`, data: "<x/>" })),
  });
  const { message } = await worker.request("docx", bytes, { timeoutMs: 1 });
  assert.equal(message.error.code, "TIMEOUT");
});

test("the worker rejects requests from an unknown protocol or without limits", async () => {
  const wrongProtocol = await worker.request("docx", readFixture("sample.docx"), {}, { protocol: 2 });
  assert.deepEqual(wrongProtocol.message, { id: 7, ok: false, error: { code: "PARSE_FAILED" } });

  const noLimits = await worker.request("docx", readFixture("sample.docx"), { maxRows: 0 });
  assert.equal(noLimits.message.error.code, "PARSE_FAILED");
});
