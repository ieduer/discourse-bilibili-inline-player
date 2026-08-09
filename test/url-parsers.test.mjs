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
  collectEmbedTextCandidates,
  extractUrlsFromText,
  getFooterMeta,
  getMetaLine,
  getOpenLabel,
  getPreviewAspectRatio,
  isKnownInlineKind,
  parseBilibiliUrl,
  placeCandidateReplacement,
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
  collectEmbedTextCandidates,
  extractUrlsFromText,
  getFooterMeta,
  getMetaLine,
  getOpenLabel,
  getPreviewAspectRatio,
  isKnownInlineKind,
  parseBilibiliUrl,
  placeCandidateReplacement,
} = context.__themeParserTestApi;

test("parses Xiaohongshu note URLs and preserves share parameters", () => {
  const source =
    "https://www.xiaohongshu.com/explore/64f000000000000000000001?xsec_token=fixture_value&xsec_source=pc_feed";
  const parsed = parseBilibiliUrl(source);

  assert.equal(parsed.provider, "xiaohongshu");
  assert.equal(parsed.contentType, "note");
  assert.equal(parsed.noteId, "64f000000000000000000001");
  assert.equal(parsed.canonicalUrl, source);
  assert.equal(isKnownInlineKind(parsed), false);
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

test("uses the current single-argument apiInitializer signature", () => {
  assert.doesNotMatch(initializerSource, /apiInitializer\("1\.8\.0"/u);
  assert.match(initializerSource, /export default apiInitializer\(\(api\) =>/u);
});
