// A public theme component must not depend on its maintainer's services.
// These tests run the real initializer with the defaults a fresh installation
// receives from settings.yml and record every network request it attempts.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { FakeDocument } from "./helpers/fake-dom.mjs";

const initializerUrl = new URL(
  "../javascripts/discourse/api-initializers/init-bilibili-inline-player.js",
  import.meta.url
);
const source = await readFile(initializerUrl, "utf8");
const settingsYaml = await readFile(new URL("../settings.yml", import.meta.url), "utf8");

// Operator-run services and sites. A clean installation must never contact
// any of them on its own; a post that merely links to them is a different
// matter and is covered by the per-provider tests.
const OWNER_HOST_RE = /(?:^|\.)(?:bdfz\.net|rdfz\.net|rdfzer\.com)$/u;

/** Reads the `default:` of every top-level key in settings.yml. */
function readDefaults(yaml) {
  const defaults = {};
  let current = null;

  for (const line of yaml.split("\n")) {
    const key = line.match(/^([a-z0-9_]+):\s*$/u);

    if (key) {
      current = key[1];
      continue;
    }

    const value = line.match(/^ {2}default:\s*(.*)$/u);

    if (current && value) {
      const raw = value[1].trim();
      defaults[current] =
        raw === "true" ? true : raw === "false" ? false : /^-?\d+$/u.test(raw) ? Number(raw) : raw.replace(/^"(.*)"$/u, "$1");
    }
  }

  return defaults;
}

export const DEFAULTS = readDefaults(settingsYaml);

function harness(overrides = {}) {
  const requests = [];
  const timers = [];
  const document = new FakeDocument("https://forum.example/t/topic/1");
  const originalCreate = document.createElement.bind(document);
  document.createElement = (tag) => {
    const element = originalCreate(tag);

    if (tag === "script") {
      // JSONP and module loaders inject scripts; record their targets.
      const record = (value) => requests.push({ kind: "script", url: String(value) });
      Object.defineProperty(element, "src", {
        get: () => element.getAttribute("src") || "",
        set: (value) => {
          record(value);
          element.setAttribute("src", value);
        },
      });
    }

    return element;
  };

  const responses = [];
  const fetch = async (input, init = {}) => {
    const url = String(input?.url || input);
    requests.push({ kind: "fetch", url, method: init.method || "GET", body: init.body });
    const next = responses.shift();

    if (!next) {
      throw new TypeError("network disabled in tests");
    }

    return typeof next === "function" ? next(url, init) : next;
  };

  const context = {
    AbortController,
    console,
    document,
    fetch,
    navigator: { userAgent: "Mozilla/5.0 test", maxTouchPoints: 0 },
    settings: { ...DEFAULTS, ...overrides },
    TextEncoder,
    URL,
    URLSearchParams,
    window: {
      clearTimeout: (id) => timers.forEach((timer) => timer.id === id && (timer.cleared = true)),
      location: { href: "https://forum.example/t/topic/1", origin: "https://forum.example" },
      matchMedia: () => ({ matches: false }),
      open() {},
      setTimeout(callback, delay) {
        const timer = { id: timers.length + 1, callback, delay, cleared: false };
        timers.push(timer);
        return timer.id;
      },
    },
    apiInitializer: (callback) => callback,
  };
  context.globalThis = context;

  const executable = source
    .replace(/^import \{[^}]*\} from "[^"]+";\n/gmu, "")
    .replace("export default apiInitializer((api) => {", "const themeInitializer = apiInitializer((api) => {")
    .concat(`
      globalThis.__api = {
        buildWrapper, fetchBilibiliShortLinkResolution, fetchReaderView, fetchWeChatArchive,
        getBilibiliShortResolverEndpoint, getExpandReaderEndpoint, getWeChatIngestEndpoint,
        normalizeWeChatArchivePayload, parseBilibiliUrl, supportsExpandReader,
        supportsWeChatArchive, themeInitializer, wrapperState,
      };
    `);
  vm.runInNewContext(executable, context, { filename: initializerUrl.pathname });

  async function settle() {
    for (let round = 0; round < 20; round += 1) {
      await new Promise((resolve) => setImmediate(resolve));
      const due = timers.filter((timer) => !timer.cleared && !timer.fired);

      for (const timer of due) {
        timer.fired = true;
        timer.callback();
      }
    }
  }

  return { api: context.__api, requests, responses, settle, document, timers };
}

