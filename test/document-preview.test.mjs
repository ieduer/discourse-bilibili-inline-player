import assert from "node:assert/strict";
import { test } from "node:test";
import { CARD_CLASS, createDocumentCard } from "../javascripts/discourse/lib/document-preview/card.js";
import { DocumentPreviewError, fetchDocumentBytes } from "../javascripts/discourse/lib/document-preview/fetch.js";
import {
  displayFilename,
  parseDocumentAttachmentUrl,
} from "../javascripts/discourse/lib/document-preview/formats.js";
import {
  collectDocumentCandidates,
  createDocumentPreviewHost,
  disposeDisconnectedCards,
  placeDocumentCards,
} from "../javascripts/discourse/lib/document-preview/index.js";
import {
  buildMicrosoftViewerUrl,
  buildTrustedOrigins,
  evaluateExternalViewer,
  parsePublicPrefixes,
  readPostContext,
} from "../javascripts/discourse/lib/document-preview/policy.js";
import { columnName, renderSpreadsheet } from "../javascripts/discourse/lib/document-preview/renderers.js";
import { isSafeExternalHref } from "../javascripts/discourse/lib/document-preview/sanitize.js";
import {
  createPreviewScheduler,
  runPreviewWorker,
} from "../javascripts/discourse/lib/document-preview/worker-client.js";
import { build, FakeDocument } from "./helpers/fake-dom.mjs";

const FORUM = "https://forum.example";
const BASE = `${FORUM}/t/topic/1`;
const tick = () => new Promise((resolve) => setImmediate(resolve));

// ── formats ──

test("attachment URLs are classified by the real file extension only", () => {
  const parse = (href) => parseDocumentAttachmentUrl(href, BASE);

  assert.equal(parse("/uploads/short-url/abc.DOCX").format, "docx");
  assert.equal(parse("/uploads/short-url/abc.PpTx").format, "pptx");
  assert.equal(parse("/uploads/%E6%8A%A5%E5%91%8A.xlsx?dl=1").filename, "报告.xlsx");
  assert.equal(parse("/uploads/%E6%8A%A5%E5%91%8A.xlsx?dl=1").hasQuery, true);
  assert.equal(parse("/uploads/a.xls").format, "xls");
  assert.equal(parse("/uploads/old.doc").supported, false);
  assert.equal(parse("/uploads/old.ppt").supported, false);
  assert.equal(parse("/uploads/macro.xlsm").supported, false);

  for (const href of [
    "/uploads/report.pdf",
    "/uploads/book.epub",
    "/uploads/book.azw3",
    "/uploads/notes.pdf?name=x.docx",
    "/uploads/notes.pdf#x.docx",
    "/uploads/a.docx.exe",
    "/uploads/a%2Fb.docx",
    "/uploads/%E2%80%AExcod.docx",
    "/uploads/a%00.docx",
    "/uploads/%E0%A4%A.docx/",
    "javascript:alert(1)//x.docx",
    "data:application/octet-stream,x.docx",
    "https://user:pass@forum.example/a.docx",
    "ftp://forum.example/a.docx",
    "",
    "   ",
  ]) {
    assert.equal(parse(href), null, href);
  }

  assert.equal(parse("http://[bad/a.docx"), null);
});

test("display names strip bidirectional overrides and control characters", () => {
  assert.equal(displayFilename("report‮xcod.exe"), "reportxcod.exe");
  assert.equal(displayFilename("a\u0000b\nc.docx"), "ab c.docx");
  assert.equal(displayFilename("   ", "fallback.docx"), "fallback.docx");
});

// ── policy ──

test("trusted origins are the forum, its announced upload stores, and explicit https origins", () => {
  const origins = buildTrustedOrigins({
    pageOrigin: FORUM,
    setupData: { s3Cdn: "https://cdn.example", s3BaseUrl: "//bucket.example" },
    extraOrigins: "https://files.example|http://plain.example|https://x.example/path|not a url|http://localhost:3000",
  });

  assert.deepEqual([...origins].sort(), [
    "http://localhost:3000",
    "https://bucket.example",
    "https://cdn.example",
    "https://files.example",
    FORUM,
  ]);
});

const publicContext = {
  hasPostModel: true,
  isPrivateMessage: false,
  categoryReadRestricted: false,
  loginRequired: false,
  secureUploads: false,
};

function decide(url, context = publicContext, prefixes = "https://forum.example/uploads/short-url/") {
  return evaluateExternalViewer({
    attachment: { url },
    provider: "microsoft",
    publicPrefixes: parsePublicPrefixes(prefixes),
    context,
  });
}

