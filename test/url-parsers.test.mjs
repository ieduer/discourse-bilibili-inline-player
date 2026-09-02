import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const initializerUrl = new URL(
  "../javascripts/discourse/api-initializers/init-bilibili-inline-player.js",
  import.meta.url
);
const initializerSource = await readFile(initializerUrl, "utf8");
const executableSource = initializerSource
  .replace(/^import \{ apiInitializer \} from "discourse\/lib\/api";\n/u, "")
  .replace("export default apiInitializer((api) => {", "const themeInitializer = apiInitializer((api) => {")
  .concat(`
globalThis.__themeParserTestApi = {
  buildIframeUrl,
  buildNoAutoplayIframeUrl,
  buildXiaohongshuPreviewText,
  cleanProviderTitle,
  cloneParagraphVisualSegment,
  collectEbookAttachmentCandidates,
  collectEmbedTextCandidates,
  collectIframeCandidates,
  collectOneboxCandidates,
  collectVisibleUrlCandidates,
  collectStandaloneCandidates,
  extractUrlsFromText,
  fetchBilibiliShortLinkResolution,
  fetchReaderView,
  fetchWeChatArchive,
  getWeChatRetryDelayMs,
  getCachedReaderRequest,
  getCachedShortLinkResolution,
  getCachedWeChatArchive,
  getFallbackTitle,
  getBilibiliShortResolverEndpoint,
  getFooterMeta,
  getBdfzPostAutoScale,
  getDouyinPlayerScale,
  getInitialButtonLabel,
  getReaderCacheKey,
  getShortLinkResolutionCacheKey,
  getWeChatArchiveCacheKey,
  getWeChatIngestEndpoint,
  getScopedReaderFragment,
  supportsExpandReader,
  supportsWeChatArchive,
  getLoadedFrameHeight,
  getMarxistsDescription,
  getMetaLine,
  getOpenLabel,
  getPreviewAspectRatio,
  isKnownInlineKind,
  isMatchingReaderView,
  isMarxistsInlineMedia,
  shouldAutoExpandXiaohongshu,
  shouldAutoExpandEmbed,
  shouldShowDirectSourceLink,
  themeSettings,
  extractXiaohongshuShareContext,
  parseBilibiliUrl,
  parseResolvableBilibiliShortUrl,
  parseEbookAttachmentUrl,
  primeEmbedState,
  placeCandidateReplacement,
  replaceCandidateGroup,
  hardenReaderAnchor,
  hardenReaderImage,
  readerViewCache,
  shortLinkResolutionCache,
  wechatArchiveCache,
  READER_CACHE_MAX_ENTRIES,
  READER_CACHE_TTL_MS,
  SHORT_LINK_RESOLUTION_CACHE_MAX_ENTRIES,
  SHORT_LINK_RESOLUTION_CACHE_TTL_MS,
  WECHAT_ARCHIVE_CACHE_MAX_ENTRIES,
  WECHAT_ARCHIVE_CACHE_TTL_MS,
  WECHAT_ARCHIVE_REQUEST_TIMEOUT_MS,
  normalizeWeChatArchivePayload,
  sanitizeReaderImageUrl,
  sanitizeEbookCss,
  resolveReaderViewTitle,
  storeReaderRequest,
  storeShortLinkResolution,
  storeWeChatArchive,
  updateBdfzPostExpandedState,
  wrapperState,
};
`);
const context = {
  AbortController,
  apiInitializer: (callback) => callback,
  console,
  fetch: globalThis.fetch,
  settings: {},
  URL,
  URLSearchParams,
  window: { clearTimeout, setTimeout },
};

vm.runInNewContext(executableSource, context, {
  filename: initializerUrl.pathname,
});

const {
  buildIframeUrl,
  buildNoAutoplayIframeUrl,
  buildXiaohongshuPreviewText,
  cleanProviderTitle,
  cloneParagraphVisualSegment,
  collectEbookAttachmentCandidates,
  collectEmbedTextCandidates,
  collectIframeCandidates,
  collectOneboxCandidates,
  collectVisibleUrlCandidates,
  collectStandaloneCandidates,
  extractUrlsFromText,
  fetchBilibiliShortLinkResolution,
  fetchReaderView,
  fetchWeChatArchive,
  getWeChatRetryDelayMs,
  getCachedReaderRequest,
  getCachedShortLinkResolution,
  getCachedWeChatArchive,
  getFallbackTitle,
  getBilibiliShortResolverEndpoint,
  getFooterMeta,
  getBdfzPostAutoScale,
  getDouyinPlayerScale,
  getInitialButtonLabel,
  getReaderCacheKey,
  getShortLinkResolutionCacheKey,
  getWeChatArchiveCacheKey,
  getWeChatIngestEndpoint,
  getScopedReaderFragment,
  supportsExpandReader,
  supportsWeChatArchive,
  getLoadedFrameHeight,
  getMarxistsDescription,
  getMetaLine,
  getOpenLabel,
  getPreviewAspectRatio,
  isKnownInlineKind,
  isMatchingReaderView,
  isMarxistsInlineMedia,
  shouldAutoExpandXiaohongshu,
  shouldAutoExpandEmbed,
  shouldShowDirectSourceLink,
  themeSettings,
  extractXiaohongshuShareContext,
  parseBilibiliUrl,
  parseResolvableBilibiliShortUrl,
  parseEbookAttachmentUrl,
  primeEmbedState,
  placeCandidateReplacement,
  replaceCandidateGroup,
  hardenReaderAnchor,
  hardenReaderImage,
  readerViewCache,
  shortLinkResolutionCache,
  wechatArchiveCache,
  READER_CACHE_MAX_ENTRIES,
  READER_CACHE_TTL_MS,
  SHORT_LINK_RESOLUTION_CACHE_MAX_ENTRIES,
  SHORT_LINK_RESOLUTION_CACHE_TTL_MS,
  WECHAT_ARCHIVE_CACHE_MAX_ENTRIES,
  WECHAT_ARCHIVE_CACHE_TTL_MS,
  WECHAT_ARCHIVE_REQUEST_TIMEOUT_MS,
  normalizeWeChatArchivePayload,
  sanitizeReaderImageUrl,
  sanitizeEbookCss,
  resolveReaderViewTitle,
  storeReaderRequest,
  storeShortLinkResolution,
  storeWeChatArchive,
  updateBdfzPostExpandedState,
  wrapperState,
} = context.__themeParserTestApi;

test("reader titles discard Discourse click telemetry and prefer source metadata", () => {
  const parsed = parseBilibiliUrl(
    "https://www.marxists.org/chinese/maozedong/marxist.org-chinese-mao-193708.htm"
  );
  const telemetryTitle =
    "https://www.marxists.org/chinese/maozedong/marxist.org-chinese-mao-193708.htm link clicked 9 times";

  assert.equal(
    cleanProviderTitle(telemetryTitle, parsed),
    "https://www.marxists.org/chinese/maozedong/marxist.org-chinese-mao-193708.htm"
  );
  assert.equal(
    resolveReaderViewTitle({ title: "矛盾论（一九三七年八月）" }, parsed, telemetryTitle),
    "矛盾论（一九三七年八月）"
  );
});

function makeCookedParagraphFixture({
  after = "",
  anchorClass = "",
  anchorText,
  before = "",
  extraLinks = [],
  hasMedia = false,
  inBlockquote = false,
  inList = false,
  lineBreakBeforeAnchor = false,
  url,
}) {
  const paragraph = {
    dataset: {},
    querySelector(selector) {
      return selector.includes("img") && hasMedia ? {} : null;
    },
    querySelectorAll(selector) {
      return selector === "a[href]" ? anchors : [];
    },
  };
  const makeAnchor = (href, text) => ({
    dataset: {},
    href,
    className: anchorClass,
    matches: (selector) =>
      selector === "a.onebox" && anchorClass.split(/\s+/u).includes("onebox"),
    parentElement: paragraph,
    previousSibling: lineBreakBeforeAnchor ? { nodeName: "BR" } : null,
    textContent: text,
    closest(selector) {
      if (selector === "p") {
        return paragraph;
      }

      if (selector.includes("li") || selector.includes("blockquote")) {
        return inList || inBlockquote ? {} : null;
      }

      return null;
    },
  });
  const anchor = makeAnchor(url, anchorText ?? url);
  const anchors = [anchor, ...extraLinks.map(({ href, text }) => makeAnchor(href, text))];
  const lineBreak = lineBreakBeforeAnchor ? { tagName: "BR" } : null;

  paragraph.textContent = `${before}${anchor.textContent}${after}${extraLinks
    .map(({ text }) => text)
    .join("")}`;
  paragraph.children = lineBreak ? [lineBreak, ...anchors] : anchors;

  const cooked = {
    querySelectorAll(selector) {
      if (selector === "p a[href]") {
        return anchors;
      }

      if (selector === "p > a[href]:only-child") {
        return !before && !after && anchors.length === 1 ? [anchor] : [];
      }

      return [];
    },
  };

  return { anchor, anchors, cooked, paragraph };
}

function makeCookedOneboxFixture(url) {
  const block = {
    dataset: { oneboxSrc: url },
    textContent: url,
    querySelector: (selector) => (selector === "a[href]" ? anchor : null),
    querySelectorAll(selector) {
      return selector === "a[href]" ? [anchor] : [];
    },
  };
  const anchor = {
    href: url,
    textContent: url,
    closest: () => block,
  };
  const cooked = {
    querySelectorAll(selector) {
      return selector === "aside.onebox[data-onebox-src], article.onebox[data-onebox-src]"
        ? [block]
        : [];
    },
  };

  return { block, cooked };
}

function makeAttributeElement(initial = {}) {
  const attributes = new Map(Object.entries(initial));

  return {
    attributes,
    removed: false,
    getAttribute: (name) => attributes.get(name) ?? null,
    remove() {
      this.removed = true;
    },
    removeAttribute: (name) => attributes.delete(name),
    setAttribute: (name, value) => attributes.set(name, String(value)),
  };
}

test("parses only EPUB, MOBI, and AZW3 attachment URLs", () => {
  for (const [extension, format] of [
    ["epub", "epub"],
    ["MOBI", "mobi"],
    ["azw3", "azw3"],
  ]) {
    const source = `https://files.rdfzer.com/original/ebook/sample.${extension}?download=1`;
    const parsed = parseEbookAttachmentUrl(source);

    assert.equal(parsed.provider, "ebook");
    assert.equal(parsed.kind, "ebook");
    assert.equal(parsed.format, format);
    assert.equal(parsed.filename, `sample.${extension}`);
    assert.equal(parsed.canonicalUrl, source);
    assert.equal(isKnownInlineKind(parsed), true);
    assert.equal(getInitialButtonLabel(parsed), "打开阅读");
    assert.equal(getMetaLine(parsed), `${format.toUpperCase()} 电子书`);
    assert.equal(getFooterMeta(parsed), "浏览器本地阅读 · 不上传第三方");
    assert.equal(getOpenLabel(parsed), "下载原文件");
    assert.equal(getPreviewAspectRatio(parsed), "auto");
    assert.equal(shouldShowDirectSourceLink(parsed), true);
  }
});

