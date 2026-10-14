// The initializer is executed in node:vm by several suites. Its ES imports
// cannot run there, so they are removed and the bindings they provide are
// passed into the vm context instead: a stub apiInitializer, and the real
// document-preview functions, which are plain modules without Discourse
// dependencies.
import * as documentPreview from "../../javascripts/discourse/lib/document-preview/index.js";

const IMPORT_STATEMENT_RE = /^import \{[^}]*\} from "[^"]+";\n/gmu;

export function stripInitializerImports(source) {
  return source.replace(IMPORT_STATEMENT_RE, "");
}

export const documentPreviewBindings = Object.freeze({
  collectDocumentCandidates: documentPreview.collectDocumentCandidates,
  createDocumentPreviewHost: documentPreview.createDocumentPreviewHost,
  disposeDisconnectedCards: documentPreview.disposeDisconnectedCards,
  placeDocumentCards: documentPreview.placeDocumentCards,
});