const READING_LINKS = [
  "https://mp.weixin.qq.com/s/AbCdEfGhIjKlMnOp",
  "https://www.zhihu.com/question/123456789",
  "https://studenta.rdfz.net/p/hello-world",
  "https://www.marxists.org/chinese/marx/1848/manifesto.htm",
];

function buildCards(api, links = READING_LINKS) {
  return links.map((href) => {
    const parsed = api.parseBilibiliUrl(href);
    assert.ok(parsed, href);
    return api.buildWrapper({
      parsed,
      title: "Fixture",
      canonicalUrl: parsed.canonicalUrl,
      metaLine: "fixture",
      environmentRisk: { level: "none" },
    });
  });
}

const ownerRequests = (requests) =>
  requests.filter((request) => {
    try {
      return OWNER_HOST_RE.test(new URL(request.url, "https://forum.example/").hostname);
    } catch {
      return false;
    }
  });

test("settings.yml defaults name no operator-run service and enable no backend feature", () => {
  for (const [name, value] of Object.entries(DEFAULTS)) {
    if (typeof value === "string") {
      assert.doesNotMatch(value, /bdfz\.net|rdfz\.net|rdfzer\.com/u, name);
    }
  }

  assert.equal(DEFAULTS.expand_reader_endpoint, "");
  assert.equal(DEFAULTS.wechat_ingest_endpoint, "");
  assert.equal(DEFAULTS.wechat_archive_origin, "");
  for (const flag of [
    "enable_expand_reader",
    "enable_wechat_inline",
    "enable_zhihu_summary",
    "enable_rdfz_blog_inline",
    "enable_short_link_resolution",
  ]) {
    assert.equal(DEFAULTS[flag], false, flag);
  }
});

test("the initializer carries no fallback service URL", () => {
  assert.doesNotMatch(source, /https:\/\/(?:reader|wx)\.bdfz\.net/u);
  assert.doesNotMatch(source, /DEFAULT_(?:READER|WECHAT_INGEST)_ENDPOINT/u);
});