test("leaves official and unsupported document formats alone", () => {
  for (const extension of ["pdf", "txt", "docx", "fb2", "cbz", "zip"]) {
    assert.equal(
      parseEbookAttachmentUrl(`https://files.rdfzer.com/original/document.${extension}`),
      null,
      extension
    );
  }

  assert.equal(parseEbookAttachmentUrl("javascript:alert(1).epub"), null);
  assert.equal(parseEbookAttachmentUrl("https://user@example.com/private.epub"), null);
});

test("collects supported ebook attachments without taking over PDF", () => {
  const makeAnchor = (href) => {
    const paragraph = {
      dataset: {},
      querySelectorAll: () => [anchor],
    };
    const anchor = {
      dataset: {},
      href,
      textContent: href.split("/").at(-1),
      closest(selector) {
        if (selector === "p") {
          return paragraph;
        }

        return null;
      },
    };
    return { anchor, paragraph };
  };
  const epub = makeAnchor("https://files.rdfzer.com/books/fixture.epub");
  const mobi = makeAnchor("https://files.rdfzer.com/books/fixture.mobi");
  const azw3 = makeAnchor("https://files.rdfzer.com/books/fixture.azw3");
  const pdf = makeAnchor("https://files.rdfzer.com/books/official.pdf");
  const cooked = {
    querySelectorAll: (selector) =>
      selector === "a.attachment[href]" ? [epub.anchor, mobi.anchor, azw3.anchor, pdf.anchor] : [],
  };
  const candidates = collectEbookAttachmentCandidates(cooked, []);

  assert.deepEqual(
    Array.from(candidates, ({ parsed }) => parsed.format),
    ["epub", "mobi", "azw3"]
  );
  assert.equal(candidates.some(({ target }) => target === pdf.paragraph), false);
});

test("ebook reader has an admin kill switch and permanent download fallback", () => {
  const parsed = parseEbookAttachmentUrl("https://files.rdfzer.com/books/fixture.epub");

  context.settings.show_open_link = false;
  assert.equal(shouldShowDirectSourceLink(parsed), true);

  context.settings.enable_ebook_reader = false;
  assert.equal(isKnownInlineKind(parsed), false);
  delete context.settings.enable_ebook_reader;
  delete context.settings.show_open_link;
});

test("ebook sanitizer removes remote CSS loads while keeping bundled resources", () => {
  const css = [
    '@import "https://tracker.example/import.css";',
    ".remote { background: url(//tracker.example/pixel.png); }",
    ".active { background: url(javascript:alert(1)); }",
    ".local { background: url(blob:https://forum.example/local); }",
    ".inline { background: url(data:image/png;base64,fixture); }",
  ].join("\n");
  const sanitized = sanitizeEbookCss(css);

  assert.doesNotMatch(sanitized, /@import|tracker\.example|javascript:/u);
  assert.match(sanitized, /blob:https:\/\/forum\.example\/local/u);
  assert.match(sanitized, /data:image\/png;base64,fixture/u);
  assert.match(initializerSource, /if \(detail\.isScript\) \{\s*detail\.allow = false;/u);
});

test("safe inline providers default to expanded without forcing source cards", () => {
  const ebook = parseEbookAttachmentUrl("https://files.rdfzer.com/books/fixture.epub");
  const video = parseBilibiliUrl("https://www.bilibili.com/video/BV1xx411c7mD");
  const zhihu = parseBilibiliUrl("https://www.zhihu.com/question/123456");

  assert.equal(shouldAutoExpandEmbed(ebook), true);
  assert.equal(shouldAutoExpandEmbed(video), true);
  assert.equal(shouldAutoExpandEmbed(zhihu), false);

  context.settings.auto_expand_embeds = false;
  assert.equal(shouldAutoExpandEmbed(ebook), false);
  assert.equal(shouldAutoExpandEmbed(video), false);
  assert.equal(shouldAutoExpandXiaohongshu(parseBilibiliUrl("https://xhslink.cn/o/Fixture123")), false);
  delete context.settings.auto_expand_embeds;
});

test("parses Xiaohongshu note URLs and preserves share parameters", () => {
  const source =
    "https://www.xiaohongshu.com/explore/64f000000000000000000001?xsec_token=fixture_value&xsec_source=pc_feed";
  const parsed = parseBilibiliUrl(source);

  assert.equal(parsed.provider, "xiaohongshu");
  assert.equal(parsed.contentType, "note");
  assert.equal(parsed.noteId, "64f000000000000000000001");
  assert.equal(parsed.canonicalUrl, source);
  assert.equal(isKnownInlineKind(parsed), true);
  assert.equal(shouldAutoExpandXiaohongshu(parsed), true);
  assert.equal(getInitialButtonLabel(parsed), "展开笔记");
  assert.equal(getLoadedFrameHeight(parsed), 720);
  assert.equal(getMetaLine(parsed), "小红书笔记");
  assert.equal(getFooterMeta(parsed), "小红书原文卡片");
  assert.equal(getOpenLabel(parsed), "前往小红书查看");
  assert.equal(getPreviewAspectRatio(parsed), "auto");
});

test("parses the official historical discovery path", () => {
  const parsed = parseBilibiliUrl(
    "https://www.xiaohongshu.com/discovery/item/64f000000000000000000002?xsec_source=share"
  );

  assert.equal(parsed.provider, "xiaohongshu");
  assert.equal(parsed.noteId, "64f000000000000000000002");
});

test("parses RedNote notes as source cards", () => {
  const parsed = parseBilibiliUrl(
    "https://www.rednote.com/explore/64f000000000000000000003?xsec_token=fixture_value"
  );

  assert.equal(parsed.provider, "xiaohongshu");
  assert.equal(parsed.brand, "rednote");
  assert.equal(getMetaLine(parsed), "RedNote 笔记");
  assert.equal(getOpenLabel(parsed), "前往 RedNote 查看");
});

for (const prefix of ["a", "m", "o"]) {
  test(`parses xhslink.com /${prefix}/ short shares without resolving them`, () => {
    const source = `https://xhslink.com/${prefix}/Fixture123`;
    const parsed = parseBilibiliUrl(source);

    assert.equal(parsed.provider, "xiaohongshu");
    assert.equal(parsed.contentType, "share");
    assert.equal(parsed.canonicalUrl, source);
    assert.equal(getMetaLine(parsed), "小红书分享");
    assert.equal(getFooterMeta(parsed), "小红书分享链接");
  });
}

test("parses the current xhslink.cn share form and upgrades HTTP", () => {
  const parsed = parseBilibiliUrl(
    "http://xhslink.cn/o/Fixture123?xsec_token=fixture_value#share"
  );

  assert.equal(parsed.provider, "xiaohongshu");
  assert.equal(parsed.contentType, "share");
  assert.equal(
    parsed.canonicalUrl,
    "https://xhslink.cn/o/Fixture123?xsec_token=fixture_value#share"
  );
});

test("extracts schemeless Xiaohongshu shares before Chinese punctuation", () => {
  const [url] = extractUrlsFromText("复制后打开（xhslink.com/o/Fixture123），查看笔记");

  assert.equal(url, "https://xhslink.com/o/Fixture123");
  assert.equal(parseBilibiliUrl(url).provider, "xiaohongshu");
});

test("does not extract Xiaohongshu from lookalike text hosts", () => {
  const rejected = [
    "https://evil.xhslink.com/o/Fixture123",
    "https://evil.xiaohongshu.com/explore/64f000000000000000000001",
    "ftp://www.xiaohongshu.com/explore/64f000000000000000000001",
    "javascript:xhslink.com/o/Fixture123",
    "https://evil_xhslink.com/o/Fixture123",
    "https://éxhslink.com/o/Fixture123",
  ];

  for (const source of rejected) {
    assert.deepEqual(Array.from(extractUrlsFromText(source)), [], source);
  }
});

test("preserves terminal URL characters for direct cooked links", () => {
  const source =
    "https://www.xiaohongshu.com/explore/64f000000000000000000001?xsec_token=fixture_value!";

  assert.equal(parseBilibiliUrl(source).canonicalUrl, source);
});

test("builds actual Xiaohongshu title and description from copied share text", () => {
  assert.deepEqual(
    { ...buildXiaohongshuPreviewText([
      "这就刷到了…",
      "赤潮，启动！ 今天有没有在北京少年集遇见这只零宝呢 …",
    ]) },
    {
      title: "赤潮，启动！",
      description: "今天有没有在北京少年集遇见这只零宝呢 … · 这就刷到了…",
    }
  );

  assert.deepEqual(
    { ...buildXiaohongshuPreviewText([
      "赤潮，启动！今天有没有在北京少年集遇见这只零宝呢 http://xhslink.cn/o/Fixture123 打开【小红书】，这篇笔记值得一看~",
    ]) },
    {
      title: "赤潮，启动！",
      description: "今天有没有在北京少年集遇见这只零宝呢",
    }
  );
});

test("reads standard copied-share context without taking ownership of source paragraphs", () => {
  const textElement = (text, children = []) => ({
    tagName: "P",
    children,
    textContent: text,
    querySelector: () => null,
    cloneNode: () => ({
      textContent: text,
      querySelectorAll: () => [],
    }),
  });
  const previous = textElement(
    "这就刷到了…\n赤潮，启动！ 今天有没有在北京少年集遇见这只零宝呢 …"
  );
  const next = textElement("打开【小红书】，这篇笔记值得一看~");
  const target = {
    previousElementSibling: previous,
    nextElementSibling: next,
    matches: () => false,
  };
  const context = extractXiaohongshuShareContext(target);

  assert.equal(context.title, "赤潮，启动！");
  assert.match(context.description, /北京少年集/u);
  assert.equal("absorbedTargets" in context, false);

  const oldProviderContext = extractXiaohongshuShareContext({
    previousElementSibling: textElement("https://b23.tv/Fixture123"),
    nextElementSibling: next,
    matches: () => false,
  });
  assert.equal(oldProviderContext.title, "");

  const richContext = extractXiaohongshuShareContext({
    previousElementSibling: textElement("不应作为标题", [{ tagName: "IMG" }]),
    nextElementSibling: next,
    matches: () => false,
  });
  assert.equal(richContext.title, "");
});

test("collects an auto-linkified Xiaohongshu URL inside copied share text", () => {
  const paragraph = {
    dataset: {},
    textContent:
      "赤潮，启动！今天有没有在北京少年集遇见这只零宝呢 https://xhslink.cn/o/Fixture123 打开【小红书】，这篇笔记值得一看~",
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === "a[href]" ? [anchor] : []),
  };
  const anchor = {
    dataset: {},
    href: "https://xhslink.cn/o/Fixture123",
    parentElement: paragraph,
    textContent: "https://xhslink.cn/o/Fixture123",
    closest(selector) {
      return selector === "p" ? paragraph : null;
    },
  };
  paragraph.children = [anchor];
  const cooked = {
    querySelectorAll: (selector) =>
      ["p > a[href]:only-child", "p a[href]"].includes(selector) ? [anchor] : [],
  };
  const standalone = collectStandaloneCandidates(cooked, []);
  const [candidate] = collectVisibleUrlCandidates(
    cooked,
    standalone.map((item) => item.target)
  );

  assert.equal(standalone.length, 0);
  assert.equal(candidate.target, paragraph);
  assert.equal(candidate.parsed.provider, "xiaohongshu");
  assert.equal(candidate.preserveSource, true);
});