test("the external viewer requires opt-in, a certified public prefix, and a public post", () => {
  const url = `${FORUM}/uploads/short-url/abc.pptx`;

  assert.deepEqual(decide(url), { allowed: true, reason: "allowed" });
  assert.equal(
    evaluateExternalViewer({
      attachment: { url },
      provider: "disabled",
      publicPrefixes: parsePublicPrefixes(`${FORUM}/uploads/`),
      context: publicContext,
    }).reason,
    "disabled"
  );
  assert.equal(decide(url, publicContext, "").reason, "no_public_prefix");
  assert.equal(decide(`${url}?X-Amz-Signature=abc`).reason, "query_or_fragment");
  assert.equal(decide(`${url}#page=2`).reason, "query_or_fragment");
  assert.equal(decide(`${FORUM}/secure-uploads/original/1X/a.pptx`, publicContext, `${FORUM}/`).reason, "protected_upload");
  assert.equal(decide(`${FORUM}/secure-media-uploads/a.pptx`, publicContext, `${FORUM}/`).reason, "protected_upload");
  assert.equal(decide(`http://forum.example/uploads/short-url/a.pptx`).reason, "not_https");
  assert.equal(decide(`https://forum.example.evil.test/uploads/short-url/a.pptx`).reason, "outside_public_prefix");
  assert.equal(decide(`${FORUM}/uploads/short-url-other/a.pptx`).reason, "outside_public_prefix");
  assert.equal(decide(url, { ...publicContext, hasPostModel: false }).reason, "no_post_context");
  assert.equal(decide(url, { ...publicContext, isPrivateMessage: true }).reason, "private_message");
  assert.equal(decide(url, { ...publicContext, isPrivateMessage: undefined }).reason, "private_message");
  assert.equal(decide(url, { ...publicContext, categoryReadRestricted: true }).reason, "restricted_category");
  assert.equal(decide(url, { ...publicContext, categoryReadRestricted: undefined }).reason, "restricted_category");
  assert.equal(decide(url, { ...publicContext, loginRequired: true }).reason, "login_required");
  assert.equal(decide(url, { ...publicContext, secureUploads: undefined }).reason, "secure_uploads");
});

test("public prefixes must be https directories without queries or protected paths", () => {
  assert.deepEqual(
    parsePublicPrefixes(
      "https://a.example/uploads/|https://a.example/no-slash|http://a.example/x/|https://a.example/x/?q=1|https://a.example/secure-uploads/|https://u:p@a.example/y/"
    ),
    [{ origin: "https://a.example", pathname: "/uploads/" }]
  );
});

test("post context is read from the decorator helper and fails closed", () => {
  const helper = {
    model: { topic: { archetype: "regular", category: { read_restricted: false } } },
  };
  assert.deepEqual(readPostContext(helper, { login_required: false, secure_uploads: false }), publicContext);
  assert.equal(readPostContext({ model: { topic: { archetype: "private_message" } } }, {}).isPrivateMessage, true);
  assert.deepEqual(readPostContext(undefined, undefined), {
    hasPostModel: false,
    isPrivateMessage: undefined,
    categoryReadRestricted: undefined,
    loginRequired: undefined,
    secureUploads: undefined,
  });
});

test("the Microsoft viewer URL carries only the encoded document URL", () => {
  const viewer = new URL(buildMicrosoftViewerUrl(`${FORUM}/uploads/short-url/a b.pptx`));
  assert.equal(viewer.origin, "https://view.officeapps.live.com");
  assert.equal(viewer.pathname, "/op/embed.aspx");
  assert.deepEqual([...viewer.searchParams.keys()], ["src"]);
  assert.equal(viewer.searchParams.get("src"), `${FORUM}/uploads/short-url/a b.pptx`);
});

// ── fetch ──

function streamOf(chunks) {
  let index = 0;
  let cancelled = false;
  return {
    get cancelled() {
      return cancelled;
    },
    getReader() {
      return {
        read: async () =>
          index < chunks.length ? { done: false, value: chunks[index++] } : { done: true, value: undefined },
        cancel: async () => {
          cancelled = true;
        },
      };
    },
    cancel: async () => {
      cancelled = true;
    },
  };
}

function response({ url, status = 200, type = "application/octet-stream", length, chunks = [new Uint8Array([1, 2, 3])] }) {
  const headers = new Map([["content-type", type]]);

  if (length !== undefined) {
    headers.set("content-length", String(length));
  }

  return { ok: status >= 200 && status < 300, status, url, headers: { get: (name) => headers.get(name) ?? null }, body: streamOf(chunks) };
}

const trusted = new Set([FORUM, "https://cdn.example"]);

