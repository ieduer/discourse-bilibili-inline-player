import { read, utils } from "xlsx";
import { PreviewError } from "./errors.mjs";

const CELL_KIND = { n: "n", s: "s", b: "b", e: "e", d: "d", z: "z" };

function readSheetState(workbook, index) {
  const hidden = Number(workbook.Workbook?.Sheets?.[index]?.Hidden || 0);
  return hidden === 2 ? "veryHidden" : hidden === 1 ? "hidden" : "visible";
}

function cellText(cell, maxCellChars) {
  if (!cell) {
    return "";
  }

  let text;

  if (typeof cell.w === "string") {
    text = cell.w;
  } else if (cell.v === undefined || cell.v === null) {
    text = "";
  } else if (cell.v instanceof Date) {
    text = cell.v.toISOString();
  } else {
    text = String(cell.v);
  }

  return text.length > maxCellChars ? `${text.slice(0, maxCellChars)}…` : text;
}

function decodeRange(value) {
  try {
    return value ? utils.decode_range(value) : null;
  } catch {
    return null;
  }
}

function sheetModel(workbook, name, index, limits, budget, checkDeadline) {
  const sheet = workbook.Sheets[name];
  const state = readSheetState(workbook, index);
  const base = { name: String(name).slice(0, 120), state };

  if (!sheet) {
    return { ...base, kind: "unsupported", rows: [], kinds: [] };
  }

  if (sheet["!type"] === "chart" || sheet["!type"] === "dialog" || sheet["!type"] === "macro") {
    return { ...base, kind: sheet["!type"], rows: [], kinds: [] };
  }

  const range = decodeRange(sheet["!ref"]);
  const fullRange = decodeRange(sheet["!fullref"]) || range;

  if (!range) {
    return { ...base, kind: "sheet", rows: [], kinds: [], totalRows: 0, totalColumns: 0 };
  }

  const firstRow = range.s.r;
  const firstColumn = range.s.c;
  const totalRows = fullRange.e.r - fullRange.s.r + 1;
  const totalColumns = fullRange.e.c - fullRange.s.c + 1;
  const columnCount = Math.min(range.e.c - firstColumn + 1, limits.maxColumns);
  const rowLimit = Math.min(
    range.e.r - firstRow + 1,
    limits.maxRows,
    Math.max(0, Math.floor(budget.remainingCells / Math.max(1, columnCount)))
  );
  const data = sheet["!data"] || [];
  const rows = [];
  const kinds = [];

  for (let rowOffset = 0; rowOffset < rowLimit; rowOffset += 1) {
    if (rowOffset % 256 === 0) {
      checkDeadline();
    }

    const sourceRow = data[firstRow + rowOffset] || [];
    const row = new Array(columnCount);
    let rowKinds = "";

    for (let columnOffset = 0; columnOffset < columnCount; columnOffset += 1) {
      const cell = sourceRow[firstColumn + columnOffset];
      row[columnOffset] = cellText(cell, limits.maxCellChars);
      rowKinds += CELL_KIND[cell?.t] || "z";
    }

    rows.push(row);
    kinds.push(rowKinds);
  }

  budget.remainingCells -= rows.length * columnCount;

  const merges = (sheet["!merges"] || [])
    .filter(
      (merge) =>
        merge.s.r >= firstRow &&
        merge.s.c >= firstColumn &&
        merge.s.r < firstRow + rows.length &&
        merge.s.c < firstColumn + columnCount
    )
    .slice(0, limits.maxMerges)
    .map((merge) => ({
      row: merge.s.r - firstRow,
      column: merge.s.c - firstColumn,
      rowSpan: Math.min(merge.e.r, firstRow + rows.length - 1) - merge.s.r + 1,
      columnSpan: Math.min(merge.e.c, firstColumn + columnCount - 1) - merge.s.c + 1,
    }));

  const columnWidths = [];

  for (let columnOffset = 0; columnOffset < columnCount; columnOffset += 1) {
    const width = Number(sheet["!cols"]?.[firstColumn + columnOffset]?.wpx);
    columnWidths.push(Number.isFinite(width) && width > 0 ? Math.round(width) : 0);
  }

  return {
    ...base,
    kind: "sheet",
    firstRow,
    firstColumn,
    rows,
    kinds,
    merges,
    columnWidths,
    totalRows,
    totalColumns,
    truncatedRows: totalRows > rows.length,
    truncatedColumns: totalColumns > columnCount,
  };
}

/**
 * Reads cached cell values from an XLSX or XLS workbook. Formulas are never
 * evaluated: SheetJS reports the value Excel last saved with the cell.
 */
export function convertWorkbook(bytes, limits, checkDeadline = () => {}) {
  let workbook;

  try {
    workbook = read(bytes, {
      type: "array",
      dense: true,
      sheetRows: limits.maxRows,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      cellText: true,
      cellDates: false,
      bookVBA: false,
      bookFiles: false,
      bookDeps: false,
      WTF: false,
    });
  } catch (error) {
    const message = String(error?.message || "");

    if (/password|encrypt/iu.test(message)) {
      throw new PreviewError("ENCRYPTED", "Password-protected workbook");
    }

    throw new PreviewError("PARSE_FAILED", "The workbook could not be read");
  }

  checkDeadline();

  const names = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames : [];
  const budget = { remainingCells: limits.maxCells };
  const sheets = [];

  for (let index = 0; index < Math.min(names.length, limits.maxSheets); index += 1) {
    sheets.push(sheetModel(workbook, names[index], index, limits, budget, checkDeadline));
  }

  const activeTab = Number(workbook.Workbook?.WBView?.[0]?.activeTab);
  let activeSheet = Number.isInteger(activeTab) && sheets[activeTab]?.state === "visible" ? activeTab : -1;

  if (activeSheet < 0) {
    activeSheet = Math.max(0, sheets.findIndex((sheet) => sheet.state === "visible"));
  }

  return {
    sheets,
    sheetCount: names.length,
    truncatedSheets: names.length > sheets.length,
    activeSheet,
  };
}