test("keeps a standalone Xiaohongshu source paragraph beside its card", () => {
  const source = "https://xhslink.cn/o/Fixture123";
  const paragraph = {
    dataset: {},
    textContent: source,
  };
  const anchor = {
    href: source,
    textContent: source,
    closest(selector) {
      return selector === "p" ? paragraph : null;
    },
  };
  const cooked = {
    querySelectorAll: (selector) => (selector === "p > a[href]:only-child" ? [anchor] : []),
  };
  const [candidate] = collectStandaloneCandidates(cooked, []);

  assert.equal(candidate.preserveSource, true);
});

test("keeps surrounding pasted share text when adding a source card", () => {
  const originalText = "复制后打开（xhslink.com/o/Fixture123），查看笔记";
  let inserted = null;
  let replaced = false;
  const block = {
    dataset: {},
    querySelector: () => null,
    textContent: originalText,
    insertAdjacentElement(position, element) {
      inserted = { position, element };
    },
    replaceWith() {
      replaced = true;
    },
  };
  const cooked = {
    querySelectorAll: (selector) => (selector === "p" ? [block] : []),
  };
  const [candidate] = collectEmbedTextCandidates(cooked, []);
  const replacement = {};

  assert.equal(candidate.preserveSource, true);
  placeCandidateReplacement(candidate, replacement);
  assert.equal(block.textContent, originalText);
  assert.equal(block.dataset.bilibiliInlinePlayer, "done");
  assert.deepEqual(inserted, { position: "afterend", element: replacement });
  assert.equal(replaced, false);
});

test("rejects lookalike hosts, unsupported paths, credentials, and custom ports", () => {
  const rejected = [
    "https://xiaohongshu.com.evil.example/explore/64f000000000000000000001",
    "https://evil-xiaohongshu.com/explore/64f000000000000000000001",
    "https://www.xiaohongshu.com/user/profile/64f000000000000000000001",
    "https://xhslink.com/live/Fixture123",
    "https://xhslink.com/Fixture123",
    "https://xhslink.cn/Fixture123",
    "ftp://www.xiaohongshu.com/explore/64f000000000000000000001",
    "https://user@example.com@www.xiaohongshu.com/explore/64f000000000000000000001",
    "https://www.xiaohongshu.com:444/explore/64f000000000000000000001",
    "http://www.zhihu.com/question/123456",
    "https://www.zhihu.com.evil.example/question/123456",
    "https://user:pass@www.zhihu.com/question/123456",
    "https://www.zhihu.com:444/question/123456",
    "https://www.zhihu.com/question/not-numeric",
    "https://www.zhihu.com/collection/123456",
    "https://mp.weixin.qq.com.evil.example/s/Fixture123",
    "https://user:pass@mp.weixin.qq.com/s/Fixture123",
    "https://mp.weixin.qq.com:444/s/Fixture123",
    "ftp://mp.weixin.qq.com/s/Fixture123",
    "https://mp.weixin.qq.com/mp/wappoc_appmsgcaptcha?poc_token=fixture",
    "https://mp.weixin.qq.com/profile?src=fixture",
    "https://mp.weixin.qq.com/s?sn=missing-identity",
  ];

  for (const source of rejected) {
    assert.equal(parseBilibiliUrl(source), null, source);
  }
});

test("keeps representative existing providers working", () => {
  assert.equal(
    parseBilibiliUrl("https://www.bilibili.com/video/BV1xx411c7mD").provider,
    "bilibili"
  );
  assert.equal(parseBilibiliUrl("https://music.163.com/song?id=123456").provider, "netease");
  assert.equal(
    parseBilibiliUrl("https://y.qq.com/n/ryqq/songDetail/004Z8Ihr0JIu5s").provider,
    "qqmusic"
  );
  assert.equal(
    parseBilibiliUrl("https://www.zhihu.com/question/123456/answer/789012").provider,
    "zhihu"
  );
  assert.equal(
    parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123").provider,
    "wechat"
  );
  assert.equal(
    parseBilibiliUrl("https://bdfz.net/posts/180-qishike/").provider,
    "bdfz-post"
  );
});

test("accepts only exact opaque Bilibili short links for server resolution", () => {
  assert.equal(
    parseResolvableBilibiliShortUrl("https://b23.tv/cUbeWZt"),
    "https://b23.tv/cUbeWZt"
  );
  assert.equal(
    parseResolvableBilibiliShortUrl("https://bili2233.cn/AbC123"),
    "https://bili2233.cn/AbC123"
  );
  assert.equal(parseBilibiliUrl("https://b23.tv/cUbeWZt"), null);

  for (const source of [
    "http://b23.tv/cUbeWZt",
    "https://www.b23.tv/cUbeWZt",
    "https://b23.tv/abcd",
    "https://b23.tv/AbCdEfGhIjKlM",
    "https://b23.tv/a/b/cUbeWZt",
    "https://b23.tv/cUbeWZt?share=1",
    "https://b23.tv/cUbeWZt#fragment",
    "https://user:pass@b23.tv/cUbeWZt",
    "https://b23.tv:443/cUbeWZt",
    "https://b23.tv:444/cUbeWZt",
    String.raw`https:\\b23.tv\cUbeWZt`,
    "https://b23.tv.evil.example/cUbeWZt",
    "https://v.douyin.com/cUbeWZt",
  ]) {
    assert.equal(parseResolvableBilibiliShortUrl(source), "", source);
  }
});

test("parses exact Douyin video forms and uses the official iframe player", () => {
  const shared = parseBilibiliUrl(
    "https://www.douyin.com/user/MS4wLjABAAAAJvJKCUI1dlwh2e_M-6YX06NDDhLbIEpshPyNyW-K-_jYj4_dr2dkc7n1EElIkuhj?modal_id=7026333893087202567"
  );

  assert.deepEqual(JSON.parse(JSON.stringify(shared)), {
    provider: "douyin",
    kind: "douyin",
    contentType: "video",
    videoId: "7026333893087202567",
    page: 1,
    rawId: "7026333893087202567",
    canonicalUrl: "https://www.douyin.com/video/7026333893087202567",
  });
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(parseBilibiliUrl("https://www.douyin.com/video/7026333893087202567"))
    ),
    JSON.parse(JSON.stringify(shared))
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        parseBilibiliUrl("https://www.iesdouyin.com/share/video/7026333893087202567/")
      )
    ),
    JSON.parse(JSON.stringify(shared))
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        parseBilibiliUrl(
          "https://open.douyin.com/player/video?vid=7026333893087202567&autoplay=0"
        )
      )
    ),
    JSON.parse(JSON.stringify(shared))
  );

  assert.equal(
    buildIframeUrl(shared),
    "https://open.douyin.com/player/video?vid=7026333893087202567&autoplay=1"
  );
  assert.equal(
    buildNoAutoplayIframeUrl(shared),
    "https://open.douyin.com/player/video?vid=7026333893087202567&autoplay=0"
  );
  assert.equal(getMetaLine(shared), "抖音视频");
  assert.equal(getFallbackTitle(shared), "抖音视频 7026333893087202567");
  assert.equal(getInitialButtonLabel(shared), "点击播放");
  assert.equal(getOpenLabel(shared), "在抖音打开");
  assert.equal(getFooterMeta(shared), "抖音开放平台播放器 · 保留原视频链接");
  assert.equal(getPreviewAspectRatio(shared), "324 / 672");
  assert.equal(isKnownInlineKind(shared), true);
  assert.equal(shouldAutoExpandEmbed(shared), true);

  assert.equal(getDouyinPlayerScale(324), 1);
  assert.equal(getDouyinPlayerScale(162), 0.5);
  assert.equal(getDouyinPlayerScale(400), 1);
  assert.equal(getDouyinPlayerScale(0), 1);
  assert.equal(getDouyinPlayerScale(Number.NaN), 1);
  assert.match(initializerSource, /attachDouyinPlayerScale\(wrapper, frameWrap\)/u);

  const wrapper = {};
  const state = { parsed: shared, environmentRisk: { level: "none" } };
  wrapperState.set(wrapper, state);
  primeEmbedState(wrapper);
  assert.equal(
    state.iframeUrl,
    "https://open.douyin.com/player/video?vid=7026333893087202567&autoplay=1"
  );
  assert.equal(
    state.noAutoplayIframeUrl,
    "https://open.douyin.com/player/video?vid=7026333893087202567&autoplay=0"
  );
  assert.equal(state.externalOnly, false);

  context.settings.show_open_link = false;
  assert.equal(shouldShowDirectSourceLink(shared), true);
  delete context.settings.show_open_link;

  context.settings.autoplay_on_click = false;
  assert.equal(
    buildIframeUrl(shared),
    "https://open.douyin.com/player/video?vid=7026333893087202567&autoplay=0"
  );
  delete context.settings.autoplay_on_click;
});

test("rejects unsafe or ambiguous Douyin URLs and extracts the supported modal form", () => {
  const supported =
    "https://www.douyin.com/user/MS4wLjABAAAAJvJKCUI1dlwh2e_M-6YX06NDDhLbIEpshPyNyW-K-_jYj4_dr2dkc7n1EElIkuhj?modal_id=7026333893087202567";

  assert.deepEqual(Array.from(extractUrlsFromText(`抖音：${supported}`)), [supported]);

  for (const source of [
    "https://www.douyin.com/user/MS4wLjABAAAA",
    "https://www.douyin.com/user/MS4wLjABAAAA?modal_id=not-numeric",
    "https://www.douyin.com/user/MS4wLjABAAAA?modal_id=7026333893087202567&modal_id=7026333893087202568",
    "https://www.douyin.com/note/7026333893087202567",
    "https://v.douyin.com/Fixture123/",
    "https://www.douyin.com.evil.example/video/7026333893087202567",
    "https://user:pass@www.douyin.com/video/7026333893087202567",
    "https://www.douyin.com:444/video/7026333893087202567",
    "ftp://www.douyin.com/video/7026333893087202567",
    "https://open.douyin.com/player/video?vid=7026333893087202567&vid=7026333893087202568",
  ]) {
    assert.equal(parseBilibiliUrl(source), null, source);
  }
});