test("attachment fetches stay on trusted origins and send the session only to the forum", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return response({ url: "https://cdn.example/original/a.docx" });
  };
  const bytes = await fetchDocumentBytes(`${FORUM}/uploads/short-url/a.docx`, {
    maxBytes: 10,
    trustedOrigins: trusted,
    fetchImpl,
  });

  assert.deepEqual([...new Uint8Array(bytes)], [1, 2, 3]);
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(calls[0].init.redirect, "follow");

  await assert.rejects(
    fetchDocumentBytes("https://elsewhere.example/a.docx", { maxBytes: 10, trustedOrigins: trusted, fetchImpl }),
    { code: "UNTRUSTED_ORIGIN" }
  );
  assert.equal(calls.length, 1, "no request is made to an untrusted origin");
});

test("unsafe redirects, HTML pages, HTTP errors, and oversized bodies are refused", async () => {
  const run = (res, maxBytes = 10) =>
    fetchDocumentBytes(`${FORUM}/uploads/a.docx`, {
      maxBytes,
      trustedOrigins: trusted,
      fetchImpl: async () => res,
    });

  const redirected = response({ url: "https://attacker.example/a.docx" });
  await assert.rejects(run(redirected), { code: "UNTRUSTED_REDIRECT" });
  assert.equal(redirected.body.cancelled, true);
  await assert.rejects(run(response({ url: `${FORUM}/login`, type: "text/html; charset=utf-8" })), {
    code: "NOT_A_FILE",
  });
  await assert.rejects(run(response({ url: `${FORUM}/uploads/a.docx`, status: 404 })), { code: "HTTP" });
  await assert.rejects(run(response({ url: `${FORUM}/uploads/a.docx`, length: 11 })), { code: "TOO_LARGE" });

  const streamed = response({
    url: `${FORUM}/uploads/a.docx`,
    chunks: [new Uint8Array(6), new Uint8Array(6)],
  });
  await assert.rejects(run(streamed), { code: "TOO_LARGE" });
  assert.equal(streamed.body.cancelled, true, "the stream is cancelled once over the limit");
});

test("network failures and aborts map to their own codes", async () => {
  await assert.rejects(
    fetchDocumentBytes(`${FORUM}/a.docx`, {
      maxBytes: 10,
      trustedOrigins: trusted,
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    }),
    { code: "NETWORK" }
  );
  await assert.rejects(
    fetchDocumentBytes(`${FORUM}/a.docx`, {
      maxBytes: 10,
      trustedOrigins: trusted,
      fetchImpl: async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      },
    }),
    { code: "ABORTED" }
  );
});

// ── worker client ──

class FakeWorker {
  static instances = [];
  static behavior = "ok";

  constructor(url) {
    this.url = url;
    this.terminated = false;
    FakeWorker.instances.push(this);
  }

  postMessage(message, transfer) {
    this.posted = { message, transfer };
    const behavior = FakeWorker.behavior;

    if (behavior === "hang") {
      return;
    }

    setImmediate(() => {
      if (this.terminated) {
        return;
      }

      if (behavior === "error-event") {
        this.onerror?.({ preventDefault() {} });
      } else if (behavior === "foreign-id") {
        this.onmessage?.({ data: { id: -1, ok: true, result: { spoofed: true } } });
      } else if (behavior === "unknown-code") {
        this.onmessage?.({ data: { id: message.id, ok: false, error: { code: "<b>owned</b>" } } });
      } else if (behavior === "fail") {
        this.onmessage?.({ data: { id: message.id, ok: false, error: { code: "ENCRYPTED" } } });
      } else {
        this.onmessage?.({ data: { id: message.id, ok: true, result: { echoed: message.format } } });
      }
    });
  }

  terminate() {
    this.terminated = true;
  }
}

function runFake(behavior, overrides = {}) {
  FakeWorker.behavior = behavior;
  return runPreviewWorker({
    workerUrl: "/theme-javascripts/abc.js",
    format: "xlsx",
    bytes: new ArrayBuffer(4),
    limits: { maxRows: 1 },
    timeoutMs: 50,
    WorkerImpl: FakeWorker,
    ...overrides,
  });
}

