// A public theme component must not depend on its maintainer's services.
// These tests run the real initializer with the defaults a fresh installation
// receives from settings.yml and record every network request it attempts.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { FakeDocument } from "./helpers/fake-dom.mjs";
import { documentPreviewBindings } from "./helpers/initializer.mjs";

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
    requests.push({ kind: "fetch", url, method: init.method || "GET", body: init.body, redirect: init.redirect });
    const next = responses.shift();

    if (!next) {
      throw new TypeError("network disabled in tests");
    }

    return typeof next === "function" ? next(url, init) : next;
  };

  const context = {
    ...documentPreviewBindings,
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
        buildWrapper, activatePlayer, autoExpandWrapper, expandThroughReader, expandWeChatArchive,
        themeSettings, fetchBilibiliShortLinkResolution, fetchReaderView, fetchWeChatArchive,
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
  assert.equal(requests.length, 16, "the attempt cap applies even when timers advance without wall clock time");
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


const CONFIGURED = {
  enable_expand_reader: true, enable_zhihu_summary: true,
  enable_rdfz_blog_inline: true, enable_short_link_resolution: true,
  enable_wechat_inline: true, expand_reader_endpoint: OTHER_READER,
  wechat_ingest_endpoint: OTHER_INGEST, wechat_archive_origin: OTHER_ARCHIVE,
};
const reply = (status, body = { ok: false }) => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: () => null }, json: async () => body,
});

test("missing, blank, mistyped and invalid endpoints cannot issue automatic, manual or fallback requests", async () => {
  for (const value of [undefined, null, false, 42, {}, "", "   ", "not a url", "//reader.example.org/read",
    "https:reader.example.org/read", "https:///reader.example.org/read",
    "https://reader.example.org/rea\td", "http://reader.example.org/read", "https://user:secret@reader.example.org/read"]) {
    for (const auto_expand_embeds of [true, false]) {
      const h = harness({ ...CONFIGURED, auto_expand_embeds,
        expand_reader_endpoint: value, wechat_ingest_endpoint: value });
      const cards = buildCards(h.api);
      await h.settle();
      for (const card of cards) {
        await h.api.autoExpandWrapper(card);
        await h.api.activatePlayer(card);
        await h.api.expandThroughReader(card);
        await h.api.expandWeChatArchive(card);
      }
      assert.equal(await h.api.fetchReaderView(READING_LINKS[3]), null);
      assert.equal(await h.api.fetchWeChatArchive(h.api.parseBilibiliUrl(READING_LINKS[0])), null);
      for (const short of ["https://b23.tv/AbCdE12", "https://bili2233.cn/AbCdE12", "https://163cn.tv/AbCdE12"]) {
        assert.equal(await h.api.fetchBilibiliShortLinkResolution(short), null);
      }
      assert.deepEqual(h.requests, [], String(value));
      assert.equal(cards.length, 4);
      assert.ok(cards.every((card) => card.querySelector(".bilibili-inline-player__footer-link")));
    }
  }
});

test("all configured backend calls refuse HTTP redirects and retain credential isolation", async () => {
  const h = harness(CONFIGURED);
  for (let index = 0; index < 3; index += 1) {
    h.responses.push((_url, init) => {
      assert.equal(init.redirect, "error");
      assert.equal(init.credentials, "omit");
      assert.equal(init.referrerPolicy, "no-referrer");
      return reply(403);
    });
  }
  await h.api.fetchReaderView(READING_LINKS[3]);
  await h.api.fetchWeChatArchive(h.api.parseBilibiliUrl(READING_LINKS[0]));
  await h.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12");
  assert.equal(h.requests.length, 3);
  assert.ok(h.requests.every((request) => request.redirect === "error"));
});