test("parses only exact WeChat public-article URLs and preserves their source identity", () => {
  const parsed = parseBilibiliUrl(
    "http://mp.weixin.qq.com/s?__biz=MzDemo%3D%3D&mid=123&idx=1&sn=abc#wechat_redirect"
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(parsed)),
    {
      provider: "wechat",
      kind: "wechat",
      contentType: "article",
      page: 1,
      rawId: "/s",
      sourceIdentity: "wechat:article:MzDemo==:123:1",
      canonicalUrl:
        "https://mp.weixin.qq.com/s?__biz=MzDemo%3D%3D&mid=123&idx=1&sn=abc",
    }
  );
  assert.equal(
    parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture_123-abc").canonicalUrl,
    "https://mp.weixin.qq.com/s/Fixture_123-abc"
  );
  assert.equal(getMetaLine(parsed), "微信公号全文");
  assert.equal(getFallbackTitle(parsed), "微信公号文章");
  assert.equal(getOpenLabel(parsed), "在微信打开原文");
});

test("parses only exact bdfz.net article pages and defaults them to an inline full-text frame", () => {
  const parsed = parseBilibiliUrl(
    "http://www.bdfz.net/posts/180-qishike/?utm_source=forum#section"
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(parsed)),
    {
      provider: "bdfz-post",
      kind: "bdfz-post",
      contentType: "article",
      page: 1,
      rawId: "180-qishike",
      canonicalUrl: "https://bdfz.net/posts/180-qishike/",
    }
  );
  assert.equal(getMetaLine(parsed), "BDFZ 博文全文");
  assert.equal(getFallbackTitle(parsed), "BDFZ 博文");
  assert.equal(getInitialButtonLabel(parsed), "展开正文");
  assert.equal(getOpenLabel(parsed), "在 bdfz.net 打开原文");
  assert.equal(getFooterMeta(parsed), "bdfz.net 原文 · 默认展开，可随时收起");
  assert.equal(getPreviewAspectRatio(parsed), "auto");
  assert.equal(getLoadedFrameHeight(parsed), 900);
  assert.equal(isKnownInlineKind(parsed), true);
  assert.equal(shouldAutoExpandEmbed(parsed), true);
  assert.equal(shouldShowDirectSourceLink(parsed), true);

  const standalone = makeCookedParagraphFixture({ url: parsed.canonicalUrl });
  const [candidate] = collectStandaloneCandidates(standalone.cooked, []);
  assert.equal(candidate.parsed.provider, "bdfz-post");
  assert.equal(candidate.target, standalone.paragraph);

  themeSettings.enable_bdfz_posts_inline = false;
  assert.equal(isKnownInlineKind(parsed), false);
  assert.equal(shouldAutoExpandEmbed(parsed), false);
  assert.equal(getFooterMeta(parsed), "bdfz.net 原文链接");
  delete themeSettings.enable_bdfz_posts_inline;

  for (const source of [
    "https://bdfz.net/posts/",
    "https://bdfz.net/posts/page/2/",
    "https://bdfz.net/posts/index.xml",
    "https://bdfz.net/posts/one/two/",
    "https://bdfz.net.evil.example/posts/180-qishike/",
    "https://user:pass@bdfz.net/posts/180-qishike/",
    "https://bdfz.net:444/posts/180-qishike/",
    "ftp://bdfz.net/posts/180-qishike/",
  ]) {
    assert.equal(parseBilibiliUrl(source), null, source);
  }
});

test("bdfz.net article frames expose an accessible default-open collapse control", () => {
  const classes = new Map();
  const attributes = new Map();
  const wrapper = {
    dataset: {},
    classList: {
      toggle(name, enabled) {
        classes.set(name, enabled);
      },
    },
  };
  const frameWrap = { hidden: false };
  const button = {
    textContent: "",
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };

  updateBdfzPostExpandedState(wrapper, frameWrap, button, true);
  assert.equal(frameWrap.hidden, false);
  assert.equal(wrapper.dataset.bilibiliExpanded, "1");
  assert.equal(classes.get("bilibili-inline-player--collapsed"), false);
  assert.equal(button.textContent, "收起正文");
  assert.equal(attributes.get("aria-expanded"), "true");

  updateBdfzPostExpandedState(wrapper, frameWrap, button, false);
  assert.equal(frameWrap.hidden, true);
  assert.equal(wrapper.dataset.bilibiliExpanded, "0");
  assert.equal(classes.get("bilibili-inline-player--collapsed"), true);
  assert.equal(button.textContent, "展开正文");
  assert.equal(attributes.get("aria-expanded"), "false");
  assert.match(
    initializerSource,
    /iframe\.sandbox = "allow-popups allow-popups-to-escape-sandbox";/u
  );
  assert.match(initializerSource, /attachBdfzPostToggle\(wrapper, frameWrap, footer\)/u);
});

test("bdfz.net article frames auto-fit without becoming unreadably small", () => {
  assert.equal(getBdfzPostAutoScale(800), 1);
  assert.equal(getBdfzPostAutoScale(640), 0.8);
  assert.equal(getBdfzPostAutoScale(320), 0.7);
  assert.equal(getBdfzPostAutoScale(1200), 1);
  assert.equal(getBdfzPostAutoScale(0), 1);
  assert.equal(getBdfzPostAutoScale(Number.NaN), 1);
  assert.match(initializerSource, /new ResizeObserver\(updateScale\)/u);
  assert.match(initializerSource, /enable_bdfz_post_auto_scale/u);
});

test("always keeps a direct source link for Xiaohongshu", () => {
  context.settings.show_open_link = false;

  assert.equal(shouldShowDirectSourceLink(parseBilibiliUrl("https://xhslink.cn/o/Fixture123")), true);
  assert.equal(
    shouldShowDirectSourceLink(parseBilibiliUrl("https://www.bilibili.com/video/BV1xx411c7mD")),
    false
  );

  delete context.settings.show_open_link;
});

test("always keeps the original WeChat source link", () => {
  context.settings.show_open_link = false;
  const parsed = parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123");

  assert.equal(shouldShowDirectSourceLink(parsed), true);
  delete context.settings.show_open_link;
});

test("routes safe embeds through the shared automatic expansion path", () => {
  const parsed = parseBilibiliUrl("https://xhslink.cn/o/Fixture123");

  assert.equal(shouldAutoExpandXiaohongshu(parsed), true);
  assert.match(
    initializerSource,
    /if \(shouldAutoExpandEmbed\(metadata\.parsed\)\)[\s\S]{0,160}autoExpandWrapper\(wrapper\)/u
  );
  assert.match(
    initializerSource,
    /const nonAutoplayUrl = state\.noAutoplayIframeUrl \|\| state\.iframeUrl;[\s\S]{0,120}renderLoadedPlayer\(wrapper, nonAutoplayUrl\)/u
  );
  assert.match(
    initializerSource,
    /function renderLoadedPlayer\(wrapper, iframeUrl, \{ allowAutoplay = false \} = \{\}\)/u
  );

  context.settings.enable_xiaohongshu_inline_page = false;
  assert.equal(shouldAutoExpandXiaohongshu(parsed), false);
  delete context.settings.enable_xiaohongshu_inline_page;
});

test("does not re-decorate an iframe owned by the component", () => {
  const iframe = {
    closest(selector) {
      return selector === ".bilibili-inline-player, [data-bilibili-inline-player]" ? {} : null;
    },
  };
  const cooked = {
    querySelectorAll: (selector) => (selector === "iframe[src]" ? [iframe] : []),
  };

  assert.deepEqual(Array.from(collectIframeCandidates(cooked, [])), []);
});