test("worker requests resolve once and always terminate the worker", async () => {
  FakeWorker.instances = [];
  assert.deepEqual(await runFake("ok"), { echoed: "xlsx" });
  const [instance] = FakeWorker.instances;
  assert.equal(instance.terminated, true);
  assert.equal(instance.posted.message.protocol, 1);
  assert.equal(instance.posted.message.limits.timeoutMs, 50);
  assert.equal(instance.posted.transfer.length, 1, "the file buffer is transferred");

  await assert.rejects(runFake("fail"), { code: "ENCRYPTED" });
  await assert.rejects(runFake("unknown-code"), { code: "PARSE_FAILED" });
  await assert.rejects(runFake("error-event"), { code: "WORKER_UNAVAILABLE" });
  await assert.rejects(runFake("foreign-id"), { code: "TIMEOUT" });
  await assert.rejects(runFake("hang"), { code: "TIMEOUT" });
  assert.ok(FakeWorker.instances.every((worker) => worker.terminated));
});

test("cancelling a worker request terminates it immediately", async () => {
  FakeWorker.instances = [];
  const controller = new AbortController();
  const pending = runFake("hang", { signal: controller.signal, timeoutMs: 10000 });
  controller.abort();
  await assert.rejects(pending, { code: "ABORTED" });
  assert.equal(FakeWorker.instances[0].terminated, true);

  await assert.rejects(runFake("ok", { workerUrl: "" }), { code: "WORKER_UNAVAILABLE" });
  await assert.rejects(runFake("ok", { WorkerImpl: undefined }), { code: "WORKER_UNAVAILABLE" });
});

test("the scheduler bounds simultaneous previews and drops cancelled waiters", async () => {
  const scheduler = createPreviewScheduler(2);
  const first = await scheduler.acquire();
  const second = await scheduler.acquire();
  let thirdStarted = false;
  const third = scheduler.acquire().then((release) => {
    thirdStarted = true;
    return release;
  });
  const controller = new AbortController();
  const cancelled = scheduler.acquire(controller.signal);

  await tick();
  assert.equal(scheduler.active, 2);
  assert.equal(scheduler.waiting, 2);
  assert.equal(thirdStarted, false);

  controller.abort();
  await assert.rejects(cancelled, { code: "ABORTED" });
  first();
  first();
  const releaseThird = await third;
  assert.equal(thirdStarted, true);
  assert.equal(scheduler.active, 2, "a double release does not free a second slot");
  second();
  releaseThird();
  assert.equal(scheduler.active, 0);
});

// ── collector, placement, and cards ──

function cooked(doc, ...children) {
  const element = build(doc, ["div", { class: "cooked" }, ...children]);
  doc.body.appendChild(element);
  return element;
}

const attachment = (href, label) => ["a", { class: "attachment", href }, label];

function makeHost(doc, overrides = {}) {
  const host = createDocumentPreviewHost({
    settings: {
      theme_uploads_local: { office_preview_worker: "/theme-javascripts/worker.js" },
      ...overrides.settings,
    },
    siteSettings: { login_required: false, secure_uploads: false },
    loadThemeModule: async () => {},
    win: { location: { origin: FORUM, href: BASE }, fetch: overrides.fetch, Worker: overrides.Worker },
    doc,
  });
  return host;
}

test("Office attachments get one card after their paragraph, in source order, sharing the post limit", () => {
  const doc = new FakeDocument(BASE);
  const element = cooked(
    doc,
    ["p", {}, attachment("/uploads/short-url/a.docx", "a.docx"), " (12 KB) ", attachment("/uploads/short-url/b.XLSX", "b.XLSX")],
    ["p", {}, attachment("/uploads/short-url/c.pdf", "c.pdf")],
    ["p", {}, attachment("/uploads/short-url/d.epub", "d.epub")],
    ["aside", { class: "quote" }, ["blockquote", {}, ["p", {}, attachment("/uploads/short-url/q.docx", "q.docx")]]],
    ["pre", {}, ["code", {}, attachment("/uploads/short-url/code.docx", "code.docx")]],
    ["p", {}, attachment("/uploads/short-url/e.pptx", "e.pptx")],
    ["p", {}, attachment("/uploads/short-url/f.xls", "f.xls")]
  );
  const host = makeHost(doc);
  const candidates = collectDocumentCandidates(element, { host, limit: 4, usedSlots: 1 });

  assert.deepEqual(
    candidates.map((candidate) => candidate.attachment.filename),
    ["a.docx", "b.XLSX", "e.pptx"],
    "quotes, code, PDF, EPUB are skipped and the shared limit stops at 4"
  );

  placeDocumentCards(candidates, { host, helper: null });
  const children = element.children.map((child) =>
    child.classList.contains(CARD_CLASS) ? `card:${child.dataset.richEmbedsDocument}` : child.localName
  );
  assert.deepEqual(children, ["p", "card:docx", "card:xlsx", "p", "p", "aside", "pre", "p", "card:pptx", "p"]);
  assert.equal(element.querySelectorAll("a.attachment").length, 8, "original attachment links are untouched");
  assert.equal(element.querySelector(".rich-embeds-document__detail").textContent, "Word 文档 · 12 KB");

  assert.deepEqual(
    collectDocumentCandidates(element, { host, limit: 3 }),
    [],
    "a second decoration counts the three cards it already placed against the limit"
  );
  const again = collectDocumentCandidates(element, { host, limit: 20 });
  assert.deepEqual(again.map((candidate) => candidate.attachment.filename), ["f.xls"], "re-decoration adds no duplicates");
});

