import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../javascripts/discourse/api-initializers/init-bilibili-inline-player.js", import.meta.url),
  "utf8"
);

const X_ORIGIN = "https://platform.twitter.com";
const INSTAGRAM_ORIGIN = "https://www.instagram.com";
const X_POST = "https://x.com/BDFZer/status/1234567890123456789";
const INSTAGRAM_POST = "https://www.instagram.com/p/DFxyz123_-/";

// Minimal DOM for exercising the real card, automatic expansion, the iframe
// renderer, and the postMessage bridges. Nothing on the bridge path is stubbed;
// only the host window's timers and message delivery are recorded.
class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.attributes = {};
    this.listeners = {};
    this.parentNode = null;
    this.isConnected = true;
    this.textContent = "";
    this.style = {
      properties: {},
      setProperty(name, value) { this.properties[name] = value; },
    };
    this.classList = {
      add: (name) => { this.className += ` ${name}`; },
      remove: (name) => {
        this.className = this.className.split(/\s+/u).filter((item) => item !== name).join(" ");
      },
    };
    if (this.tagName === "IFRAME") { this.contentWindow = { frame: this }; }
  }
  get childElementCount() { return this.children.length; }
  append(...children) {
    for (const child of children) { child.parentNode = this; this.children.push(child); }
  }
  appendChild(child) { this.append(child); return child; }
  prepend(child) { child.parentNode = this; this.children.unshift(child); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  remove() {
    if (!this.parentNode) { return; }
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  dispatch(name) {
    for (const callback of this.listeners[name] || []) { callback({ type: name, target: this }); }
  }
  querySelectorAll(selector) {
    const matches = (node) => selector.startsWith(".")
      ? node.className.split(/\s+/u).includes(selector.slice(1))
      : node.tagName === selector.toUpperCase();
    return this.children.flatMap((child) => [
      ...(matches(child) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function harness(settings = {}) {
  const timers = [];
  const listeners = {};
  const context = {
    URL, URLSearchParams, JSON, console, settings,
    apiInitializer: (callback) => callback,
    document: { createElement: (tag) => new Element(tag) },
    window: {
      setTimeout(callback, delay) {
        const id = timers.length + 1;
        timers.push({ id, callback, delay, cleared: false, fired: false });
        return id;
      },
      clearTimeout(id) {
        const timer = timers.find((entry) => entry.id === id);
        if (timer) { timer.cleared = true; }
      },
      addEventListener(name, callback) { (listeners[name] ||= []).push(callback); },
      removeEventListener(name, callback) {
        listeners[name] = (listeners[name] || []).filter((entry) => entry !== callback);
      },
      open() {},
    },
  };
  vm.runInNewContext(source
    .replace(/^import \{ apiInitializer \} from "discourse\/lib\/api";\n/u, "")
    .replace("export default apiInitializer((api) => {", "const themeInitializer = apiInitializer((api) => {")
    .concat(`
      globalThis.api = { buildWrapper, parseBilibiliUrl, autoExpandWrapper, wrapperState,
        embedMessageBridges };
    `), context);
  async function card(url) {
    const parsed = context.api.parseBilibiliUrl(url);
    assert.ok(parsed, url);
    const wrapper = context.api.buildWrapper({
      parsed, title: "Bridge fixture", canonicalUrl: parsed.canonicalUrl,
      metaLine: "fixture", environmentRisk: { level: "none" },
    });
    // The card schedules its own automatic expansion on a microtask; wait for
    // it rather than expanding again, exactly as a cooked post would.
    const state = context.api.wrapperState.get(wrapper);
    await state.resolvePromise;
    for (let tick = 0; tick < 10 && !wrapper.querySelector("iframe"); tick += 1) {
      await Promise.resolve();
    }
    const iframe = wrapper.querySelector("iframe");
    const frameWrap = wrapper.querySelector(".bilibili-inline-player__frame-wrap");
    assert.ok(iframe && frameWrap, "automatic expansion rendered the frame");
    return { wrapper, iframe, frameWrap, state };
  }
  // Deliver a message exactly as the host window would: origin, source window, data.
  function post(iframe, data, { origin, source = iframe.contentWindow } = {}) {
    for (const callback of listeners.message || []) { callback({ origin, source, data }); }
  }
  function firePendingTimers() {
    for (const timer of timers) {
      if (!timer.cleared && !timer.fired) { timer.fired = true; timer.callback(); }
    }
  }
  return { ...context.api, card, post, timers, listeners, firePendingTimers };
}

const height = (frameWrap) => frameWrap.style.properties["--bili-frame-height"];
const xReport = (id, method, params = {}) => ({
  "twttr.embed": {
    jsonrpc: "2.0",
    method: `twttr.private.${method}`,
    id,
    params: [{ ...params, data: { tweet_id: "1234567890123456789" } }],
  },
});

test("X: the frame follows every resize report, including those after the ready report", async () => {
  const h = harness();
  const { wrapper, iframe, frameWrap, state } = await h.card(X_POST);
  const id = state.xEmbedId;

  assert.match(id, /^[a-zA-Z0-9-]+$/u);
  assert.equal(height(frameWrap), "420px", "the setting is only the initial height");
  iframe.dispatch("load");

  // X's real order: initialized, results, resize, rendered, then more resizes.
  h.post(iframe, xReport(id, "initialized", { iframe_version: "fixture" }), { origin: X_ORIGIN });
  h.post(iframe, xReport(id, "results"), { origin: X_ORIGIN });
  assert.equal(wrapper.dataset.bilibiliXEmbed, "ready");
  h.post(iframe, xReport(id, "resize", { width: 550, height: 682 }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "682px", "the first resize arrives after results and must still apply");
  assert.equal(wrapper.dataset.bilibiliEmbedHeight, "682");
  h.post(iframe, xReport(id, "rendered"), { origin: X_ORIGIN });
  h.post(iframe, xReport(id, "resize", { width: 360, height: 554 }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "554px", "layout changes keep being followed");
  h.post(iframe, xReport(id, "resize", { width: 550, height: 90000 }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "6000px", "the administrator ceiling bounds a report");
  h.post(iframe, xReport(id, "resize", { width: 550, height: 30 }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "120px", "a report cannot collapse the frame");
  h.post(iframe, xReport(id, "resize", { width: 550, height: "tall" }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "120px", "a malformed report is ignored");

  assert.ok(wrapper.querySelector("iframe"), "the frame stays");
  assert.equal(wrapper.querySelector(".bilibili-inline-player__notice"), null);
  assert.equal(h.timers.filter((timer) => !timer.cleared).length, 0, "no fallback timer is left armed");
  assert.equal(h.embedMessageBridges.size, 1, "the bridge stays attached for the life of the frame");
});

test("X: the ceiling setting is applied to resize reports", async () => {
  const h = harness({ x_embed_max_height: 1000 });
  const { iframe, frameWrap, state } = await h.card(X_POST);

  h.post(iframe, xReport(state.xEmbedId, "resize", { width: 550, height: 2400 }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "1000px");
});

test("X: reports from another origin, another frame, or another embed id are ignored", async () => {
  const h = harness();
  const { iframe, frameWrap, state } = await h.card(X_POST);
  const id = state.xEmbedId;

  h.post(iframe, xReport(id, "resize", { height: 999 }), { origin: "https://platform.twitter.com.evil.example" });
  h.post(iframe, xReport(id, "resize", { height: 999 }), { origin: "https://x.com" });
  h.post(iframe, xReport(id, "resize", { height: 999 }), { origin: X_ORIGIN, source: {} });
  h.post(iframe, xReport("some-other-frame", "resize", { height: 999 }), { origin: X_ORIGIN });
  h.post(iframe, { "twttr.embed": { method: 42 } }, { origin: X_ORIGIN });
  h.post(iframe, "not an object", { origin: X_ORIGIN });
  h.post(iframe, null, { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "420px");

  h.post(iframe, xReport(id, "no_results"), { origin: "https://x.com" });
  assert.ok(iframe.parentNode, "an empty-result report from the wrong origin changes nothing");
});

test("X: no_results removes the frame, keeps the link, explains, and releases the bridge", async () => {
  const h = harness();
  const { wrapper, iframe, frameWrap, state } = await h.card(X_POST);

  iframe.dispatch("load");
  h.post(iframe, xReport(state.xEmbedId, "no_results"), { origin: X_ORIGIN });
  assert.equal(wrapper.dataset.bilibiliXEmbed, "unavailable");
  assert.equal(wrapper.querySelector("iframe"), null);
  assert.match(wrapper.querySelector(".bilibili-inline-player__notice--x").textContent, /已被删除|设为私密|不允许嵌入/u);
  assert.ok(wrapper.querySelector(".bilibili-inline-player__footer-link"), "the original link stays");
  assert.equal(h.embedMessageBridges.size, 0);
  assert.equal(h.timers.filter((timer) => !timer.cleared).length, 0);

  h.post(iframe, xReport(state.xEmbedId, "resize", { height: 700 }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "420px", "a released bridge reads nothing more");
});

test("X: a silent player times out into the source card and later reports are ignored", async () => {
  const h = harness();
  const { wrapper, iframe, frameWrap, state } = await h.card(X_POST);

  assert.equal(h.timers.length, 0, "a lazy frame that has not loaded is never on a countdown");
  iframe.dispatch("load");
  h.post(iframe, xReport(state.xEmbedId, "initialized", { iframe_version: "fixture" }), { origin: X_ORIGIN });
  assert.equal(h.timers.filter((timer) => !timer.cleared).length, 1, "initialized re-arms one countdown");
  assert.equal(h.timers.at(-1).delay, 12000);

  h.firePendingTimers();
  assert.equal(wrapper.dataset.bilibiliXEmbed, "unavailable");
  assert.equal(wrapper.querySelector("iframe"), null);
  assert.match(wrapper.querySelector(".bilibili-inline-player__notice--x").textContent, /未能在当前网络环境加载/u);
  assert.equal(h.embedMessageBridges.size, 0);

  h.post(iframe, xReport(state.xEmbedId, "resize", { height: 700 }), { origin: X_ORIGIN });
  assert.equal(height(frameWrap), "420px");
});

test("X: a ready report cancels the countdown so a slow but rendered post is kept", async () => {
  const h = harness();
  const { wrapper, iframe, state } = await h.card(X_POST);

  iframe.dispatch("load");
  h.post(iframe, xReport(state.xEmbedId, "rendered"), { origin: X_ORIGIN });
  h.firePendingTimers();
  assert.equal(wrapper.dataset.bilibiliXEmbed, "ready");
  assert.ok(wrapper.querySelector("iframe"));
  assert.equal(wrapper.querySelector(".bilibili-inline-player__notice"), null);
});

test("Instagram: the frame follows MEASURE reports and ignores everything else", async () => {
  const h = harness();
  const { wrapper, iframe, frameWrap } = await h.card(INSTAGRAM_POST);

  assert.equal(iframe.src, "https://www.instagram.com/p/DFxyz123_-/embed/captioned/");
  assert.equal(height(frameWrap), "640px");

  h.post(iframe, JSON.stringify({ details: {}, type: "LOADING" }), { origin: INSTAGRAM_ORIGIN });
  h.post(iframe, JSON.stringify({ details: { styles: [] }, type: "MOUNTED" }), { origin: INSTAGRAM_ORIGIN });
  assert.equal(height(frameWrap), "640px");
  h.post(iframe, JSON.stringify({ details: { height: 898 }, type: "MEASURE" }), { origin: INSTAGRAM_ORIGIN });
  assert.equal(height(frameWrap), "898px");
  assert.equal(wrapper.dataset.bilibiliEmbedHeight, "898");
  h.post(iframe, JSON.stringify({ details: { height: 1094 }, type: "MEASURE" }), { origin: INSTAGRAM_ORIGIN });
  assert.equal(height(frameWrap), "1094px", "a later report, such as the caption finishing, is followed");
  h.post(iframe, JSON.stringify({ details: { height: 99999 }, type: "MEASURE" }), { origin: INSTAGRAM_ORIGIN });
  assert.equal(height(frameWrap), "4000px");

  h.post(iframe, JSON.stringify({ details: { height: 700 }, type: "MEASURE" }), { origin: "https://instagram.com" });
  h.post(iframe, JSON.stringify({ details: { height: 700 }, type: "MEASURE" }), { origin: INSTAGRAM_ORIGIN, source: {} });
  h.post(iframe, { details: { height: 700 }, type: "MEASURE" }, { origin: INSTAGRAM_ORIGIN });
  h.post(iframe, "{not json", { origin: INSTAGRAM_ORIGIN });
  h.post(iframe, `{"type":"MEASURE","details":{"height":700},"pad":"${"x".repeat(5000)}"}`, { origin: INSTAGRAM_ORIGIN });
  assert.equal(height(frameWrap), "4000px");
  assert.ok(wrapper.querySelector("iframe"));
});

test("all reporting frames share one window listener and detached frames are pruned", async () => {
  const h = harness();
  const first = await h.card(X_POST);
  const second = await h.card("https://x.com/BDFZer/status/1234567890123456788");
  const third = await h.card(INSTAGRAM_POST);

  assert.equal((h.listeners.message || []).length, 1);
  assert.equal(h.embedMessageBridges.size, 3);
  assert.notEqual(first.state.xEmbedId, second.state.xEmbedId);

  // A cloaked or re-rendered post takes its frame out of the document.
  first.iframe.isConnected = false;
  h.post(second.iframe, xReport(second.state.xEmbedId, "resize", { height: 500 }), { origin: X_ORIGIN });
  assert.equal(height(second.frameWrap), "500px");
  assert.equal(height(first.frameWrap), "420px");
  assert.equal(h.embedMessageBridges.size, 2, "the detached frame's bridge is gone");

  h.post(first.iframe, xReport(first.state.xEmbedId, "resize", { height: 900 }), { origin: X_ORIGIN });
  assert.equal(height(first.frameWrap), "420px");
  h.post(third.iframe, JSON.stringify({ details: { height: 898 }, type: "MEASURE" }), { origin: INSTAGRAM_ORIGIN });
  assert.equal(height(third.frameWrap), "898px");
  assert.equal(height(second.frameWrap), "500px");
});