test("uses the current single-argument apiInitializer signature", () => {
  assert.doesNotMatch(initializerSource, /apiInitializer\("1\.8\.0"/u);
  assert.match(initializerSource, /export default apiInitializer\(\(api\) =>/u);
});

test("reads Discourse's injected theme settings rather than a window property", () => {
  assert.match(
    initializerSource,
    /const themeSettings = typeof settings === "object" && settings \? settings : \{\};/u
  );
  assert.doesNotMatch(initializerSource, /globalThis\.settings/u);
});

test("parses Marxists Internet Archive documents into structured source cards", () => {
  const manifesto = parseBilibiliUrl(
    "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm"
  );

  assert.equal(manifesto.provider, "marxists");
  assert.equal(manifesto.kind, "marxists");
  assert.equal(manifesto.contentType, "document");
  assert.equal(manifesto.authorName, "Karl Marx & Frederick Engels");
  assert.equal(manifesto.workTitle, "Communist Manifesto");
  assert.equal(manifesto.dateText, "1848年");
  assert.equal(manifesto.chapter, "1");
  assert.equal(
    manifesto.canonicalUrl,
    "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm"
  );

  const glossary = parseBilibiliUrl("https://www.marxists.org/glossary/people/m/a.htm");

  assert.equal(glossary.sectionLabel, "马克思主义文库·术语库·人物");
  assert.equal(getFallbackTitle(glossary), "马克思主义文库·术语库·人物");
});

test("reads the Chinese archive's date-bearing filename convention", () => {
  const onContradiction = parseBilibiliUrl(
    "https://www.marxists.org/chinese/maozedong/marxist.org-chinese-mao-193708.htm"
  );

  assert.equal(onContradiction.language, "chinese");
  assert.equal(onContradiction.authorName, "毛泽东");
  assert.equal(onContradiction.dateText, "1937年8月");
  assert.equal(onContradiction.sectionLabel, "中文马克思主义文库");
  assert.equal(getMarxistsDescription(onContradiction), "1937年8月");

  const classAnalysis = parseBilibiliUrl(
    "https://www.marxists.org/chinese/maozedong/marxist.org-chinese-mao-19251201.htm"
  );

  assert.equal(classAnalysis.dateText, "1925年12月1日");

  const paddedDay = parseBilibiliUrl(
    "https://www.marxists.org/chinese/maozedong/marxist.org-chinese-mao-19370800.htm"
  );

  assert.equal(paddedDay.dateText, "1937年8月");
});

test("prefers the author over the archive's opaque work abbreviations", () => {
  const stateAndRevolution = parseBilibiliUrl(
    "https://www.marxists.org/archive/lenin/works/1917/staterev/index.htm"
  );

  assert.equal(stateAndRevolution.workTitle, "");
  assert.equal(getFallbackTitle(stateAndRevolution), "Vladimir Lenin");
  assert.equal(getMarxistsDescription(stateAndRevolution), "1917年");
});

test("plays archive audio and video inline without framing the site", () => {
  const speech = parseBilibiliUrl(
    "https://marxists.org/archive/kollonta/audio/to-the-workers.mp3"
  );

  assert.equal(speech.contentType, "audio");
  assert.equal(speech.canonicalUrl, "https://www.marxists.org/archive/kollonta/audio/to-the-workers.mp3");
  assert.equal(getFallbackTitle(speech), "To The Workers");
  assert.equal(getInitialButtonLabel(speech), "播放录音");
  assert.equal(isMarxistsInlineMedia(speech), true);
  assert.equal(isKnownInlineKind(speech), true);
  assert.equal(shouldAutoExpandEmbed(speech), true);

  const lecture = parseBilibiliUrl(
    "https://www.marxists.org/audiobooks/farsi/lenin/ThreeSourcesComponentsOfMarxism.mp4"
  );

  assert.equal(lecture.contentType, "video");
  assert.equal(getFallbackTitle(lecture), "Three Sources Components Of Marxism");
  assert.equal(getPreviewAspectRatio(lecture), "16 / 9");
});

test("marxists documents stay cards and never claim an inline renderer", () => {
  const document = parseBilibiliUrl("https://www.marxists.org/archive/trotsky/1930/hrr/index.htm");

  assert.equal(isMarxistsInlineMedia(document), false);
  assert.equal(isKnownInlineKind(document), false);
  assert.equal(shouldAutoExpandEmbed(document), false);
  assert.equal(shouldShowDirectSourceLink(document), true);
  assert.equal(getOpenLabel(document), "在马克思主义文库打开");
  assert.equal(getFooterMeta(document), "原文经 BDFZ 阅读服务展开 · 该站禁止页面被外部内嵌");

  const ebook = parseBilibiliUrl("https://www.marxists.org/ebooks/marx/capital.epub");

  assert.equal(ebook.contentType, "download");
  assert.equal(isKnownInlineKind(ebook), false);
  assert.equal(getOpenLabel(ebook), "下载原文件");
});

test("leaves marxists PDFs, images, and lookalike hosts alone", () => {
  assert.equal(parseBilibiliUrl("https://www.marxists.org/chinese/maozedong/collect/mao.pdf"), null);
  assert.equal(parseBilibiliUrl("https://www.marxists.org/chinese/images/back02.jpg"), null);
  assert.equal(parseBilibiliUrl("https://marxists.org.evil.example/archive/marx/index.htm"), null);
  assert.equal(parseBilibiliUrl("https://www.marxists.org:8443/archive/marx/index.htm"), null);
  assert.equal(parseBilibiliUrl("https://user:pass@www.marxists.org/archive/marx/index.htm"), null);
});

test("finds a bare marxists link inside cooked text", () => {
  assert.deepEqual(
    Array.from(extractUrlsFromText("参见 https://www.marxists.org/chinese/marx/index.htm 。")),
    ["https://www.marxists.org/chinese/marx/index.htm"]
  );
});

test("recognizes topic 1330/2 standalone and a synthetic document onebox shape", () => {
  const url = "https://www.marxists.org/chinese/maozedong/marxist.org-chinese-mao-193708.htm";
  const standalone = makeCookedParagraphFixture({ url });
  const [standaloneCandidate] = collectStandaloneCandidates(standalone.cooked, []);

  assert.equal(standaloneCandidate.target, standalone.paragraph);
  assert.equal(standaloneCandidate.parsed.provider, "marxists");
  assert.equal(standaloneCandidate.preserveSource, false);

  const onebox = makeCookedOneboxFixture(url);
  const [oneboxCandidate] = collectOneboxCandidates(onebox.cooked);

  assert.equal(oneboxCandidate.target, onebox.block);
  assert.equal(oneboxCandidate.parsed.provider, "marxists");
});

test("recognizes topic 2327/1 short note, BR, and auto-linked Marxists source", () => {
  const url = "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm";
  const fixture = makeCookedParagraphFixture({
    anchorClass: "onebox",
    before: "延伸阅读与原始文献请见：",
    lineBreakBeforeAnchor: true,
    url,
  });
  const [candidate] = collectVisibleUrlCandidates(fixture.cooked, []);

  assert.equal(fixture.anchor.className, "onebox");
  assert.equal(fixture.anchor.previousSibling.nodeName, "BR");
  assert.equal(candidate.target, fixture.paragraph);
  assert.equal(candidate.parsed.provider, "marxists");
  assert.equal(candidate.preserveSource, true);

  const replacement = {};
  let placement = null;
  fixture.paragraph.insertAdjacentElement = (position, element) => {
    placement = { element, position };
  };
  placeCandidateReplacement(candidate, replacement);
  assert.deepEqual(placement, { element: replacement, position: "afterend" });
  assert.equal(fixture.paragraph.dataset.bilibiliInlinePlayer, "done");
});

test("rejects topic 9340's six pasted-article navigation links", () => {
  const previous = "https://www.marxists.org/chinese/example/previous.htm";
  const fixture = makeCookedParagraphFixture({
    after: "　",
    anchorClass: "onebox",
    anchorText: "上一篇",
    before: "文章正文后的导航：",
    extraLinks: [
      { href: "https://www.marxists.org/chinese/example/index.htm", text: "目录" },
      { href: "https://www.marxists.org/chinese/example/next.htm", text: "下一篇" },
    ],
    lineBreakBeforeAnchor: true,
    url: previous,
  });
  const headingLinks = ["previous", "index", "next"].map((slug) => ({
    href: `https://www.marxists.org/chinese/example/${slug}.htm`,
    textContent: slug,
  }));
  const cooked = {
    querySelectorAll(selector) {
      if (selector === "a[href]") {
        return [...headingLinks, ...fixture.anchors];
      }

      return fixture.cooked.querySelectorAll(selector);
    },
  };

  assert.equal(cooked.querySelectorAll("a[href]").length, 6);
  assert.equal(collectVisibleUrlCandidates(cooked, []).length, 0);
});

test("rejects topic 6813's three non-URL navigation anchors", () => {
  const fixture = makeCookedParagraphFixture({
    after: "　",
    anchorClass: "onebox",
    anchorText: "上一篇",
    before: "文章正文后的导航：",
    extraLinks: [
      { href: "https://www.marxists.org/chinese/example/index.htm", text: "目录" },
      { href: "https://www.marxists.org/chinese/example/next.htm", text: "下一篇" },
    ],
    url: "https://www.marxists.org/chinese/example/previous.htm",
  });

  assert.equal(collectVisibleUrlCandidates(fixture.cooked, []).length, 0);

  const titledNavigation = makeCookedParagraphFixture({
    anchorClass: "onebox",
    before: "导航：",
    anchorText: "目录",
    url: "https://www.marxists.org/chinese/example/index.htm",
  });
  assert.equal(collectVisibleUrlCandidates(titledNavigation.cooked, []).length, 0);
});

test("recognizes one visible supported URL at any position in a paragraph", () => {
  for (const url of [
    "https://www.bilibili.com/video/BV1xx411c7mD",
    "https://www.douyin.com/user/MS4wLjABAAAAJvJKCUI1dlwh2e_M-6YX06NDDhLbIEpshPyNyW-K-_jYj4_dr2dkc7n1EElIkuhj?modal_id=7026333893087202567",
    "https://music.163.com/song?id=123456",
    "https://y.qq.com/n/ryqq/songDetail/004Z8Ihr0JIu5s",
    "https://xhslink.cn/o/Fixture123",
    "https://bdfz.net/posts/180-qishike/",
    "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm",
    "https://www.zhihu.com/question/123456",
  ]) {
    const fixture = makeCookedParagraphFixture({ before: "来源：\n第二行：", url });
    const [candidate] = collectVisibleUrlCandidates(fixture.cooked, []);

    assert.ok(candidate, url);
    assert.equal(candidate.target, fixture.paragraph, url);
    assert.equal(candidate.parsed.canonicalUrl, parseBilibiliUrl(url).canonicalUrl, url);
    assert.equal(candidate.preserveSource, true, url);
  }
});

test("collects multiple URL-labelled anchors from separate BR visual segments", () => {
  const firstUrl = "https://www.bilibili.com/video/BV1xx411c7mD";
  const secondUrl = "https://www.bilibili.com/video/BV1xx411c7mE";
  const paragraph = {
    children: [],
    dataset: {},
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === "a[href]" ? [first, second] : []),
  };
  const makeAnchor = (href) => ({
    dataset: {},
    href,
    parentElement: paragraph,
    textContent: href,
    closest(selector) {
      return selector === "p" ? paragraph : null;
    },
  });
  const first = makeAnchor(firstUrl);
  const second = makeAnchor(secondUrl);
  const lineBreak = { parentElement: paragraph, tagName: "BR" };
  paragraph.children = [first, lineBreak, second];
  const cooked = {
    querySelectorAll: (selector) => (selector === "p a[href]" ? [first, second] : []),
  };

  const candidates = collectVisibleUrlCandidates(cooked, []);

  assert.equal(candidates.length, 2);
  assert.deepEqual(Array.from(candidates, (candidate) => candidate.segmentIndex), [0, 1]);
  assert.ok(candidates.every((candidate) => candidate.target === paragraph));
  assert.deepEqual(Array.from(candidates, (candidate) => candidate.markerTarget), [first, second]);
});

test("scopes copied-share metadata to its own BR visual segment", () => {
  const makeNode = (nodeName, textContent = "") => ({
    nodeName,
    textContent,
    cloneNode() {
      return makeNode(nodeName, textContent);
    },
  });
  const firstText = makeNode("#text", "【第一则】 ");
  const firstAnchor = makeNode("A", "https://www.bilibili.com/video/BV1xx411c7mD");
  const lineBreak = makeNode("BR");
  const secondText = makeNode("#text", "【第二则】 ");
  const secondAnchor = makeNode("A", "https://www.bilibili.com/video/BV1xx411c7mE");
  const paragraph = {
    childNodes: [firstText, firstAnchor, lineBreak, secondText, secondAnchor],
    cloneNode() {
      return {
        childNodes: [],
        textContent: "",
        appendChild(node) {
          this.childNodes.push(node);
          this.textContent += node.textContent || "";
        },
      };
    },
  };

  const first = cloneParagraphVisualSegment(paragraph, 0);
  const second = cloneParagraphVisualSegment(paragraph, 1);

  assert.equal(
    first.textContent,
    "【第一则】 https://www.bilibili.com/video/BV1xx411c7mD"
  );
  assert.equal(
    second.textContent,
    "【第二则】 https://www.bilibili.com/video/BV1xx411c7mE"
  );
});

test("rejects multiple links in one visual segment but not separate share rows", () => {
  const fixture = makeCookedParagraphFixture({
    extraLinks: [
      {
        href: "https://www.bilibili.com/video/BV1xx411c7mE",
        text: "https://www.bilibili.com/video/BV1xx411c7mE",
      },
    ],
    url: "https://www.bilibili.com/video/BV1xx411c7mD",
  });

  assert.equal(collectVisibleUrlCandidates(fixture.cooked, []).length, 0);
});

test("counts BR-delimited share cards against max_embeds_per_post", () => {
  const urls = [
    "https://www.bilibili.com/video/BV1xx411c7mD",
    "https://www.bilibili.com/video/BV1xx411c7mE",
    "https://www.bilibili.com/video/BV1xx411c7mF",
  ];
  const paragraph = {
    children: [],
    dataset: {},
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === "a[href]" ? anchors : []),
  };
  const anchors = urls.map((href) => ({
    dataset: {},
    href,
    parentElement: paragraph,
    textContent: href,
    closest: (selector) => (selector === "p" ? paragraph : null),
  }));
  paragraph.children = [
    anchors[0],
    { parentElement: paragraph, tagName: "BR" },
    anchors[1],
    { parentElement: paragraph, tagName: "BR" },
    anchors[2],
  ];
  const cooked = {
    querySelectorAll: (selector) => (selector === "p a[href]" ? anchors : []),
  };

  themeSettings.max_embeds_per_post = 2;
  assert.equal(collectVisibleUrlCandidates(cooked, []).length, 2);
  delete themeSettings.max_embeds_per_post;
});

