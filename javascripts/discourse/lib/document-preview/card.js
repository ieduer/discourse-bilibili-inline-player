import { DocumentPreviewError, fetchDocumentBytes } from "./fetch.js";
import { buildMicrosoftViewerUrl, MICROSOFT_VIEWER_ORIGIN } from "./policy.js";
import { renderDocx, renderPptx, renderSpreadsheet } from "./renderers.js";
import {
  ERROR_MESSAGES,
  externalDisclosure,
  FORMAT_LABELS,
  STRINGS,
  tooLargeText,
  UNSUPPORTED_MESSAGES,
} from "./strings.js";
import { runPreviewWorker } from "./worker-client.js";

export const CARD_CLASS = "rich-embeds-document";
export const EXTERNAL_LOAD_TIMEOUT_MS = 30000;
const EXPANDED_ROOT_CLASS = "rich-embeds-document-expanded";
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"]), iframe';

let nextCardId = 1;

function element(doc, tag, className, text) {
  const node = doc.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function button(doc, className, text) {
  const node = element(doc, "button", `btn ${className}`, text);
  node.type = "button";
  return node;
}

function errorMessage(code, host) {
  if (code === "TOO_LARGE") {
    return tooLargeText(host.limits.maxFileMb);
  }

  return ERROR_MESSAGES[code] || ERROR_MESSAGES.PARSE_FAILED;
}

/**
 * Builds one attachment card. The original attachment link in the post is
 * never touched; the card adds a preview action, a download action, and a
 * preview panel that only loads anything after the reader asks for it.
 */
export function createDocumentCard({ attachment, sizeText, host, externalDecision }) {
  const doc = host.document;
  const id = `rich-embeds-doc-${nextCardId++}`;
  const card = element(doc, "div", `bilibili-inline-player ${CARD_CLASS} ${CARD_CLASS}--${attachment.format}`);
  const header = element(doc, "div", `${CARD_CLASS}__header`);
  const badge = element(doc, "span", `${CARD_CLASS}__badge`, attachment.badge);
  const meta = element(doc, "div", `${CARD_CLASS}__meta`);
  const name = element(doc, "div", `${CARD_CLASS}__name`, attachment.filename);
  const detail = element(
    doc,
    "div",
    `${CARD_CLASS}__detail`,
    [FORMAT_LABELS[attachment.format], sizeText].filter(Boolean).join(" · ")
  );
  const actions = element(doc, "div", `${CARD_CLASS}__actions`);
  const previewButton = button(doc, `btn-primary ${CARD_CLASS}__preview`, STRINGS.preview);
  const cancelButton = button(doc, `${CARD_CLASS}__cancel`, STRINGS.cancel);
  const download = element(doc, "a", `btn ${CARD_CLASS}__download`, STRINGS.download);
  const status = element(doc, "div", `${CARD_CLASS}__status`);
  const panel = element(doc, "section", `${CARD_CLASS}__panel`);
  const toolbar = element(doc, "div", `${CARD_CLASS}__toolbar`);
  const toolbarTitle = element(doc, "div", `${CARD_CLASS}__toolbar-title`, attachment.filename);
  const expandButton = button(doc, `${CARD_CLASS}__expand`, STRINGS.expand);
  const closeButton = button(doc, `${CARD_CLASS}__close`, STRINGS.closePreview);
  const notices = element(doc, "div", `${CARD_CLASS}__notices`);
  const viewport = element(doc, "div", `${CARD_CLASS}__viewport`);

  card.id = id;
  card.dataset.richEmbedsDocument = attachment.format;
  card.dataset.richEmbedsDocumentState = "idle";
  // Shared marker: the component's other collectors skip anything inside it.
  card.dataset.bilibiliInlinePlayer = "done";
  card.setAttribute("role", "group");
  card.setAttribute("aria-label", `${FORMAT_LABELS[attachment.format]}：${attachment.filename}`);
  card.style.setProperty("--rich-embeds-document-height", `${host.limits.panelHeight}px`);
  badge.setAttribute("aria-hidden", "true");
  name.title = attachment.filename;
  name.id = `${id}-name`;

  download.href = attachment.url;
  download.setAttribute("download", attachment.filename);
  download.rel = "noopener nofollow";
  download.setAttribute("aria-label", `${STRINGS.download}：${attachment.filename}`);

  previewButton.setAttribute("aria-describedby", name.id);
  previewButton.setAttribute("aria-controls", `${id}-panel`);
  previewButton.setAttribute("aria-expanded", "false");
  cancelButton.hidden = true;

  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  panel.id = `${id}-panel`;
  panel.hidden = true;
  panel.setAttribute("aria-label", `${attachment.filename} 预览`);
  expandButton.setAttribute("aria-pressed", "false");
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", `${attachment.filename} 预览内容`);

  meta.append(name, detail);
  header.append(badge, meta);
  toolbar.append(toolbarTitle, expandButton, closeButton);
  panel.append(toolbar, notices, viewport);
  card.append(header, actions, status, panel);

  let controller = null;
  let rendered = null;
  let expanded = false;
  let disposed = false;
  let lastTrigger = previewButton;
  let externalTimer = null;
  let cancelRequested = false;
  const viewState = { activeSheet: undefined };

  const setState = (state, message = "") => {
    card.dataset.richEmbedsDocumentState = state;
    status.textContent = message;
    const busy = state === "loading" || state === "queued";
    card.setAttribute("aria-busy", String(busy));
    previewButton.disabled = busy;
    cancelButton.hidden = !busy;
  };

  const setExpanded = (value) => {
    expanded = Boolean(value) && !panel.hidden;
    card.classList.toggle(`${CARD_CLASS}--expanded`, expanded);
    doc.documentElement.classList.toggle(EXPANDED_ROOT_CLASS, expanded || anyOtherExpanded());
    expandButton.textContent = expanded ? STRINGS.collapse : STRINGS.expand;
    expandButton.setAttribute("aria-pressed", String(expanded));

    if (expanded) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      closeButton.focus();
    } else {
      panel.removeAttribute("role");
      panel.removeAttribute("aria-modal");
    }
  };

  const anyOtherExpanded = () =>
    Boolean(doc.querySelector(`.${CARD_CLASS}--expanded:not(#${id})`));

  const releaseRendered = () => {
    clearTimeout(externalTimer);
    externalTimer = null;
    rendered?.dispose?.();
    rendered = null;
    viewport.replaceChildren();
    notices.replaceChildren();
  };

  const abortLoading = () => {
    if (controller) {
      controller.abort();
      controller = null;
    }
  };

  const closePanel = ({ restoreFocus = true } = {}) => {
    abortLoading();
    setExpanded(false);
    releaseRendered();
    panel.hidden = true;
    previewButton.hidden = false;
    previewButton.setAttribute("aria-expanded", "false");
    previewButton.textContent = STRINGS.preview;

    if (card.dataset.richEmbedsDocumentState !== "error") {
      setState("idle");
    }

    if (restoreFocus && card.isConnected) {
      lastTrigger?.focus?.();
    }
  };

  const showNotices = (lines) => {
    notices.replaceChildren(
      ...lines.filter(Boolean).map((line) => element(doc, "div", `${CARD_CLASS}__notice`, line))
    );
  };

  // While the panel is open its toolbar owns closing; the card's Preview
  // button returns when the panel closes.
  const openPanel = () => {
    panel.hidden = false;
    previewButton.hidden = true;
    previewButton.setAttribute("aria-expanded", "true");
  };

  async function startLocalPreview() {
    if (disposed || controller) {
      return;
    }

    lastTrigger = previewButton;
    releaseRendered();
    panel.hidden = true;
    const current = new AbortController();
    controller = current;
    let timedOut = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      current.abort();
    }, host.limits.timeoutMs);
    let release = null;

    try {
      if (host.scheduler.active >= host.limits.maxConcurrent) {
        setState("queued", STRINGS.queued);
      } else {
        setState("loading", STRINGS.downloading);
      }

      release = await host.scheduler.acquire(current.signal);
      setState("loading", STRINGS.downloading);
      const bytes = await fetchDocumentBytes(attachment.url, {
        maxBytes: host.limits.maxFileBytes,
        trustedOrigins: host.trustedOrigins,
        signal: current.signal,
        fetchImpl: host.fetch,
      });

      setState("loading", STRINGS.parsing);
      const result = await runPreviewWorker({
        workerUrl: host.workerUrl(),
        format: attachment.format,
        bytes,
        limits: host.limits.worker,
        timeoutMs: host.limits.timeoutMs,
        signal: current.signal,
        WorkerImpl: host.Worker,
      });

      if (current.signal.aborted) {
        throw new DocumentPreviewError("ABORTED");
      }

      openPanel();

      if (attachment.format === "pptx") {
        setState("loading", STRINGS.loadingRenderer);
        rendered = await renderPptx(result, viewport, {
          doc,
          loadRenderer: host.loadPptxRenderer,
          limits: host.limits.worker,
          signal: current.signal,
        });
      } else if (attachment.format === "docx") {
        setState("loading", STRINGS.rendering);
        rendered = renderDocx(result, viewport, {
          doc,
          parser: new host.DOMParser(),
          idPrefix: id,
          maxNodes: host.limits.maxDocumentNodes,
          URLImpl: host.URL,
        });
      } else {
        setState("loading", STRINGS.rendering);
        rendered = renderSpreadsheet(result, viewport, { doc, state: viewState, idPrefix: id });
      }

      if (current.signal.aborted) {
        throw new DocumentPreviewError("ABORTED");
      }

      showNotices(rendered.notices);
      previewButton.textContent = STRINGS.preview;
      setState("ready", STRINGS.ready);
      viewport.focus({ preventScroll: true });
    } catch (error) {
      releaseRendered();
      panel.hidden = true;
      previewButton.hidden = false;
      previewButton.setAttribute("aria-expanded", "false");
      const code = timedOut ? "TIMEOUT" : error?.code || "PARSE_FAILED";

      if (code === "ABORTED") {
        if (!disposed) {
          setState("idle", STRINGS.cancelled);

          // Cancel hides itself, so focus returns to the re-enabled Preview.
          if (cancelRequested) {
            previewButton.focus();
          }
        }
      } else {
        setState("error", errorMessage(code, host));
        card.dataset.richEmbedsDocumentError = code;
        previewButton.textContent = STRINGS.retry;
      }
    } finally {
      clearTimeout(deadline);
      cancelRequested = false;
      release?.();

      if (controller === current) {
        controller = null;
      }
    }
  }

  previewButton.addEventListener("click", () => {
    delete card.dataset.richEmbedsDocumentError;
    void startLocalPreview();
  });
  cancelButton.addEventListener("click", () => {
    cancelRequested = true;
    abortLoading();
  });
  closeButton.addEventListener("click", () => closePanel());
  expandButton.addEventListener("click", () => {
    setExpanded(!expanded);

    if (!expanded) {
      expandButton.focus();
    }
  });

  panel.addEventListener("keydown", (event) => {
    if (!expanded) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setExpanded(false);
      expandButton.focus();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (node) => !node.hidden && node.offsetParent !== null
    );

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (!attachment.supported) {
    setState("unsupported", UNSUPPORTED_MESSAGES[attachment.format] || ERROR_MESSAGES.PARSE_FAILED);
    actions.append(download);
  } else {
    actions.append(previewButton, cancelButton, download);
  }

  if (externalDecision?.allowed) {
    const externalButton = button(doc, `${CARD_CLASS}__external`, STRINGS.externalButton);
    const disclosure = element(doc, "div", `${CARD_CLASS}__disclosure`);
    const disclosureText = element(
      doc,
      "div",
      "",
      externalDisclosure(new URL(attachment.url).host)
    );
    const continueButton = button(doc, `btn-primary ${CARD_CLASS}__external-continue`, STRINGS.externalContinue);
    const dismissButton = button(doc, `${CARD_CLASS}__external-cancel`, STRINGS.cancel);

    disclosure.hidden = true;
    disclosure.id = `${id}-disclosure`;
    externalButton.setAttribute("aria-expanded", "false");
    externalButton.setAttribute("aria-controls", disclosure.id);
    disclosure.append(disclosureText, continueButton, dismissButton);
    actions.append(externalButton);
    card.insertBefore(disclosure, status);

    externalButton.addEventListener("click", () => {
      disclosure.hidden = false;
      externalButton.setAttribute("aria-expanded", "true");
      continueButton.focus();
    });
    dismissButton.addEventListener("click", () => {
      disclosure.hidden = true;
      externalButton.setAttribute("aria-expanded", "false");
      externalButton.focus();
    });
    continueButton.addEventListener("click", () => {
      disclosure.hidden = true;
      externalButton.setAttribute("aria-expanded", "false");
      lastTrigger = externalButton;
      abortLoading();
      releaseRendered();
      openPanel();

      const frame = doc.createElement("iframe");
      frame.className = `${CARD_CLASS}__external-frame`;
      frame.src = buildMicrosoftViewerUrl(attachment.url);
      frame.title = `${attachment.filename}（Microsoft 在线查看器）`;
      frame.loading = "eager";
      frame.referrerPolicy = "no-referrer";
      frame.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      );
      frame.setAttribute("allow", "fullscreen");
      frame.dataset.richEmbedsProvider = new URL(MICROSOFT_VIEWER_ORIGIN).host;
      frame.addEventListener(
        "load",
        () => {
          clearTimeout(externalTimer);
          setState("external", STRINGS.externalLoaded);
        },
        { once: true }
      );
      externalTimer = setTimeout(() => {
        releaseRendered();
        panel.hidden = true;
        previewButton.hidden = false;
        setState("error", STRINGS.externalFailed);
        card.dataset.richEmbedsDocumentError = "EXTERNAL_TIMEOUT";
      }, EXTERNAL_LOAD_TIMEOUT_MS);
      rendered = { dispose() {} };
      viewport.replaceChildren(frame);
      setState("loading", STRINGS.externalLoading);
    });
  }

  return {
    element: card,
    get state() {
      return card.dataset.richEmbedsDocumentState;
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      closePanel({ restoreFocus: false });
    },
  };
}
