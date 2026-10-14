// Registers the pinned PPTX renderer under one frozen global so the theme can
// load it with an ordinary module <script> (the pattern already used for the
// ebook reader) and never needs a CDN or dynamic import.
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from "@aiden0z/pptx-renderer/browser";

const api = Object.freeze({
  name: "@aiden0z/pptx-renderer",
  version: "1.3.0",
  PptxViewer,
  RECOMMENDED_ZIP_LIMITS,
});

if (!globalThis.RichEmbedsPptxRenderer) {
  Object.defineProperty(globalThis, "RichEmbedsPptxRenderer", {
    value: api,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}