test("trims pasted URL punctuation only in the visible-link candidate path", () => {
  const canonical = "https://www.bilibili.com/video/BV1xx411c7mD";
  const fixture = makeCookedParagraphFixture({
    anchorText: `${canonical}】`,
    before: "【推荐视频】\u00a0",
    url: `${canonical}】`,
  });
  fixture.anchor.getAttribute = (name) => (name === "href" ? `${canonical}】` : null);

  const [candidate] = collectVisibleUrlCandidates(fixture.cooked, []);

  assert.equal(candidate.parsed.canonicalUrl, canonical);
  assert.equal(parseBilibiliUrl(`${canonical}】`), null);
});

test("collects mixed-text opaque short links only when the resolver is enabled", () => {
  const shortUrl = "https://b23.tv/cUbeWZt";
  const fixture = makeCookedParagraphFixture({
    anchorText: `${shortUrl}】`,
    before: "【你好陌生人，如果你刷到这个视频，请对自己说一句辛苦了】\u00a0",
    url: `${shortUrl}】`,
  });
  fixture.anchor.getAttribute = (name) => (name === "href" ? `${shortUrl}】` : null);

  assert.equal(collectVisibleUrlCandidates(fixture.cooked, []).length, 0);

  themeSettings.enable_short_link_resolution = true;
  try {
    const [candidate] = collectVisibleUrlCandidates(fixture.cooked, []);

    assert.equal(candidate.target, fixture.paragraph);
    assert.equal(candidate.markerTarget, fixture.anchor);
    assert.equal(candidate.parsed, null);
    assert.equal(candidate.shortUrl, shortUrl);
    assert.equal(candidate.preserveSource, true);
  } finally {
    delete themeSettings.enable_short_link_resolution;
  }
});

test("opaque short links count against max_embeds_per_post before resolution", () => {
  const first = makeCookedParagraphFixture({ url: "https://b23.tv/Code0001" });
  const second = makeCookedParagraphFixture({ url: "https://bili2233.cn/Code0002" });
  const cooked = {
    querySelectorAll(selector) {
      return selector === "p > a[href]:only-child"
        ? [first.anchor, second.anchor]
        : [];
    },
  };

  themeSettings.enable_short_link_resolution = true;
  themeSettings.max_embeds_per_post = 1;
  try {
    const candidates = collectStandaloneCandidates(cooked, []);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].shortUrl, "https://b23.tv/Code0001");
    assert.equal(candidates[0].preserveSource, true);
  } finally {
    delete themeSettings.enable_short_link_resolution;
    delete themeSettings.max_embeds_per_post;
  }
});

test("pending short-link resolution blocks re-decoration and fails open", async () => {
  const shortUrl = "https://b23.tv/cUbeWZt";
  const fixture = makeCookedParagraphFixture({
    before: "【短链测试】\u00a0",
    url: shortUrl,
  });
  const originalFetch = context.fetch;
  let releaseFetch;

  themeSettings.enable_short_link_resolution = true;
  shortLinkResolutionCache.clear();
  context.fetch = () =>
    new Promise((resolve) => {
      releaseFetch = () =>
        resolve({
          ok: true,
          json: async () => ({
            version: 1,
            canonicalUrl: "https://example.com/not-bilibili",
          }),
        });
    });

  try {
    const [candidate] = collectVisibleUrlCandidates(fixture.cooked, []);
    const pending = replaceCandidateGroup([candidate], new WeakMap());

    assert.equal(fixture.anchor.dataset.bilibiliInlinePlayer, "processing");
    assert.equal(fixture.paragraph.dataset.bilibiliInlinePlayer, "processing");
    assert.equal(collectVisibleUrlCandidates(fixture.cooked, []).length, 0);

    releaseFetch();
    await pending;

    assert.equal(fixture.anchor.dataset.bilibiliInlinePlayer, "done");
    assert.equal(fixture.paragraph.dataset.bilibiliInlinePlayer, "done");
  } finally {
    shortLinkResolutionCache.clear();
    delete themeSettings.enable_short_link_resolution;
    context.fetch = originalFetch;
  }
});

test("preserves insertion order and prevents duplicate cards on re-decoration", () => {
  const firstUrl = "https://www.bilibili.com/video/BV1xx411c7mD";
  const secondUrl = "https://www.bilibili.com/video/BV1xx411c7mE";
  const inserted = [];
  const paragraph = {
    children: [],
    dataset: {},
    insertAdjacentElement(_position, element) {
      inserted.push(element.name);
    },
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === "a[href]" ? [first, second] : []),
  };
  const makeAnchor = (href) => ({
    dataset: {},
    href,
    parentElement: paragraph,
    textContent: href,
    closest: (selector) => (selector === "p" ? paragraph : null),
  });
  const first = makeAnchor(firstUrl);
  const second = makeAnchor(secondUrl);
  paragraph.children = [
    first,
    { parentElement: paragraph, tagName: "BR" },
    second,
  ];
  const cooked = {
    querySelectorAll: (selector) => (selector === "p a[href]" ? [first, second] : []),
  };
  const candidates = collectVisibleUrlCandidates(cooked, []);
  const cursors = new WeakMap();
  const firstReplacement = {
    name: "first",
    insertAdjacentElement(_position, element) {
      inserted.push(element.name);
    },
  };
  const secondReplacement = { name: "second" };

  placeCandidateReplacement(candidates[0], firstReplacement, cursors);
  placeCandidateReplacement(candidates[1], secondReplacement, cursors);

  assert.deepEqual(inserted, ["first", "second"]);
  assert.equal(first.dataset.bilibiliInlinePlayer, "done");
  assert.equal(second.dataset.bilibiliInlinePlayer, "done");
  assert.equal(paragraph.dataset.bilibiliInlinePlayer, "done");
  assert.equal(collectVisibleUrlCandidates(cooked, []).length, 0);
});

test("visible URL matching preserves code, navigation anchors, PDFs, and mismatches", () => {
  const navigation = makeCookedParagraphFixture({
    before: "导航：",
    extraLinks: [
      { href: "https://www.bilibili.com/video/BV1xx411c7mE", text: "下一项" },
    ],
    url: "https://www.bilibili.com/video/BV1xx411c7mD",
  });
  assert.equal(collectVisibleUrlCandidates(navigation.cooked, []).length, 0);

  const titled = makeCookedParagraphFixture({
    anchorText: "推荐视频",
    before: "来源：",
    url: "https://www.bilibili.com/video/BV1xx411c7mD",
  });
  assert.equal(collectVisibleUrlCandidates(titled.cooked, []).length, 0);

  const mismatch = makeCookedParagraphFixture({
    anchorText: "https://www.bilibili.com/video/BV1xx411c7mE",
    before: "来源：",
    url: "https://www.bilibili.com/video/BV1xx411c7mD",
  });
  assert.equal(collectVisibleUrlCandidates(mismatch.cooked, []).length, 0);

  const pdf = makeCookedParagraphFixture({
    before: "附件：",
    url: "https://www.marxists.org/chinese/example/document.pdf",
  });
  assert.equal(collectVisibleUrlCandidates(pdf.cooked, []).length, 0);

  const code = makeCookedParagraphFixture({
    before: "示例：",
    url: "https://www.bilibili.com/video/BV1xx411c7mD",
  });
  const originalClosest = code.anchor.closest;
  code.anchor.closest = (selector) =>
    selector.startsWith("pre, code") ? {} : originalClosest(selector);
  assert.equal(collectVisibleUrlCandidates(code.cooked, []).length, 0);

  const plainCodeBlock = {
    dataset: {},
    textContent: "const source = 'https://www.bilibili.com/video/BV1xx411c7mD';",
    querySelector: (selector) => (selector.includes("code") ? {} : null),
  };
  const cookedCode = {
    querySelectorAll: (selector) => (selector === "p" ? [plainCodeBlock] : []),
  };
  assert.equal(collectEmbedTextCandidates(cookedCode, []).length, 0);
});

test("keeps Marxists visible URLs out of active media, lists, blockquotes, and code", () => {
  const url = "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm";
  const mediaContext = makeCookedParagraphFixture({
    anchorClass: "onebox",
    before: "来源：",
    hasMedia: true,
    lineBreakBeforeAnchor: true,
    url,
  });
  const listContext = makeCookedParagraphFixture({
    anchorClass: "onebox",
    before: "来源：",
    inList: true,
    lineBreakBeforeAnchor: true,
    url,
  });
  const blockquoteContext = makeCookedParagraphFixture({
    anchorClass: "onebox",
    before: "来源：",
    inBlockquote: true,
    url,
  });
  const codeContext = makeCookedParagraphFixture({ before: "示例：", url });
  const originalClosest = codeContext.anchor.closest;
  codeContext.anchor.closest = (selector) =>
    selector.startsWith("pre, code") ? {} : originalClosest(selector);

  assert.equal(collectVisibleUrlCandidates(mediaContext.cooked, []).length, 0);
  assert.equal(collectVisibleUrlCandidates(listContext.cooked, []).length, 0);
  assert.equal(collectVisibleUrlCandidates(blockquoteContext.cooked, []).length, 0);
  assert.equal(collectVisibleUrlCandidates(codeContext.cooked, []).length, 0);
});

