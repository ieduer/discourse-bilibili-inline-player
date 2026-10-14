// Office document previews for uploaded attachments. The main initializer
// calls collectDocumentCandidates() and placeDocumentCards() from its cooked
// decorator; everything format- and provider-specific lives in this folder.
import { CARD_CLASS, createDocumentCard } from "./card.js";
import { parseDocumentAttachmentUrl, readAttachmentSizeText } from "./formats.js";
import {
  buildTrustedOrigins,
  evaluateExternalViewer,
  EXTERNAL_VIEWERS,
  parsePublicPrefixes,
  readPostContext,
} from "./policy.js";
import { createPreviewScheduler } from "./worker-client.js";

export const ANCHOR_MARKER = "richEmbedsDocument";
export const WORKER_ASSET = "office_preview_worker";
export const PPTX_RENDERER_ASSET = "pptx_renderer";
export const PPTX_RENDERER_GLOBAL = "RichEmbedsPptxRenderer";

const BYTES_PER_MEBIBYTE = 1024 * 1024;

// Anchors inside these never get a card: quotes repeat another post's
// attachment, and the rest already show a preview of their own.
const EXCLUDED_CONTAINERS = [
  "aside.quote",
  "blockquote",
  ".quote",
  "aside.onebox",
  "article.onebox",
  ".bilibili-inline-player",
  `.${CARD_CLASS}`,
  "[data-bilibili-inline-player]",
  "pre",
  "code",
].join(", ");

function readBoolean(settings, name, fallback) {
  return typeof settings?.[name] === "boolean" ? settings[name] : fallback;
}

function readBoundedInteger(settings, name, fallback, min, max) {
  const value = Number.parseInt(settings?.[name], 10);
  return Math.min(max, Math.max(min, Number.isInteger(value) ? value : fallback));
}

function readString(settings, name, fallback = "") {
  return typeof settings?.[name] === "string" ? settings[name] : fallback;
}

export function readDocumentLimits(settings) {
  const maxFileMb = readBoundedInteger(settings, "office_preview_max_size_mb", 20, 1, 50);

  return {
    maxFileMb,
    maxFileBytes: maxFileMb * BYTES_PER_MEBIBYTE,
    timeoutMs: readBoundedInteger(settings, "office_preview_timeout_seconds", 45, 10, 120) * 1000,
    panelHeight: readBoundedInteger(settings, "office_preview_height", 640, 360, 1200),
    maxConcurrent: 2,
    maxDocumentNodes: 40000,
    worker: {
      maxEntries: 4000,
      maxEntryBytes: 64 * BYTES_PER_MEBIBYTE,
      maxTotalBytes: 160 * BYTES_PER_MEBIBYTE,
      maxSlides: 300,
      maxImages: 300,
      maxImageBytes: 64 * BYTES_PER_MEBIBYTE,
      maxHtmlChars: 8 * BYTES_PER_MEBIBYTE,
      maxSheets: 50,
      maxRows: 1000,
      maxColumns: 100,
      maxCells: 100000,
      maxCellChars: 1000,
      maxMerges: 2000,
    },
  };
}

/**
 * Creates the per-page configuration shared by every card. All browser
 * globals are injectable so the policy can be exercised without a browser.
 */