test("disabling Office previews leaves attachments as plain links", () => {
  const doc = new FakeDocument(BASE);
  const element = cooked(doc, ["p", {}, attachment("/uploads/a.docx", "a.docx")]);
  const host = makeHost(doc, { settings: { enable_office_preview: false } });
  assert.deepEqual(collectDocumentCandidates(element, { host, limit: 4 }), []);
});

function previewHost(doc, { fetchImpl, workerBehavior = "xlsx", timeoutSeconds } = {}) {
  const workers = [];

  class ScriptedWorker {
    constructor() {
      workers.push(this);
      this.terminated = false;
    }

    postMessage(message) {
      this.message = message;

      if (workerBehavior === "hang") {
        return;
      }

      setImmediate(() => {
        if (this.terminated) {
          return;
        }

        if (workerBehavior === "corrupt") {
          this.onmessage({ data: { id: message.id, ok: false, error: { code: "CORRUPT" } } });
          return;
        }

        this.onmessage({
          data: {
            id: message.id,
            ok: true,
            result: {
              format: "xlsx",
              sheetCount: 2,
              activeSheet: 1,
              sheets: [
                { name: "一", state: "visible", kind: "sheet", rows: [["a", "1"]], kinds: ["sn"], merges: [], columnWidths: [0, 0], totalRows: 1, totalColumns: 2, firstRow: 0, firstColumn: 0 },
                { name: "二", state: "visible", kind: "sheet", rows: [["x", "y"], ["2", "3"]], kinds: ["ss", "nn"], merges: [{ row: 0, column: 0, rowSpan: 1, columnSpan: 2 }], columnWidths: [80, 0], totalRows: 1500, totalColumns: 2, firstRow: 0, firstColumn: 0 },
              ],
            },
          },
        });
      });
    }

    terminate() {
      this.terminated = true;
    }
  }

  const host = makeHost(doc, {
    fetch: fetchImpl,
    Worker: ScriptedWorker,
    settings: timeoutSeconds ? { office_preview_timeout_seconds: timeoutSeconds } : {},
  });
  return { host, workers };
}

function okFetch(calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    return response({ url, chunks: [new Uint8Array([0x50, 0x4b, 3, 4])] });
  };
}

async function settle() {
  for (let index = 0; index < 8; index += 1) {
    await tick();
  }
}

function placeOne(doc, host, href = "/uploads/short-url/book.xlsx", helper = null) {
  const element = cooked(doc, ["p", {}, attachment(href, "book.xlsx")]);
  const candidates = collectDocumentCandidates(element, { host, limit: 4 });
  const cleanup = placeDocumentCards(candidates, { host, helper });
  return { element, card: element.querySelector(`.${CARD_CLASS}`), cleanup };
}