test("backend concurrency is shared, duplicates coalesce, and a completed slot can be reused", async () => {
  const h = harness(CONFIGURED);
  const release = [];
  for (let index = 0; index < 4; index += 1) {
    h.responses.push(() => new Promise((resolve) => release.push(() => resolve(reply(403)))));
  }
  const parsed = h.api.parseBilibiliUrl(READING_LINKS[0]);
  const pending = [h.api.fetchReaderView(READING_LINKS[3]), h.api.fetchWeChatArchive(parsed),
    h.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12"),
    h.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE13")];
  pending.push(h.api.fetchReaderView(READING_LINKS[3]), h.api.fetchWeChatArchive(parsed),
    h.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12"));
  assert.equal(h.requests.length, 4, "duplicates share in-flight work");
  assert.equal(await h.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE14"), null);
  assert.equal(h.requests.length, 4, "saturation fails open without a queue");
  release.forEach((finish) => finish());
  await Promise.all(pending);
  h.responses.push(reply(403));
  await h.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE14");
  assert.equal(h.requests.length, 5, "failed requests release capacity");
});

test("WeChat polling stops when its switch or configured endpoint/origin changes", async () => {
  for (const change of [
    { enable_wechat_inline: false }, { wechat_ingest_endpoint: "" },
    { wechat_ingest_endpoint: "https://changed.example/api/ingest" },
    { wechat_archive_origin: "https://changed.example" },
  ]) {
    const h = harness(CONFIGURED);
    h.responses.push(reply(202, { pending: true, retryAfter: 0 }));
    const pending = h.api.fetchWeChatArchive(h.api.parseBilibiliUrl(READING_LINKS[0]));
    await new Promise((resolve) => setImmediate(resolve));
    Object.assign(h.api.themeSettings, change);
    await h.settle();
    assert.equal(await pending, null);
    assert.equal(h.requests.length, 1);
  }
});

test("cached archives cannot cross an archive-origin setting change", async () => {
  const h = harness(CONFIGURED);
  const parsed = h.api.parseBilibiliUrl(READING_LINKS[0]);
  const payload = { ok: true, url: `${OTHER_ARCHIVE}/fixture-article`, slug: "fixture-article", orig: parsed.canonicalUrl };
  h.responses.push(reply(200, payload));
  assert.ok(await h.api.fetchWeChatArchive(parsed));
  h.api.themeSettings.wechat_archive_origin = "https://changed.example";
  h.responses.push(reply(200, payload));
  assert.equal(await h.api.fetchWeChatArchive(parsed), null);
  assert.equal(h.requests.length, 2);
});

test("reader fetch entry point respects the main and per-provider switches", async () => {
  const h = harness({ ...CONFIGURED, enable_expand_reader: false });
  assert.equal(await h.api.fetchReaderView(READING_LINKS[3]), null);
  h.api.themeSettings.enable_expand_reader = true;
  h.api.themeSettings.enable_zhihu_summary = false;
  h.api.themeSettings.enable_rdfz_blog_inline = false;
  assert.equal(await h.api.fetchReaderView(READING_LINKS[1]), null);
  assert.equal(await h.api.fetchReaderView(READING_LINKS[2]), null);
  assert.equal(await h.api.fetchReaderView("https://unrelated.example/page"), null);
  assert.deepEqual(h.requests, []);
});

test("explicit third-party services preserve archive rendering, reader responses and canonical resolution", async () => {
  const h = harness(CONFIGURED);
  const parsed = h.api.parseBilibiliUrl(READING_LINKS[0]);
  h.responses.push(reply(200, { ok: true, url: `${OTHER_ARCHIVE}/fixture-article`,
    slug: "fixture-article", orig: parsed.canonicalUrl, title: "Archived fixture" }));
  const [card] = buildCards(h.api, [READING_LINKS[0]]);
  h.document.body.appendChild(card);
  await h.settle();
  const frame = card.querySelector("iframe");
  assert.ok(frame, "a matching archive renders");
  assert.equal(frame.src, `${OTHER_ARCHIVE}/fixture-article`);
  assert.equal(frame.sandbox, "allow-popups allow-popups-to-escape-sandbox");
  assert.equal(frame.referrerPolicy, "no-referrer");
  assert.ok(card.querySelectorAll(".bilibili-inline-player__footer-link")
    .some((link) => link.href === parsed.canonicalUrl), "source link is retained");

  h.responses.push(reply(200, { ok: true, html: "<p>Readable fixture</p>" }));
  assert.equal((await h.api.fetchReaderView(READING_LINKS[3])).html, "<p>Readable fixture</p>");
  h.responses.push(reply(200, { version: 1, canonicalUrl: "https://www.bilibili.com/video/BV1xx411c7mD" }));
  assert.equal((await h.api.fetchBilibiliShortLinkResolution("https://b23.tv/AbCdE12")).provider, "bilibili");
  assert.deepEqual(ownerRequests(h.requests), []);
});
