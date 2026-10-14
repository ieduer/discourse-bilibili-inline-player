import { DocumentPreviewError } from "./fetch.js";
import { sanitizeDocumentHtml, watchRenderedSubtree } from "./sanitize.js";
import { slideCountText, STRINGS, truncatedSheetNotice } from "./strings.js";

const DOCX_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"]);
const MIN_COLUMN_WIDTH = 48;
const MAX_COLUMN_WIDTH = 360;

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

export function columnName(index) {
  let name = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

/** Renders the worker's DOCX conversion. Returns a disposer for blob URLs. */
export function renderDocx(result, viewport, { doc, parser, idPrefix, maxNodes, URLImpl = globalThis.URL }) {
  const imageUrls = [];

  for (const image of result.images || []) {
    if (DOCX_IMAGE_TYPES.has(image?.contentType) && image.buffer instanceof ArrayBuffer) {
      imageUrls.push(URLImpl.createObjectURL(new Blob([image.buffer], { type: image.contentType })));
    } else {
      imageUrls.push(undefined);
    }
  }

  const { fragment, truncated } = sanitizeDocumentHtml(result.html, {
    doc,
    parser,
    imageUrls,
    idPrefix,
    maxNodes,
  });
  const article = element(doc, "article", "rich-embeds-document__docx");
  const notices = [STRINGS.docxNote];

  if (truncated) {
    notices.push(STRINGS.truncatedDocument);
  }

  article.appendChild(fragment);
  viewport.replaceChildren(article);

  return {
    notices,
    dispose() {
      for (const url of imageUrls) {
        if (url) {
          URLImpl.revokeObjectURL(url);
        }
      }

      imageUrls.length = 0;
    },
  };
}

function buildMergeMap(merges) {
  const anchors = new Map();
  const covered = new Set();

  for (const merge of merges || []) {
    const rowSpan = Math.max(1, merge.rowSpan | 0);
    const columnSpan = Math.max(1, merge.columnSpan | 0);
    anchors.set(`${merge.row}:${merge.column}`, { rowSpan, columnSpan });

    for (let row = merge.row; row < merge.row + rowSpan; row += 1) {
      for (let column = merge.column; column < merge.column + columnSpan; column += 1) {
        if (row !== merge.row || column !== merge.column) {
          covered.add(`${row}:${column}`);
        }
      }
    }
  }

  return { anchors, covered };
}

function buildSheetTable(doc, sheet) {
  const table = element(doc, "table", "rich-embeds-document__sheet");
  const colgroup = element(doc, "colgroup");
  const head = element(doc, "thead");
  const headerRow = element(doc, "tr");
  const body = element(doc, "tbody");
  const columnCount = sheet.rows[0]?.length || 0;
  const { anchors, covered } = buildMergeMap(sheet.merges);

  colgroup.appendChild(element(doc, "col", "rich-embeds-document__sheet-index-col"));
  headerRow.appendChild(element(doc, "th", "rich-embeds-document__sheet-corner"));

  for (let column = 0; column < columnCount; column += 1) {
    const col = element(doc, "col");
    const width = sheet.columnWidths?.[column];

    if (width) {
      col.style.width = `${Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width))}px`;
    }

    colgroup.appendChild(col);
    const th = element(doc, "th", "", columnName((sheet.firstColumn || 0) + column));
    th.scope = "col";
    headerRow.appendChild(th);
  }

  head.appendChild(headerRow);

  sheet.rows.forEach((row, rowIndex) => {
    const tr = element(doc, "tr");
    const rowHeader = element(doc, "th", "", String((sheet.firstRow || 0) + rowIndex + 1));
    rowHeader.scope = "row";
    tr.appendChild(rowHeader);

    for (let column = 0; column < row.length; column += 1) {
      const key = `${rowIndex}:${column}`;

      if (covered.has(key)) {
        continue;
      }

      const td = element(doc, "td", "", row[column]);
      const kind = sheet.kinds?.[rowIndex]?.[column];

      if (kind === "n" || kind === "d") {
        td.className = "is-number";
      } else if (kind === "e") {
        td.className = "is-error";
      }

      const span = anchors.get(key);

      if (span) {
        if (span.rowSpan > 1) {
          td.rowSpan = span.rowSpan;
        }

        if (span.columnSpan > 1) {
          td.colSpan = span.columnSpan;
        }
      }

      tr.appendChild(td);
    }

    body.appendChild(tr);
  });

  table.append(colgroup, head, body);
  return table;
}

/**
 * Renders a workbook with one tab per worksheet. The selected sheet is kept
 * in `state.activeSheet`, so closing and reopening the panel, or resizing it
 * into full-screen mode, returns to the same sheet.
 */
export function renderSpreadsheet(result, viewport, { doc, state, idPrefix }) {
  const sheets = (result.sheets || []).filter((sheet) => sheet.state !== "veryHidden");
  const wrapper = element(doc, "div", "rich-embeds-document__workbook");
  const tabs = element(doc, "div", "rich-embeds-document__sheet-tabs");
  const notice = element(doc, "div", "rich-embeds-document__sheet-notice");
  const scroller = element(doc, "div", "rich-embeds-document__sheet-scroller");
  const buttons = [];

  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", STRINGS.sheetTabs);
  scroller.setAttribute("role", "tabpanel");
  scroller.tabIndex = 0;

  if (!Number.isInteger(state.activeSheet) || !sheets[state.activeSheet]) {
    const preferred = result.sheets?.[result.activeSheet];
    const index = preferred ? sheets.indexOf(preferred) : -1;
    state.activeSheet = index >= 0 ? index : 0;
  }

  const show = (index, focus = false) => {
    state.activeSheet = index;
    const sheet = sheets[index];

    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    if (focus) {
      buttons[index]?.focus();
    }

    scroller.setAttribute("aria-labelledby", buttons[index]?.id || "");

    if (!sheet || sheet.kind !== "sheet") {
      notice.textContent = sheet ? STRINGS.chartSheet : "";
      scroller.replaceChildren();
      return;
    }

    if (!sheet.rows.length) {
      notice.textContent = STRINGS.emptySheet;
      scroller.replaceChildren();
      return;
    }

    notice.textContent = truncatedSheetNotice(
      sheet.rows.length,
      sheet.totalRows,
      sheet.rows[0]?.length || 0,
      sheet.totalColumns
    );
    scroller.replaceChildren(buildSheetTable(doc, sheet));
    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;
  };

  sheets.forEach((sheet, index) => {
    const label = sheet.state === "hidden" ? `${sheet.name}（${STRINGS.hiddenSheet}）` : sheet.name;
    const button = element(doc, "button", "rich-embeds-document__sheet-tab", label);
    button.type = "button";
    button.id = `${idPrefix}-sheet-${index}`;
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => show(index));
    buttons.push(button);
    tabs.appendChild(button);
  });

  tabs.addEventListener("keydown", (event) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    const move = keys[event.key];

    if (move === undefined || buttons.length === 0) {
      return;
    }

    event.preventDefault();
    const next =
      move === "first"
        ? 0
        : move === "last"
          ? buttons.length - 1
          : (state.activeSheet + move + buttons.length) % buttons.length;
    show(next, true);
  });

  const notices = [STRINGS.formulaNote];

  if (result.truncatedSheets) {
    notices.push(`工作簿共有 ${result.sheetCount} 个工作表，预览只列出前 ${result.sheets.length} 个。`);
  }

  wrapper.append(tabs, notice, scroller);
  viewport.replaceChildren(wrapper);
  show(state.activeSheet);

  return { notices, dispose() {} };
}

