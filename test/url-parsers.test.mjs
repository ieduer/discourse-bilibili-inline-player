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
  buildXiaohongshuPreviewText,
  collectEbookAttachmentCandidates,
  collectEmbedTextCandidates,
  collectIframeCandidates,
  collectXiaohongshuInlineCandidates,
  collectStandaloneCandidates,
  extractUrlsFromText,
  getFooterMeta,
  getInitialButtonLabel,
  getLoadedFrameHeight,
  getMetaLine,
  getOpenLabel,
  getPreviewAspectRatio,
  isKnownInlineKind,
  shouldAutoExpandXiaohongshu,
  shouldAutoExpandEmbed,
  shouldShowDirectSourceLink,
  extractXiaohongshuShareContext,
  parseBilibiliUrl,
  parseEbookAttachmentUrl,
  placeCandidateReplacement,
  sanitizeEbookCss,
};
`);
const context = {
  apiInitializer: (callback) => callback,
  console,
  settings: {},
  URL,
  URLSearchParams,
};

vm.runInNewContext(executableSource, context, {
  filename: initializerUrl.pathname,
});

const {
  buildXiaohongshuPreviewText,
  collectEbookAttachmentCandidates,
  collectEmbedTextCandidates,
  collectIframeCandidates,
  collectXiaohongshuInlineCandidates,
  collectStandaloneCandidates,
  extractUrlsFromText,
  getFooterMeta,
  getInitialButtonLabel,
  getLoadedFrameHeight,
  getMetaLine,
  getOpenLabel,
  getPreviewAspectRatio,
  isKnownInlineKind,
  shouldAutoExpandXiaohongshu,
  shouldAutoExpandEmbed,
  shouldShowDirectSourceLink,
  extractXiaohongshuShareContext,
  parseBilibiliUrl,
  parseEbookAttachmentUrl,
  placeCandidateReplacement,
  sanitizeEbookCss,
} = context.__themeParserTestApi;

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
  };
  const anchor = {
    href: "https://xhslink.cn/o/Fixture123",
    textContent: "https://xhslink.cn/o/Fixture123",
    closest(selector) {
      return selector === "p" ? paragraph : null;
    },
  };
  const cooked = {
    querySelectorAll: (selector) =>
      ["p > a[href]:only-child", "p a[href]"].includes(selector) ? [anchor] : [],
  };
  const standalone = collectStandaloneCandidates(cooked, []);
  const [candidate] = collectXiaohongshuInlineCandidates(
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
    querySelectorAll: (selector) => (selector === "pre, p" ? [block] : []),
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