test("nothing is downloaded until the reader clicks Preview; then the sheet renders", async () => {
  const doc = new FakeDocument(BASE);
  const calls = [];
  const { host, workers } = previewHost(doc, { fetchImpl: okFetch(calls) });
  const { card } = placeOne(doc, host);

  await settle();
  assert.equal(calls.length, 0);
  assert.equal(workers.length, 0);
  assert.equal(card.dataset.richEmbedsDocumentState, "idle");
  assert.equal(card.querySelector(".rich-embeds-document__panel").hidden, true);

  card.querySelector(".rich-embeds-document__preview").click();
  assert.equal(card.dataset.richEmbedsDocumentState, "loading");
  assert.equal(card.querySelector(".rich-embeds-document__cancel").hidden, false);
  await settle();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${FORUM}/uploads/short-url/book.xlsx`);
  assert.equal(workers[0].terminated, true);
  assert.equal(card.dataset.richEmbedsDocumentState, "ready");
  assert.equal(card.querySelector(".rich-embeds-document__panel").hidden, false);
  const tabs = card.querySelectorAll(".rich-embeds-document__sheet-tab");
  assert.deepEqual(tabs.map((tab) => tab.getAttribute("aria-selected")), ["false", "true"], "the workbook's active sheet opens first");
  assert.equal(card.querySelector(".rich-embeds-document__sheet-notice").textContent, "预览只显示前 2 行（共 1500 行），完整内容请下载原文件。");
  assert.equal(card.querySelector("td").getAttribute("colspan") ?? card.querySelector("td").colSpan, 2);
  assert.match(card.querySelector(".rich-embeds-document__notices").textContent, /不会重新计算公式/u);
  assert.equal(doc.activeElement, card.querySelector(".rich-embeds-document__viewport"));
});

test("closing returns to the card and its Preview button; the original download stays available", async () => {
  const doc = new FakeDocument(BASE);
  const { host } = previewHost(doc, { fetchImpl: okFetch() });
  const { card } = placeOne(doc, host);

  card.querySelector(".rich-embeds-document__preview").click();
  await settle();
  assert.equal(card.querySelector(".rich-embeds-document__preview").hidden, true, "one close control while open");
  assert.equal(card.querySelector(".rich-embeds-document__cancel").hidden, true);
  card.querySelector(".rich-embeds-document__close").click();

  assert.equal(card.querySelector(".rich-embeds-document__preview").hidden, false);
  assert.equal(card.dataset.richEmbedsDocumentState, "idle");
  assert.equal(card.querySelector(".rich-embeds-document__panel").hidden, true);
  assert.equal(card.querySelector(".rich-embeds-document__viewport").childNodes.length, 0);
  assert.equal(doc.activeElement, card.querySelector(".rich-embeds-document__preview"));
  const download = card.querySelector(".rich-embeds-document__download");
  assert.equal(download.getAttribute("href"), `${FORUM}/uploads/short-url/book.xlsx`);
  assert.equal(download.getAttribute("download"), "book.xlsx");
});

test("full-screen mode locks page scrolling only while open and Escape leaves it", async () => {
  const doc = new FakeDocument(BASE);
  const { host } = previewHost(doc, { fetchImpl: okFetch() });
  const { card } = placeOne(doc, host);

  card.querySelector(".rich-embeds-document__preview").click();
  await settle();
  const expand = card.querySelector(".rich-embeds-document__expand");
  expand.click();
  assert.equal(card.classList.contains("rich-embeds-document--expanded"), true);
  assert.equal(doc.documentElement.classList.contains("rich-embeds-document-expanded"), true);
  assert.equal(card.querySelector(".rich-embeds-document__panel").getAttribute("aria-modal"), "true");
  assert.equal(doc.activeElement, card.querySelector(".rich-embeds-document__close"));

  card.querySelector(".rich-embeds-document__panel").dispatchEvent({ type: "keydown", key: "Escape" });
  assert.equal(card.classList.contains("rich-embeds-document--expanded"), false);
  assert.equal(doc.documentElement.classList.contains("rich-embeds-document-expanded"), false);
  assert.equal(doc.activeElement, expand);
});

test("a failed preview explains why and Retry starts again", async () => {
  const doc = new FakeDocument(BASE);
  let behavior = "corrupt";
  const { host } = previewHost(doc, { fetchImpl: okFetch() });
  const ScriptedWorker = host.Worker;
  host.Worker = class extends ScriptedWorker {
    postMessage(message) {
      if (behavior === "corrupt") {
        setImmediate(() => this.onmessage({ data: { id: message.id, ok: false, error: { code: "CORRUPT" } } }));
      } else {
        super.postMessage(message);
      }
    }
  };
  const { card } = placeOne(doc, host);
  const previewButton = card.querySelector(".rich-embeds-document__preview");

  previewButton.click();
  await settle();
  assert.equal(card.dataset.richEmbedsDocumentState, "error");
  assert.equal(card.dataset.richEmbedsDocumentError, "CORRUPT");
  assert.match(card.querySelector(".rich-embeds-document__status").textContent, /损坏/u);
  assert.equal(previewButton.textContent, "重试");
  assert.equal(card.querySelector(".rich-embeds-document__panel").hidden, true, "no blank panel is shown on failure");

  behavior = "ok";
  previewButton.click();
  await settle();
  assert.equal(card.dataset.richEmbedsDocumentState, "ready");
  assert.equal(card.dataset.richEmbedsDocumentError, undefined);
});

test("Cancel stops the download and the worker, and removing the post cleans up", async () => {
  const doc = new FakeDocument(BASE);
  let seenSignal = null;
  const { host, workers } = previewHost(doc, {
    fetchImpl: async (url, init) => {
      seenSignal = init.signal;
      return new Promise((resolve, reject) =>
        init.signal.addEventListener("abort", () => reject(Object.assign(new Error("x"), { name: "AbortError" })))
      );
    },
  });
  const { card } = placeOne(doc, host);

  card.querySelector(".rich-embeds-document__preview").click();
  await settle();
  card.querySelector(".rich-embeds-document__cancel").click();
  await settle();
  assert.equal(seenSignal.aborted, true);
  assert.equal(card.dataset.richEmbedsDocumentState, "idle");
  assert.equal(card.querySelector(".rich-embeds-document__status").textContent, "已取消预览。");
  assert.equal(doc.activeElement, card.querySelector(".rich-embeds-document__preview"), "focus returns to Preview");
  assert.equal(workers.length, 0);

  // A worker that never answers is terminated when the post is removed.
  const second = previewHost(doc, { fetchImpl: okFetch(), workerBehavior: "hang" });
  const placed = placeOne(doc, second.host);
  placed.card.querySelector(".rich-embeds-document__preview").click();
  await settle();
  assert.equal(second.workers.length, 1);
  placed.element.remove();
  disposeDisconnectedCards(second.host);
  await settle();
  assert.equal(second.workers[0].terminated, true);
  assert.equal(second.host.cards.size, 0);

  // The decorator cleanup does the same when Discourse re-renders the post.
  const third = previewHost(doc, { fetchImpl: okFetch(), workerBehavior: "hang" });
  const rerendered = placeOne(doc, third.host);
  rerendered.card.querySelector(".rich-embeds-document__preview").click();
  await settle();
  rerendered.cleanup();
  await settle();
  assert.equal(third.workers[0].terminated, true);
});

test("the whole preview is bounded by the configured time limit", async () => {
  const doc = new FakeDocument(BASE);
  const { host, workers } = previewHost(doc, { fetchImpl: okFetch(), workerBehavior: "hang" });
  host.limits.timeoutMs = 20;
  const { card } = placeOne(doc, host);

  card.querySelector(".rich-embeds-document__preview").click();
  await new Promise((resolve) => setTimeout(resolve, 60));
  await settle();
  assert.equal(card.dataset.richEmbedsDocumentError, "TIMEOUT");
  assert.equal(workers[0].terminated, true);
});

test("oversized attachments fail before parsing with the configured limit in the message", async () => {
  const doc = new FakeDocument(BASE);
  const { host, workers } = previewHost(doc, {
    fetchImpl: async (url) => response({ url, length: 30 * 1024 * 1024 }),
  });
  const { card } = placeOne(doc, host);

  card.querySelector(".rich-embeds-document__preview").click();
  await settle();
  assert.equal(card.dataset.richEmbedsDocumentError, "TOO_LARGE");
  assert.match(card.querySelector(".rich-embeds-document__status").textContent, /20 MiB/u);
  assert.equal(workers.length, 0);
});

test("legacy and macro-enabled files are labelled unsupported with download only", () => {
  const doc = new FakeDocument(BASE);
  const { host } = previewHost(doc, { fetchImpl: okFetch() });

  for (const name of ["old.doc", "old.ppt", "m.xlsm"]) {
    const { card } = placeOne(doc, host, `/uploads/${name}`);
    assert.equal(card.dataset.richEmbedsDocumentState, "unsupported");
    assert.equal(card.querySelector(".rich-embeds-document__preview"), null);
    assert.ok(card.querySelector(".rich-embeds-document__download"));
    assert.ok(card.querySelector(".rich-embeds-document__status").textContent.length > 10);
  }
});

const publicHelper = { model: { topic: { archetype: "regular", category: { read_restricted: false } } } };

test("the external viewer is offered only when policy allows and loads only after confirmation", () => {
  const doc = new FakeDocument(BASE);
  const { host } = previewHost(doc, { fetchImpl: okFetch() });
  host.externalProvider = "microsoft";
  host.publicPrefixes = parsePublicPrefixes(`${FORUM}/uploads/short-url/`);

  const denied = placeOne(doc, host, "/uploads/short-url/a.pptx", {
    model: { topic: { archetype: "private_message" } },
  });
  assert.equal(denied.card.querySelector(".rich-embeds-document__external"), null);

  const allowed = placeOne(doc, host, "/uploads/short-url/a.pptx", publicHelper);
  const external = allowed.card.querySelector(".rich-embeds-document__external");
  assert.ok(external);
  assert.equal(allowed.card.querySelector("iframe"), null);

  external.click();
  const disclosure = allowed.card.querySelector(".rich-embeds-document__disclosure");
  assert.equal(disclosure.hidden, false);
  assert.match(disclosure.textContent, /Microsoft 的服务器将从 forum\.example 下载此文件/u);
  assert.equal(allowed.card.querySelector("iframe"), null, "the disclosure alone sends nothing");

  allowed.card.querySelector(".rich-embeds-document__external-continue").click();
  const frame = allowed.card.querySelector("iframe");
  assert.ok(frame);
  assert.equal(
    frame.getAttribute("src") || frame.src,
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(`${FORUM}/uploads/short-url/a.pptx`)}`
  );
  assert.equal(frame.referrerPolicy, "no-referrer");
  assert.equal(
    frame.getAttribute("sandbox"),
    "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
  );
  assert.equal(allowed.card.dataset.richEmbedsDocumentState, "loading");
  frame.dispatchEvent({ type: "load" });
  assert.equal(allowed.card.dataset.richEmbedsDocumentState, "external");
  assert.match(allowed.card.querySelector(".rich-embeds-document__status").textContent, /若查看器内显示错误/u);
  allowed.cleanup();
});