export function createDocumentPreviewHost({
  settings,
  siteSettings,
  loadThemeModule,
  win = globalThis.window,
  doc = globalThis.document,
}) {
  const limits = readDocumentLimits(settings);
  const setupData = doc?.getElementById?.("data-discourse-setup")?.dataset || {};
  const externalProvider = readString(settings, "office_external_viewer", "disabled");

  return {
    enabled: readBoolean(settings, "enable_office_preview", true),
    document: doc,
    limits,
    trustedOrigins: buildTrustedOrigins({
      pageOrigin: win?.location?.origin,
      setupData,
      extraOrigins: readString(settings, "office_preview_trusted_origins"),
    }),
    externalProvider: EXTERNAL_VIEWERS.includes(externalProvider) ? externalProvider : "disabled",
    publicPrefixes: parsePublicPrefixes(readString(settings, "office_external_viewer_url_prefixes")),
    siteSettings,
    scheduler: createPreviewScheduler(limits.maxConcurrent),
    fetch: win?.fetch?.bind(win),
    Worker: win?.Worker,
    DOMParser: win?.DOMParser,
    URL: win?.URL,
    baseUrl: win?.location?.href || "https://forum.invalid/",
    workerUrl() {
      const value = settings?.theme_uploads_local?.[WORKER_ASSET];
      return typeof value === "string" && value ? value : "";
    },
    loadPptxRenderer() {
      return loadThemeModule(PPTX_RENDERER_ASSET, () => Boolean(win?.[PPTX_RENDERER_GLOBAL])).then(
        () => win[PPTX_RENDERER_GLOBAL]
      );
    },
    cards: new Set(),
  };
}

/**
 * Finds Office attachments in one cooked element. `usedSlots` is the number
 * of previews other collectors already claimed in this post, so the shared
 * max_embeds_per_post limit covers documents too.
 */
export function collectDocumentCandidates(element, { host, limit, usedSlots = 0 }) {
  if (!host?.enabled || !element?.querySelectorAll) {
    return [];
  }

  const results = [];
  // Previews placed by an earlier decoration of this same element count too,
  // so decorating twice can never exceed the per-post limit.
  const alreadyPlaced = element.querySelectorAll(".bilibili-inline-player").length;

  for (const anchor of element.querySelectorAll("a.attachment[href]")) {
    if (alreadyPlaced + usedSlots + results.length >= limit) {
      break;
    }

    if (anchor.dataset?.[ANCHOR_MARKER] || anchor.closest?.(EXCLUDED_CONTAINERS)) {
      continue;
    }

    const attachment = parseDocumentAttachmentUrl(anchor.getAttribute("href"), host.baseUrl);

    if (!attachment) {
      continue;
    }

    // Cards are blocks: after the anchor's paragraph, or directly after the
    // anchor when it is not in one (for example inside a list item).
    results.push({ anchor, attachment, placementTarget: anchor.closest?.("p") || anchor });
  }

  return results;
}

/**
 * Inserts one card per candidate after its paragraph, in source order. The
 * anchor is marked first, so a second decoration of the same element (the
 * composer preview, a re-render) never adds a duplicate card.
 */
export function placeDocumentCards(candidates, { host, helper }) {
  if (candidates.length === 0) {
    return null;
  }

  const context = readPostContext(helper, host.siteSettings);
  const cursors = new Map();
  const placed = [];

  for (const candidate of candidates) {
    candidate.anchor.dataset[ANCHOR_MARKER] = "done";
    const externalDecision =
      host.externalProvider === "disabled"
        ? { allowed: false, reason: "disabled" }
        : evaluateExternalViewer({
            attachment: candidate.attachment,
            provider: host.externalProvider,
            publicPrefixes: host.publicPrefixes,
            context,
          });
    const card = createDocumentCard({
      attachment: candidate.attachment,
      sizeText: readAttachmentSizeText(candidate.anchor),
      host,
      externalDecision,
    });
    const after = cursors.get(candidate.placementTarget) || candidate.placementTarget;

    after.insertAdjacentElement("afterend", card.element);
    cursors.set(candidate.placementTarget, card.element);
    host.cards.add(card);
    placed.push(card);
  }

  return () => {
    for (const card of placed) {
      card.dispose();
      host.cards.delete(card);
    }
  };
}

/** Releases every card whose element has left the document. */
export function disposeDisconnectedCards(host) {
  for (const card of host.cards) {
    if (!card.element.isConnected) {
      card.dispose();
      host.cards.delete(card);
    }
  }
}