test("documents route through the shared expand-reader service, media does not", () => {
  const document = parseBilibiliUrl("https://www.marxists.org/archive/trotsky/1930/hrr/index.htm");
  const audio = parseBilibiliUrl("https://www.marxists.org/archive/kollonta/audio/to-the-workers.mp3");
  const download = parseBilibiliUrl("https://www.marxists.org/ebooks/marx/capital.epub");

  assert.equal(supportsExpandReader(document), true);
  assert.equal(supportsExpandReader(audio), false, "audio already plays natively");
  assert.equal(supportsExpandReader(download), false, "a download has no reading view");
  const zhihu = parseBilibiliUrl("https://www.zhihu.com/question/123");

  assert.equal(supportsExpandReader(zhihu), true, "Zhihu uses summary-only reader output");
  assert.equal(getFooterMeta(zhihu), "知乎官方摘要经 BDFZ 阅读服务展开 · 完整内容请打开原文");

  themeSettings.enable_zhihu_summary = false;
  assert.equal(supportsExpandReader(zhihu), false);
  assert.equal(getFooterMeta(zhihu), "知乎原文卡片");
  delete themeSettings.enable_zhihu_summary;
});

test("WeChat uses only the exact operator archive endpoint and defaults to full-text mode", () => {
  const parsed = parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123");

  assert.equal(supportsWeChatArchive(parsed), true);
  assert.equal(getWeChatIngestEndpoint(), "https://wx.bdfz.net/api/ingest");
  assert.equal(
    getFooterMeta(parsed),
    "经 wx.bdfz.net 转换并默认展开全文 · 保留微信原文"
  );

  themeSettings.enable_wechat_inline = false;
  assert.equal(supportsWeChatArchive(parsed), false);
  assert.equal(getFooterMeta(parsed), "微信原文卡片");
  delete themeSettings.enable_wechat_inline;

  for (const endpoint of [
    "http://wx.bdfz.net/api/ingest",
    "https://wx.bdfz.net.evil.example/api/ingest",
    "https://user:pass@wx.bdfz.net/api/ingest",
    "https://wx.bdfz.net:444/api/ingest",
    "https://wx.bdfz.net/api/other",
    "https://wx.bdfz.net/api/ingest?refresh=1",
  ]) {
    themeSettings.wechat_ingest_endpoint = endpoint;
    assert.equal(getWeChatIngestEndpoint(), "", endpoint);
    assert.equal(supportsWeChatArchive(parsed), false, endpoint);
  }
  delete themeSettings.wechat_ingest_endpoint;
});

test("WeChat archive responses require an exact source echo and wx.bdfz.net slug", () => {
  const parsed = parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123");
  const exact = {
    ok: true,
    url: "https://wx.bdfz.net/fixture-article",
    slug: "fixture-article",
    title: "测试微信文章",
    orig: parsed.canonicalUrl,
  };

  assert.deepEqual(
    JSON.parse(JSON.stringify(normalizeWeChatArchivePayload(exact, parsed))),
    {
      archiveUrl: "https://wx.bdfz.net/fixture-article",
      slug: "fixture-article",
      title: "测试微信文章",
    }
  );
  assert.equal(normalizeWeChatArchivePayload({ ...exact, ok: false }, parsed), null);
  assert.equal(normalizeWeChatArchivePayload({ ...exact, orig: "" }, parsed), null);
  assert.equal(
    normalizeWeChatArchivePayload(
      { ...exact, orig: "https://mp.weixin.qq.com/s/OtherArticle" },
      parsed
    ),
    null
  );
  assert.equal(
    normalizeWeChatArchivePayload(
      { ...exact, url: "https://wx.bdfz.net.evil.example/fixture-article" },
      parsed
    ),
    null
  );
  assert.equal(
    normalizeWeChatArchivePayload({ ...exact, slug: "other-article" }, parsed),
    null
  );
});

test("WeChat conversion is cached, bounded, and sends no credentials or referrer", async () => {
  const parsed = parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123");
  let calls = 0;
  let requestOptions;

  wechatArchiveCache.clear();
  context.fetch = async (url, options) => {
    calls += 1;
    requestOptions = { url, ...options };
    return {
      ok: true,
      json: async () => ({
        ok: true,
        url: "https://wx.bdfz.net/fixture-article",
        slug: "fixture-article",
        title: "测试微信文章",
        orig: parsed.canonicalUrl,
      }),
    };
  };

  const first = await fetchWeChatArchive(parsed);
  const second = await fetchWeChatArchive(parsed);
  assert.equal(calls, 1);
  assert.equal(first.archiveUrl, "https://wx.bdfz.net/fixture-article");
  assert.equal(second.archiveUrl, first.archiveUrl);
  assert.equal(requestOptions.url, "https://wx.bdfz.net/api/ingest");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.credentials, "omit");
  assert.equal(requestOptions.referrerPolicy, "no-referrer");
  assert.equal(requestOptions.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(requestOptions.body), { url: parsed.canonicalUrl });

  const now = 1000;
  wechatArchiveCache.clear();
  for (let index = 0; index < WECHAT_ARCHIVE_CACHE_MAX_ENTRIES; index += 1) {
    storeWeChatArchive(`key-${index}`, Promise.resolve(index), now);
  }
  assert.equal(wechatArchiveCache.size, WECHAT_ARCHIVE_CACHE_MAX_ENTRIES);
  assert.equal(await getCachedWeChatArchive("key-0", now + 1), 0);
  storeWeChatArchive("new-key", Promise.resolve("new"), now + 1);
  assert.equal(wechatArchiveCache.has("key-0"), true);
  assert.equal(wechatArchiveCache.has("key-1"), false);
  assert.equal(
    getCachedWeChatArchive("key-0", now + WECHAT_ARCHIVE_CACHE_TTL_MS),
    null
  );

  wechatArchiveCache.clear();
  context.fetch = globalThis.fetch;
});

test("failed WeChat conversion is evicted so a later render can retry", async () => {
  const parsed = parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123");
  let calls = 0;

  wechatArchiveCache.clear();
  context.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: false };
    }
    return {
      ok: true,
      json: async () => ({
        ok: true,
        url: "https://wx.bdfz.net/fixture-article",
        slug: "fixture-article",
        title: "测试微信文章",
        orig: parsed.canonicalUrl,
      }),
    };
  };

  assert.equal(await fetchWeChatArchive(parsed), null);
  assert.equal((await fetchWeChatArchive(parsed)).slug, "fixture-article");
  assert.equal(calls, 2);

  wechatArchiveCache.clear();
  context.fetch = globalThis.fetch;
});

test("WeChat conversion polls a pending lease until the archive is ready", async () => {
  const parsed = parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123");
  let calls = 0;

  wechatArchiveCache.clear();
  context.fetch = async () => {
    calls += 1;

    if (calls === 1) {
      return {
        ok: true,
        status: 202,
        headers: { get: () => "0" },
        json: async () => ({ ok: false, pending: true, retryAfter: 0 }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        url: "https://wx.bdfz.net/fixture-article",
        slug: "fixture-article",
        title: "测试微信文章",
        orig: parsed.canonicalUrl,
      }),
    };
  };

  assert.equal((await fetchWeChatArchive(parsed)).slug, "fixture-article");
  assert.equal(calls, 2);
  assert.equal(getWeChatRetryDelayMs({ headers: { get: () => "2" } }, {}), 2000);
  assert.equal(
    getWeChatRetryDelayMs({ headers: { get: () => null } }, { retryAfter: 3 }),
    3000
  );

  wechatArchiveCache.clear();
  context.fetch = globalThis.fetch;
});

test("WeChat conversion retries after one transient request interruption", async () => {
  const parsed = parseBilibiliUrl("https://mp.weixin.qq.com/s/Fixture123");
  const originalSetTimeout = context.window.setTimeout;
  const originalClearTimeout = context.window.clearTimeout;
  let calls = 0;

  wechatArchiveCache.clear();
  context.window.setTimeout = (callback, delay) => {
    if (delay < WECHAT_ARCHIVE_REQUEST_TIMEOUT_MS) {
      callback();
    }
    return 1;
  };
  context.window.clearTimeout = () => {};
  context.fetch = async () => {
    calls += 1;

    if (calls === 1) {
      throw new Error("transient interruption");
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        url: "https://wx.bdfz.net/fixture-article",
        slug: "fixture-article",
        title: "测试微信文章",
        orig: parsed.canonicalUrl,
      }),
    };
  };

  try {
    assert.equal((await fetchWeChatArchive(parsed)).slug, "fixture-article");
    assert.equal(calls, 2);
  } finally {
    wechatArchiveCache.clear();
    context.fetch = globalThis.fetch;
    context.window.setTimeout = originalSetTimeout;
    context.window.clearTimeout = originalClearTimeout;
  }
});

test("Zhihu reader output must remain summary-only and match exact type and ID", () => {
  const parsed = parseBilibiliUrl(
    "https://www.zhihu.com/question/123456/answer/789012"
  );
  const exact = {
    ok: true,
    html: "<p>摘要</p>",
    provider: "zhihu",
    summaryOnly: true,
    contentType: "answer",
    contentId: "789012",
    url: parsed.canonicalUrl,
  };

  assert.equal(isMatchingReaderView(exact, parsed), true);
  assert.equal(isMatchingReaderView({ ...exact, summaryOnly: false }, parsed), false);
  assert.equal(isMatchingReaderView({ ...exact, contentType: "question" }, parsed), false);
  assert.equal(isMatchingReaderView({ ...exact, contentId: "789013" }, parsed), false);
  assert.equal(
    isMatchingReaderView({ ...exact, url: "https://www.zhihu.com/answer/789012" }, parsed),
    false,
    "the Worker must echo the exact canonical source URL"
  );
});

test("short-link resolution derives a same-origin endpoint behind an independent switch", () => {
  assert.equal(getBilibiliShortResolverEndpoint(), "");

  themeSettings.enable_short_link_resolution = true;
  try {
    assert.equal(
      getBilibiliShortResolverEndpoint(),
      "https://reader.bdfz.net/resolve"
    );

    themeSettings.expand_reader_endpoint = "http://localhost:8817/read?ignored=1";
    assert.equal(
      getBilibiliShortResolverEndpoint(),
      "http://localhost:8817/resolve"
    );

    themeSettings.expand_reader_endpoint = "http://reader.example/read";
    assert.equal(getBilibiliShortResolverEndpoint(), "");
  } finally {
    delete themeSettings.enable_short_link_resolution;
    delete themeSettings.expand_reader_endpoint;
  }
});