test("the composer preview (no post model) never offers the external viewer", () => {
  const doc = new FakeDocument(BASE);
  const { host } = previewHost(doc, { fetchImpl: okFetch() });
  host.externalProvider = "microsoft";
  host.publicPrefixes = parsePublicPrefixes(`${FORUM}/uploads/short-url/`);
  const { card } = placeOne(doc, host, "/uploads/short-url/a.pptx", undefined);
  assert.equal(card.querySelector(".rich-embeds-document__external"), null);
});

test("spreadsheet tabs support arrow-key navigation and keep the selected sheet", () => {
  const doc = new FakeDocument(BASE);
  const viewport = doc.createElement("div");
  const state = {};
  const result = {
    sheets: [
      { name: "A", state: "visible", kind: "sheet", rows: [["1"]], kinds: ["n"], totalRows: 1, totalColumns: 1 },
      { name: "B", state: "hidden", kind: "sheet", rows: [["2"]], kinds: ["n"], totalRows: 1, totalColumns: 1 },
      { name: "C", state: "veryHidden", kind: "sheet", rows: [["3"]], kinds: ["n"], totalRows: 1, totalColumns: 1 },
      { name: "Chart", state: "visible", kind: "chart", rows: [], kinds: [] },
    ],
    activeSheet: 0,
  };
  renderSpreadsheet(result, viewport, { doc, state, idPrefix: "x" });
  const tabs = viewport.querySelectorAll("button");
  assert.deepEqual(tabs.map((tab) => tab.textContent), ["A", "B（隐藏）", "Chart"]);

  viewport.querySelector(".rich-embeds-document__sheet-tabs").dispatchEvent({ type: "keydown", key: "ArrowRight" });
  assert.equal(state.activeSheet, 1);
  assert.equal(doc.activeElement, tabs[1]);
  viewport.querySelector(".rich-embeds-document__sheet-tabs").dispatchEvent({ type: "keydown", key: "End" });
  assert.equal(state.activeSheet, 2);
  assert.match(viewport.querySelector(".rich-embeds-document__sheet-notice").textContent, /图表工作表/u);

  const again = doc.createElement("div");
  renderSpreadsheet(result, again, { doc, state, idPrefix: "x" });
  assert.equal(again.querySelectorAll("button")[2].getAttribute("aria-selected"), "true");
  assert.deepEqual([0, 25, 26, 701, 702].map(columnName), ["A", "Z", "AA", "ZZ", "AAA"]);
});

