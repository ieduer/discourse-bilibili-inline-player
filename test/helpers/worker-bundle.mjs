// Loads the shipped worker asset (not its sources) into a worker-shaped vm
// scope, so tests exercise exactly the bytes Discourse serves.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const bundleUrl = new URL("../../assets/vendor/office-preview-worker.js", import.meta.url);

export const DEFAULT_LIMITS = Object.freeze({
  timeoutMs: 30000,
  maxEntries: 4000,
  maxEntryBytes: 64 * 1024 * 1024,
  maxTotalBytes: 160 * 1024 * 1024,
  maxSlides: 300,
  maxImages: 300,
  maxImageBytes: 64 * 1024 * 1024,
  maxHtmlChars: 8 * 1024 * 1024,
  maxSheets: 50,
  maxRows: 1000,
  maxColumns: 100,
  maxCells: 100000,
  maxCellChars: 1000,
  maxMerges: 2000,
});

export function loadWorkerBundle() {
  const messages = [];
  const scope = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
    setTimeout,
    clearTimeout,
    // A browser worker has its own setImmediate-free event loop; providing the
    // host's setImmediate keeps bundled polyfills from installing listeners.
    setImmediate,
    clearImmediate,
    addEventListener() {},
    removeEventListener() {},
    importScripts() {
      throw new Error("importScripts is not used by the preview worker");
    },
    postMessage(message, transfer = []) {
      // Structured cloning moves the message into the receiving realm, as
      // postMessage does between a worker and its page.
      // Transferring validates the list exactly as a browser does: anything
      // other than a transferable object throws DataCloneError here.
      const transferred = Array.from(transfer, (item) => item?.byteLength);
      messages.push({ message: structuredClone(message, { transfer }), transferred });
    },
  };
  scope.self = scope;
  vm.createContext(scope);
  vm.runInContext(readFileSync(bundleUrl, "utf8"), scope, { filename: bundleUrl.pathname });

  async function request(format, bytes, limits = {}, extra = {}) {
    // Buffers must come from the worker's own realm, as structured cloning
    // would produce in a browser.
    const buffer = vm.runInContext(`new ArrayBuffer(${bytes.byteLength})`, scope);
    new Uint8Array(buffer).set(bytes);
    messages.length = 0;
    await scope.onmessage({
      data: { protocol: 1, id: 7, format, bytes: buffer, limits: { ...DEFAULT_LIMITS, ...limits }, ...extra },
    });
    return messages.at(-1);
  }

  return { scope, request };
}

export function readFixture(name) {
  return new Uint8Array(readFileSync(new URL(`../../fixtures/office/${name}`, import.meta.url)));
}