test("a clean installation makes zero automatic backend requests for reading links", async () => {
  const { api, requests, settle } = harness();
  const cards = buildCards(api);

  await settle();
  assert.deepEqual(requests, []);
  assert.equal(api.getExpandReaderEndpoint(), "");
  assert.equal(api.getWeChatIngestEndpoint(), "");
  assert.equal(api.getBilibiliShortResolverEndpoint(), "");

  for (const card of cards) {
    const link = card.querySelector(".bilibili-inline-player__footer-link");
    assert.ok(link?.getAttribute("href"), "the original link stays");
  }

  assert.equal(await api.fetchReaderView("https://www.marxists.org/chinese/marx/1848/manifesto.htm"), null);
  assert.equal(await api.fetchWeChatArchive(api.parseBilibiliUrl(READING_LINKS[0])), null);
  assert.equal(await api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12"), null);
  assert.deepEqual(requests, []);
});

test("enabling a feature with an empty endpoint still sends nothing (no hidden fallback)", async () => {
  const { api, requests, settle } = harness({
    enable_expand_reader: true,
    enable_wechat_inline: true,
    enable_zhihu_summary: true,
    enable_rdfz_blog_inline: true,
    enable_short_link_resolution: true,
    expand_reader_endpoint: "",
    wechat_ingest_endpoint: "",
    wechat_archive_origin: "",
  });
  buildCards(api);
  await settle();
  assert.equal(await api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12"), null);
  assert.deepEqual(requests, []);

  const whitespace = harness({ enable_expand_reader: true, expand_reader_endpoint: "   " });
  assert.equal(whitespace.api.getExpandReaderEndpoint(), "");
});

const OTHER_READER = "https://reader.example.org/read";
const OTHER_INGEST = "https://archive.example.org/api/ingest";
const OTHER_ARCHIVE = "https://archive.example.org";

test("each feature flag independently stops its requests even with endpoints configured", async () => {
  const configured = {
    expand_reader_endpoint: OTHER_READER,
    wechat_ingest_endpoint: OTHER_INGEST,
    wechat_archive_origin: OTHER_ARCHIVE,
  };
  const cases = [
    ["enable_expand_reader", { enable_zhihu_summary: true, enable_rdfz_blog_inline: true, enable_wechat_inline: false, enable_short_link_resolution: false }],
    ["enable_wechat_inline", { enable_expand_reader: false, enable_short_link_resolution: false }],
    ["enable_zhihu_summary", { enable_expand_reader: true, enable_rdfz_blog_inline: false, enable_wechat_inline: false, enable_short_link_resolution: false }],
    ["enable_rdfz_blog_inline", { enable_expand_reader: true, enable_zhihu_summary: false, enable_wechat_inline: false, enable_short_link_resolution: false }],
  ];

  for (const [flag, others] of cases) {
    const { api, requests, settle } = harness({ ...configured, ...others, [flag]: false });
    const links = {
      enable_expand_reader: READING_LINKS.slice(1),
      enable_wechat_inline: [READING_LINKS[0]],
      enable_zhihu_summary: [READING_LINKS[1]],
      enable_rdfz_blog_inline: [READING_LINKS[2]],
    }[flag];
    buildCards(api, links);
    await settle();
    assert.deepEqual(requests, [], flag);
  }

  const resolver = harness({ ...configured, enable_expand_reader: true, enable_short_link_resolution: false });
  assert.equal(await resolver.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12"), null);
  assert.deepEqual(resolver.requests, []);
});

test("another administrator's configured origins are used and nothing else", async () => {
  const { api, requests, responses, settle } = harness({
    enable_expand_reader: true,
    enable_zhihu_summary: false,
    enable_rdfz_blog_inline: false,
    enable_wechat_inline: true,
    enable_short_link_resolution: true,
    expand_reader_endpoint: OTHER_READER,
    wechat_ingest_endpoint: OTHER_INGEST,
    wechat_archive_origin: OTHER_ARCHIVE,
  });
  const json = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });

  responses.push(json({ ok: false }, 503));
  responses.push(json({ ok: false }, 503));
  buildCards(api, [READING_LINKS[3], READING_LINKS[0]]);
  await settle();
  responses.push(json({ ok: false }, 400));
  await api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12");

  assert.ok(requests.length >= 3);
  assert.deepEqual(ownerRequests(requests), []);
  for (const request of requests) {
    assert.ok(
      request.url.startsWith("https://reader.example.org/") || request.url === OTHER_INGEST,
      request.url
    );
  }
  assert.ok(requests.some((request) => request.url.startsWith("https://reader.example.org/resolve?")));
});

test("returned archive URLs must match the configured archive origin exactly", () => {
  const { api } = harness({
    enable_wechat_inline: true,
    wechat_ingest_endpoint: OTHER_INGEST,
    wechat_archive_origin: OTHER_ARCHIVE,
  });
  const parsed = api.parseBilibiliUrl(READING_LINKS[0]);
  const payload = (url, slug = "abcdef-123") => ({ ok: true, url, slug, orig: READING_LINKS[0], title: "T" });

  assert.equal(
    api.normalizeWeChatArchivePayload(payload(`${OTHER_ARCHIVE}/abcdef-123`), parsed)?.archiveUrl,
    `${OTHER_ARCHIVE}/abcdef-123`
  );

  for (const url of [
    "https://wx.bdfz.net/abcdef-123",
    "https://evil.example/abcdef-123",
    "http://archive.example.org/abcdef-123",
    "https://archive.example.org:8443/abcdef-123",
    "https://archive.example.org.evil.example/abcdef-123",
    "https://user:pass@archive.example.org/abcdef-123",
    "https://archive.example.org/abcdef-123?next=https://evil.example",
    "https://archive.example.org/abcdef-123#x",
    "https://archive.example.org/nested/abcdef-123",
    "https://archive.example.org/../abcdef-123",
    "javascript:alert(1)",
    "",
  ]) {
    assert.equal(api.normalizeWeChatArchivePayload(payload(url), parsed), null, url);
  }

  assert.equal(
    api.normalizeWeChatArchivePayload(payload(`${OTHER_ARCHIVE}/abcdef-123`, "other-slug"), parsed),
    null,
    "slug must match the URL"
  );
  assert.equal(
    api.normalizeWeChatArchivePayload({ ...payload(`${OTHER_ARCHIVE}/abcdef-123`), orig: "https://mp.weixin.qq.com/s/OtherArticle1" }, parsed),
    null,
    "the archive must belong to the requested article"
  );
});

test("malformed or non-HTTPS service settings disable the feature instead of guessing", () => {
  for (const value of [
    "http://reader.example.org/read",
    "ftp://reader.example.org/read",
    "https://user:pass@reader.example.org/read",
    "not a url",
    "//reader.example.org/read",
  ]) {
    assert.equal(harness({ enable_expand_reader: true, expand_reader_endpoint: value }).api.getExpandReaderEndpoint(), "", value);
    assert.equal(
      harness({ enable_wechat_inline: true, wechat_ingest_endpoint: value, wechat_archive_origin: OTHER_ARCHIVE }).api.getWeChatIngestEndpoint(),
      "",
      value
    );
  }

  for (const origin of ["", "http://archive.example.org", "https://archive.example.org/path", "https://archive.example.org/?q=1", "nonsense"]) {
    const { api } = harness({ enable_wechat_inline: true, wechat_ingest_endpoint: OTHER_INGEST, wechat_archive_origin: origin });
    assert.equal(api.supportsWeChatArchive(api.parseBilibiliUrl(READING_LINKS[0])), false, origin);
  }
});

test("WeChat polling is bounded and stops at terminal backend answers", async () => {
  const settings = {
    enable_wechat_inline: true,
    wechat_ingest_endpoint: OTHER_INGEST,
    wechat_archive_origin: OTHER_ARCHIVE,
  };
  const reply = (status, body = { ok: false }) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  });

  for (const status of [400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503]) {
    const { api, requests, responses } = harness(settings);
    responses.push(reply(status));
    assert.equal(await api.fetchWeChatArchive(api.parseBilibiliUrl(READING_LINKS[0])), null);
    assert.equal(requests.length, 1, `status ${status} is terminal`);
  }

  const { api, requests, responses, timers } = harness(settings);
  for (let index = 0; index < 200; index += 1) {
    responses.push(reply(202, { ok: false, pending: true, retryAfter: 0 }));
  }
  const pending = api.fetchWeChatArchive(api.parseBilibiliUrl(READING_LINKS[0]));
  for (let round = 0; round < 400; round += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    for (const timer of timers.filter((entry) => !entry.cleared && !entry.fired && entry.delay > 0 && entry.delay < 60000)) {
      timer.fired = true;
      timer.callback();
    }
  }
  assert.equal(await pending, null);
  assert.ok(requests.length <= 20, `polling stopped after ${requests.length} requests`);
  const waits = timers.filter((timer) => timer.delay >= 1000 && timer.delay < 60000).map((timer) => timer.delay);
  assert.ok(waits.at(-1) > waits[0], "waits back off");
});

test("only staff see a configuration hint on an unconfigured reading card", async () => {
  const reader = harness();
  reader.api.themeInitializer({ getCurrentUser: () => ({ staff: false }), decorateCookedElement() {}, onPageChange() {} });
  const [readerCard] = buildCards(reader.api, [READING_LINKS[0]]);
  assert.equal(readerCard.querySelector(".bilibili-inline-player__reading-admin-hint"), null);

  const staff = harness();
  staff.api.themeInitializer({ getCurrentUser: () => ({ staff: true }), decorateCookedElement() {}, onPageChange() {} });
  const cards = buildCards(staff.api);
  const hints = cards.map((card) => card.querySelector(".bilibili-inline-player__reading-admin-hint")?.textContent || "");
  assert.match(hints[0], /wechat_ingest_endpoint/u);
  assert.match(hints[1], /enable_zhihu_summary/u);
  assert.match(hints[2], /enable_rdfz_blog_inline/u);
  assert.match(hints[3], /expand_reader_endpoint/u);
  for (const hint of hints) {
    assert.doesNotMatch(hint, /bdfz\.net|rdfzer/u, "hints name settings, never a maintainer service");
  }
  await staff.settle();
  assert.deepEqual(staff.requests, []);
});