test("cell text is inserted as text, never as markup", () => {
  const doc = new FakeDocument(BASE);
  const viewport = doc.createElement("div");
  renderSpreadsheet(
    {
      sheets: [{ name: "<img src=x onerror=alert(1)>", state: "visible", kind: "sheet", rows: [["<script>alert(1)</script>"]], kinds: ["s"], totalRows: 1, totalColumns: 1 }],
      activeSheet: 0,
    },
    viewport,
    { doc, state: {}, idPrefix: "x" }
  );
  assert.equal(viewport.querySelector("td").textContent, "<script>alert(1)</script>");
  assert.equal(viewport.querySelector("td").children.length, 0);
  assert.equal(viewport.querySelector("button").children.length, 0);
});

test("only http, https, and mailto links survive", () => {
  assert.equal(isSafeExternalHref("https://example.org/x"), true);
  assert.equal(isSafeExternalHref("mailto:a@example.org"), true);
  for (const value of ["javascript:alert(1)", " javascript:alert(1)", "data:text/html,x", "vbscript:x", "/relative", "https://u:p@example.org/"]) {
    assert.equal(isSafeExternalHref(value), false, value);
  }
});

test("errors from the layer carry a code", () => {
  assert.equal(new DocumentPreviewError("TIMEOUT").code, "TIMEOUT");
  assert.equal(typeof createDocumentCard, "function");
});
