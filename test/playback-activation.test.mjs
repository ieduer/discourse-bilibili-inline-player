import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../javascripts/discourse/api-initializers/init-bilibili-inline-player.js", import.meta.url),
  "utf8"
);

// Minimal DOM for exercising the real card, click handler and iframe renderer.
// Network metadata and delayed help are isolated; playback code is not stubbed.
class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.attributes = {};
    this.listeners = {};
    this.style = { setProperty() {} };
    this.classList = {
      add: (name) => { this.className += ` ${name}`; },
      remove: (name) => {
        this.className = this.className.split(/\s+/u).filter((item) => item !== name).join(" ");
      },
    };
  }
  get childElementCount() { return this.children.length; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  prepend(child) { this.children.unshift(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  querySelectorAll(selector) {
    const matches = (node) => selector.startsWith(".")
      ? node.className.split(/\s+/u).includes(selector.slice(1))
      : node.tagName === selector.toUpperCase();
    return this.children.flatMap((child) => [
      ...(matches(child) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  click() { return this.disabled ? undefined : this.listeners.click?.(); }
}

function harness(settings = {}) {
  const createdFrames = [];
  const opened = [];
  const context = {
    URL, URLSearchParams, console, settings,
    apiInitializer: (callback) => callback,
    document: {
      createElement(tag) {
        const element = new Element(tag);
        if (tag === "iframe") { createdFrames.push(element); }
        return element;
      },
    },
    window: { setTimeout() {}, open: (...args) => opened.push(args) },
  };
  vm.runInNewContext(source
    .replace(/^import \{ apiInitializer \} from "discourse\/lib\/api";\n/u, "")
    .replace("export default apiInitializer((api) => {", "const themeInitializer = apiInitializer((api) => {")
    .concat(`
      fetchVideoInfo = async () => { throw new Error("Fixture metadata unavailable"); };
      globalThis.api = { buildWrapper, buildIframeUrl, buildNoAutoplayIframeUrl,
        parseBilibiliUrl, autoExpandWrapper, wrapperState };
    `), context);
  function card(url) {
    const parsed = context.api.parseBilibiliUrl(url);
    assert.ok(parsed, url);
    // A known cid exercises the existing direct-player fallback when metadata
    // is unavailable, without any request to Bilibili in this test suite.
    if (parsed.kind === "video") { parsed.cid ||= "12345"; }
    return context.api.buildWrapper({
      parsed, title: "Playback fixture", canonicalUrl: parsed.canonicalUrl,
      metaLine: "fixture", environmentRisk: { level: "none" },
    });
  }
  return { ...context.api, card, createdFrames, opened };
}

const sources = [
  ["BV video", "https://www.bilibili.com/video/BV1xx411c7mD?p=2"],
  ["AV video", "https://www.bilibili.com/video/av170001"],
  ["player URL", "https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&cid=12345&autoplay=1"],
  ["episode", "https://www.bilibili.com/bangumi/play/ep123456"],
  ["season", "https://www.bilibili.com/bangumi/play/ss12345"],
  ["live room", "https://live.bilibili.com/12345678"],
];

for (const [label, url] of sources) {
  test(`${label}: no player before click with automatic expansion enabled or disabled`, async () => {
    for (const autoExpand of [true, false]) {
      const h = harness({ auto_expand_embeds: autoExpand });
      const wrapper = h.card(url);
      await h.wrapperState.get(wrapper).resolvePromise;
      await Promise.resolve();
      // Also exercise the entry point directly to guard future callers.
      await h.autoExpandWrapper(wrapper);
      assert.equal(h.createdFrames.length, 0);
      const button = wrapper.querySelector(".bilibili-inline-player__play");
      assert.equal(button.tagName, "BUTTON");
      assert.equal(button.type, "button");
      assert.ok(button.attributes["aria-label"]);
      assert.ok(wrapper.querySelector(".bilibili-inline-player__footer-link"));

      await Promise.all([button.click(), button.click()]);
      assert.equal(h.createdFrames.length, 1, "repeated clicks create only one player");
      assert.equal(wrapper.querySelectorAll("iframe").length, 1);
      assert.equal(h.opened.length, 0);
      await h.autoExpandWrapper(wrapper);
      assert.equal(h.createdFrames.length, 1, "automatic expansion cannot reload playback");
    }
  });
}

test("video and bangumi explicitly opt out of autoplay, retaining the source identity", () => {
  for (const [, url] of sources.filter(([label]) => label !== "live room")) {
    const h = harness({ autoplay_on_click: false });
    const parsed = h.parseBilibiliUrl(url);
    const clickedUrl = new URL(h.buildIframeUrl(parsed));
    const retryUrl = new URL(h.buildNoAutoplayIframeUrl(parsed));
    assert.equal(clickedUrl.searchParams.get("autoplay"), "0");
    assert.equal(retryUrl.searchParams.get("autoplay"), "0");
    for (const key of ["bvid", "aid", "cid", "page", "episodeId", "seasonId"]) {
      assert.equal(retryUrl.searchParams.get(key), clickedUrl.searchParams.get(key), key);
    }
  }
});

test("autoplay_on_click=false creates a non-autoplay frame after explicit activation", async () => {
  for (const [, url] of sources.filter(([label]) => label !== "live room")) {
    const h = harness({ autoplay_on_click: false });
    const wrapper = h.card(url);
    await wrapper.querySelector(".bilibili-inline-player__play").click();
    const frame = wrapper.querySelector("iframe");
    assert.equal(new URL(frame.src).searchParams.get("autoplay"), "0");
    assert.equal(frame.allow, "fullscreen; picture-in-picture");
  }
});

test("no-autoplay retry removes permission and keeps identity without creating another frame", async () => {
  const h = harness();
  const wrapper = h.card(sources[0][1]);
  await wrapper.querySelector(".bilibili-inline-player__play").click();
  const frame = wrapper.querySelector("iframe");
  const before = new URL(frame.src);
  assert.equal(before.searchParams.get("autoplay"), "1");
  assert.match(frame.allow, /autoplay/u);
  const retry = wrapper.querySelector(".bilibili-inline-player__retry-button");
  await retry.click();
  const after = new URL(frame.src);
  assert.equal(after.searchParams.get("autoplay"), "0");
  for (const key of ["bvid", "cid", "page"]) {
    assert.equal(after.searchParams.get(key), before.searchParams.get(key));
  }
  assert.equal(frame.allow, "fullscreen; picture-in-picture");
  assert.equal(retry.disabled, true);
  assert.equal(h.createdFrames.length, 1);
});