/** Renders a sanitized PPTX package with the pinned, lazily loaded renderer. */
export async function renderPptx(result, viewport, { doc, loadRenderer, limits, signal }) {
  const api = await loadRenderer();

  if (!api?.PptxViewer?.open) {
    throw new DocumentPreviewError("RENDERER_UNAVAILABLE");
  }

  const container = element(doc, "div", "rich-embeds-document__slides");
  viewport.replaceChildren(container);
  const stopWatching = watchRenderedSubtree(container);
  let viewer = null;

  try {
    viewer = await api.PptxViewer.open(result.packageBytes, container, {
      zipLimits: {
        maxEntries: limits.maxEntries,
        maxEntryUncompressedBytes: limits.maxEntryBytes,
        maxTotalUncompressedBytes: limits.maxTotalBytes,
        maxMediaBytes: limits.maxTotalBytes,
        maxConcurrency: 4,
      },
      fitMode: "contain",
      lazyMedia: true,
      lazySlides: true,
      pdfjs: false,
      scrollContainer: viewport,
      listOptions: { windowed: true, initialSlides: 2, batchSize: 2 },
      signal,
    });
  } catch (error) {
    stopWatching();
    container.remove();

    if (signal?.aborted) {
      throw new DocumentPreviewError("ABORTED");
    }

    throw error instanceof DocumentPreviewError ? error : new DocumentPreviewError("PARSE_FAILED");
  }

  return {
    notices: [slideCountText(viewer.slideCount ?? result.slideCount), STRINGS.pptxNote],
    dispose() {
      stopWatching();

      try {
        viewer?.destroy?.();
      } catch {
        // The renderer may already have released its resources.
      }

      viewer = null;
    },
  };
}