test("short-link requests share one in-flight fetch and revalidate the response locally", async () => {
  const shortUrl = "https://b23.tv/cUbeWZt";
  const originalFetch = context.fetch;
  let calls = 0;
  let releaseFetch;
  let requestedUrl;
  let requestedOptions;

  shortLinkResolutionCache.clear();
  themeSettings.enable_short_link_resolution = true;
  context.fetch = (url, options) => {
    calls += 1;
    requestedUrl = new URL(url);
    requestedOptions = options;
    return new Promise((resolve) => {
      releaseFetch = () =>
        resolve({
          ok: true,
          json: async () => ({
            version: 1,
            canonicalUrl: "https://www.bilibili.com/video/BV1XntA6eEED?p=1",
          }),
        });
    });
  };

  try {
    const first = fetchBilibiliShortLinkResolution(shortUrl);
    const second = fetchBilibiliShortLinkResolution(shortUrl);

    assert.equal(calls, 1);
    releaseFetch();
    const [firstParsed, secondParsed] = await Promise.all([first, second]);

    assert.equal(firstParsed.canonicalUrl, secondParsed.canonicalUrl);
    assert.equal(
      firstParsed.canonicalUrl,
      "https://www.bilibili.com/video/BV1XntA6eEED"
    );
    assert.equal(firstParsed.page, 1);
    assert.equal(requestedUrl.origin, "https://reader.bdfz.net");
    assert.equal(requestedUrl.pathname, "/resolve");
    assert.equal(requestedUrl.searchParams.get("url"), shortUrl);
    assert.equal(requestedOptions.method, "GET");
    assert.equal(requestedOptions.credentials, "omit");
    assert.equal(requestedOptions.referrerPolicy, "no-referrer");
  } finally {
    shortLinkResolutionCache.clear();
    delete themeSettings.enable_short_link_resolution;
    context.fetch = originalFetch;
  }
});

test("invalid resolver payloads fail open and are evicted for a later retry", async () => {
  const shortUrl = "https://b23.tv/cUbeWZt";
  const originalFetch = context.fetch;
  let calls = 0;

  shortLinkResolutionCache.clear();
  themeSettings.enable_short_link_resolution = true;
  context.fetch = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () =>
        calls === 1
          ? {
              version: 1,
              canonicalUrl: "https://www.douyin.com/video/7026333893087202567",
            }
          : {
              version: 1,
              canonicalUrl: "https://www.bilibili.com/video/BV1XntA6eEED?p=1",
            },
    };
  };

  try {
    assert.equal(await fetchBilibiliShortLinkResolution(shortUrl), null);
    assert.equal(
      (await fetchBilibiliShortLinkResolution(shortUrl)).provider,
      "bilibili"
    );
    assert.equal(calls, 2);
  } finally {
    shortLinkResolutionCache.clear();
    delete themeSettings.enable_short_link_resolution;
    context.fetch = originalFetch;
  }
});

test("short-link resolution cache is endpoint-specific, TTL-bound, and small", () => {
  const key = getShortLinkResolutionCacheKey(
    "https://b23.tv/cUbeWZt",
    "https://reader.bdfz.net/resolve"
  );

  assert.notEqual(
    key,
    getShortLinkResolutionCacheKey(
      "https://b23.tv/cUbeWZt",
      "https://reader-backup.bdfz.net/resolve"
    )
  );
  assert.equal(SHORT_LINK_RESOLUTION_CACHE_TTL_MS, 5 * 60 * 1000);
  assert.equal(SHORT_LINK_RESOLUTION_CACHE_MAX_ENTRIES, 24);

  shortLinkResolutionCache.clear();
  const now = 1000;

  for (let index = 0; index <= SHORT_LINK_RESOLUTION_CACHE_MAX_ENTRIES; index += 1) {
    storeShortLinkResolution(`key-${index}`, Promise.resolve(index), now);
  }

  assert.equal(shortLinkResolutionCache.size, SHORT_LINK_RESOLUTION_CACHE_MAX_ENTRIES);
  assert.equal(shortLinkResolutionCache.has("key-0"), false);

  const fresh = getCachedShortLinkResolution(
    `key-${SHORT_LINK_RESOLUTION_CACHE_MAX_ENTRIES}`,
    now + SHORT_LINK_RESOLUTION_CACHE_TTL_MS - 1
  );
  assert.ok(fresh);
  assert.equal(
    getCachedShortLinkResolution(
      `key-${SHORT_LINK_RESOLUTION_CACHE_MAX_ENTRIES}`,
      now + SHORT_LINK_RESOLUTION_CACHE_TTL_MS
    ),
    null
  );
  shortLinkResolutionCache.clear();
});

test("the reader is skipped when disabled or pointed at a non-HTTPS endpoint", () => {
  const document = parseBilibiliUrl("https://www.marxists.org/archive/trotsky/1930/hrr/index.htm");

  themeSettings.enable_expand_reader = false;
  assert.equal(supportsExpandReader(document), false);
  assert.equal(getFooterMeta(document), "马克思主义文库原文卡片 · 该站禁止页面被外部内嵌");
  delete themeSettings.enable_expand_reader;

  themeSettings.expand_reader_endpoint = "http://reader.example/read";
  assert.equal(supportsExpandReader(document), false, "plaintext endpoints are refused");
  themeSettings.expand_reader_endpoint = "http://localhost:8817/read";
  assert.equal(supportsExpandReader(document), true, "a loopback endpoint is a development affordance");
  themeSettings.expand_reader_endpoint = "not a url";
  assert.equal(supportsExpandReader(document), false);
  themeSettings.expand_reader_endpoint = "https://user:pass@reader.example/read";
  assert.equal(supportsExpandReader(document), false, "endpoint credentials are refused");
  delete themeSettings.expand_reader_endpoint;

  assert.equal(supportsExpandReader(document), true);
});

test("reader cache keys ignore source fragments but remain endpoint-specific", () => {
  const source = "https://www.marxists.org/archive/marx/works/1848/manifesto/index.htm";
  const endpoint = "https://reader.bdfz.net/read";

  assert.equal(
    getReaderCacheKey(`${source}#section-one`, endpoint),
    getReaderCacheKey(`${source}#section-two`, endpoint)
  );
  assert.notEqual(
    getReaderCacheKey(source, endpoint),
    getReaderCacheKey(source, "https://reader-backup.bdfz.net/read")
  );
});

test("reader cache is TTL-bound and uses a small LRU", async () => {
  readerViewCache.clear();
  const now = 1000;

  for (let index = 0; index < READER_CACHE_MAX_ENTRIES; index += 1) {
    storeReaderRequest(`key-${index}`, Promise.resolve(index), now);
  }

  assert.equal(readerViewCache.size, READER_CACHE_MAX_ENTRIES);
  assert.equal(await getCachedReaderRequest("key-0", now + 1), 0, "cache hit refreshes LRU order");
  storeReaderRequest("new-key", Promise.resolve("new"), now + 1);
  assert.equal(readerViewCache.size, READER_CACHE_MAX_ENTRIES);
  assert.equal(readerViewCache.has("key-0"), true);
  assert.equal(readerViewCache.has("key-1"), false, "oldest untouched entry is evicted");

  assert.equal(
    getCachedReaderRequest("key-0", now + READER_CACHE_TTL_MS),
    null,
    "entries expire without extending their original TTL"
  );
  readerViewCache.clear();
});

test("a failed reader fetch is evicted and retried", async () => {
  const source = "https://www.marxists.org/archive/trotsky/1930/hrr/index.htm";
  let calls = 0;

  readerViewCache.clear();
  context.fetch = async () => {
    calls += 1;

    if (calls === 1) {
      return { ok: false };
    }

    return {
      json: async () => ({ html: "<p>recovered</p>", ok: true }),
      ok: true,
    };
  };

  assert.equal(await fetchReaderView(source), null);
  assert.equal((await fetchReaderView(source)).html, "<p>recovered</p>");
  assert.equal(calls, 2);
  readerViewCache.clear();
  context.fetch = globalThis.fetch;
});

test("successful reader fetches share cache across source fragments", async () => {
  const source = "https://www.marxists.org/archive/trotsky/1930/hrr/index.htm";
  let calls = 0;

  readerViewCache.clear();
  context.fetch = async () => {
    calls += 1;
    return {
      json: async () => ({ html: "<p>cached</p>", ok: true }),
      ok: true,
    };
  };

  await fetchReaderView(`${source}#one`);
  await fetchReaderView(`${source}#two`);
  assert.equal(calls, 1);
  readerViewCache.clear();
  context.fetch = globalThis.fetch;
});

test("reader anchors receive pane-scoped fragment IDs and safe outbound attributes", () => {
  const internal = makeAttributeElement({
    href: "#xr-note-1",
    id: "xr-note-1",
    name: "xr-note-1",
    rel: "opener",
    target: "_top",
  });

  hardenReaderAnchor(internal, "bili-reader-7-");
  assert.equal(internal.attributes.get("href"), "#bili-reader-7-xr-note-1");
  assert.equal(internal.attributes.get("id"), "bili-reader-7-xr-note-1");
  assert.equal(internal.attributes.get("name"), "bili-reader-7-xr-note-1");
  assert.equal(internal.attributes.has("target"), false);
  assert.equal(internal.attributes.has("rel"), false);
  assert.equal(getScopedReaderFragment("#xr-note-1", "bili-reader-8-"), "bili-reader-8-xr-note-1");
  assert.equal(
    getScopedReaderFragment("#xr-note%201", "bili-reader-8-"),
    getScopedReaderFragment("xr-note 1", "bili-reader-8-"),
    "encoded fragment references and decoded IDs stay aligned"
  );

  const external = makeAttributeElement({ href: "https://example.org/reference", target: "_top" });
  hardenReaderAnchor(external, "bili-reader-7-");
  assert.equal(external.attributes.get("target"), "_blank");
  assert.equal(external.attributes.get("rel"), "noopener nofollow ugc");

  const active = makeAttributeElement({ href: "javascript:alert(1)" });
  hardenReaderAnchor(active, "bili-reader-7-");
  assert.equal(active.attributes.has("href"), false);
});

test("reader images are same-source HTTPS, lazy, and referrer-free", () => {
  const source = "https://www.marxists.org/archive/marx/index.htm";
  const image = makeAttributeElement({
    loading: "eager",
    referrerpolicy: "unsafe-url",
    src: "http://marxists.org/images/portrait.jpg#tracking",
  });

  assert.equal(hardenReaderImage(image, source), true);
  assert.equal(image.attributes.get("src"), "https://marxists.org/images/portrait.jpg");
  assert.equal(image.attributes.get("loading"), "lazy");
  assert.equal(image.attributes.get("referrerpolicy"), "no-referrer");

  for (const unsafeSource of [
    "https://tracker.example/pixel.gif",
    "https://marxists.org.evil.example/pixel.gif",
    "data:image/png;base64,fixture",
    "https://www.zhihu.com/pixel.gif",
  ]) {
    assert.equal(sanitizeReaderImageUrl(unsafeSource, source), "", unsafeSource);
  }

  const tracker = makeAttributeElement({ src: "https://tracker.example/pixel.gif" });
  assert.equal(hardenReaderImage(tracker, source), false);
  assert.equal(tracker.removed, true);
});
