/**
 * Pure xlsx → DTO parser for the materials catalog import flow.
 *
 * No Jazz, no Electron, no React — every function takes a workbook (or
 * sheet rows) and returns plain JS data. Lives in the main process
 * because the runner that drives it does, but the functions themselves
 * are testable in isolation.
 */
import * as XLSX from "xlsx";

import type {
  AddMaterialInput,
  AttributeDTO,
  AttributeMap,
  MaterialDTO,
  MaterialTypeVersionDTO,
} from "../../typings/catalog";

export interface ParsedWorkbook {
  types: MaterialTypeVersionDTO[];
  materials: AddMaterialInput[];
  errors: ParseError[];
}

export interface ParseError {
  sheet: string;
  row: number;
  message: string;
}

const MAX_MATERIALS = 50_000;
const MAX_ATTRIBUTES = 200_000;

/** Best-effort JSON parse; returns `undefined` on failure. */
const tryParseJson = <T = unknown>(input: unknown): T | undefined => {
  if (typeof input !== "string" || !input.trim()) return undefined;
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
};

/** Read a sheet as an array of plain row objects. Missing sheet → []. */
const readSheet = <T = Record<string, unknown>>(
  workbook: XLSX.WorkBook,
  name: string,
): T[] => {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: "" });
};

/** Build an `AttributeDTO` leaf from a raw cell, respecting the `kind` column. */
const buildAttribute = (key: string, value: unknown, kind: unknown): AttributeDTO => {
  if (kind === "object") {
    const parsed = tryParseJson(value);
    return { key, valueJson: JSON.stringify(parsed ?? null) };
  }
  if (kind === "number") {
    const n = typeof value === "number" ? value : Number(value);
    return { key, valueJson: JSON.stringify(Number.isFinite(n) ? n : 0) };
  }
  if (kind === "boolean") {
    const b = value === true || value === "true";
    return { key, valueJson: JSON.stringify(b) };
  }
  return { key, valueJson: JSON.stringify(String(value ?? "")) };
};

export const parseMaterialTypesSheet = (
  rows: Array<{
    name?: string;
    label?: string;
    version?: string;
    attributesJson?: string;
    selectorJson?: string;
  }>,
  errors: ParseError[],
): MaterialTypeVersionDTO[] => {
  const out: MaterialTypeVersionDTO[] = [];
  rows.forEach((row, i) => {
    const rowNum = i + 2; // 1-based + header
    const name = String(row.name ?? "").trim();
    const version = String(row.version ?? "").trim();
    if (!name || !version) {
      errors.push({ sheet: "MaterialTypes", row: rowNum, message: "missing name/version" });
      return;
    }
    const attributes = tryParseJson<Record<string, string>>(row.attributesJson);
    if (!attributes) {
      errors.push({ sheet: "MaterialTypes", row: rowNum, message: "invalid attributesJson" });
      return;
    }
    const selector =
      tryParseJson<{ principal: string; extra: string }>(row.selectorJson) ?? {
        principal: Object.keys(attributes)[0] ?? "",
        extra: Object.keys(attributes)[1] ?? "",
      };
    const schemaJson = JSON.stringify({ version, attributes, selector });
    out.push({ id: `${name}@${version}`, schemaJson });
  });
  return out;
};

interface RawMaterialRow {
  id?: string | number;
  type?: string;
  industry?: string;
  externalId?: string;
  externalURL?: string;
  description?: string;
  schemaVersion?: string;
  stockAmount?: string | number;
  stockUnit?: string;
  images?: string;
}

interface RawAttributeRow {
  materialId?: string | number;
  key?: string;
  valueJson?: string;
  kind?: string;
}

interface RawCompositionRow {
  materialId?: string | number;
  component?: string;
  fraction?: string | number;
}

interface RawCaracteristicsRow {
  materialId?: string | number;
  key?: string;
  value?: string;
  kind?: string;
}

interface RawSupplierRow {
  materialId?: string | number;
  supplier?: string;
}

export const parseWorkbook = (buffer: ArrayBuffer): ParsedWorkbook => {
  const errors: ParseError[] = [];
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  } catch (err) {
    errors.push({
      sheet: "(workbook)",
      row: 0,
      message: `failed to read xlsx: ${(err as Error).message ?? String(err)}`,
    });
    return { types: [], materials: [], errors };
  }

  const typeRows = readSheet<{
    name?: string; label?: string; version?: string;
    attributesJson?: string; selectorJson?: string;
  }>(workbook, "MaterialTypes");
  const types = parseMaterialTypesSheet(typeRows, errors);

  const materialRows = readSheet<RawMaterialRow>(workbook, "Materials");
  if (materialRows.length > MAX_MATERIALS) {
    errors.push({
      sheet: "Materials",
      row: 0,
      message: `too many materials: ${materialRows.length} > ${MAX_MATERIALS}`,
    });
    return { types, materials: [], errors };
  }

  const attributeRows = readSheet<RawAttributeRow>(workbook, "Attributes");
  if (attributeRows.length > MAX_ATTRIBUTES) {
    errors.push({
      sheet: "Attributes",
      row: 0,
      message: `too many attribute rows: ${attributeRows.length} > ${MAX_ATTRIBUTES}`,
    });
    return { types, materials: [], errors };
  }
  const compositionRows = readSheet<RawCompositionRow>(workbook, "Composition");
  const caracteristicsRows = readSheet<RawCaracteristicsRow>(workbook, "Caracteristics");
  const supplierRows = readSheet<RawSupplierRow>(workbook, "Suppliers");

  // Index side-sheets by materialId so the assembly loop is O(materials).
  const attributesById = new Map<string, AttributeMap>();
  attributeRows.forEach((row, i) => {
    const id = String(row.materialId ?? "").trim();
    const key = String(row.key ?? "").trim();
    if (!id || !key) {
      errors.push({ sheet: "Attributes", row: i + 2, message: "missing materialId/key" });
      return;
    }
    const bucket = attributesById.get(id) ?? {};
    bucket[key] = buildAttribute(key, row.valueJson, row.kind);
    attributesById.set(id, bucket);
  });

  const compositionById = new Map<string, AttributeMap>();
  compositionRows.forEach((row, i) => {
    const id = String(row.materialId ?? "").trim();
    const component = String(row.component ?? "").trim();
    if (!id || !component) {
      errors.push({ sheet: "Composition", row: i + 2, message: "missing materialId/component" });
      return;
    }
    const fraction = Number(row.fraction ?? 0);
    if (!Number.isFinite(fraction)) {
      errors.push({ sheet: "Composition", row: i + 2, message: "non-numeric fraction" });
      return;
    }
    const bucket = compositionById.get(id) ?? {};
    bucket[component] = { key: component, valueJson: JSON.stringify(fraction) };
    compositionById.set(id, bucket);
  });

  const caracteristicsById = new Map<string, AttributeMap>();
  caracteristicsRows.forEach((row, i) => {
    const id = String(row.materialId ?? "").trim();
    const key = String(row.key ?? "").trim();
    if (!id || !key) {
      errors.push({ sheet: "Caracteristics", row: i + 2, message: "missing materialId/key" });
      return;
    }
    const bucket = caracteristicsById.get(id) ?? {};
    bucket[key] = buildAttribute(key, row.value, row.kind);
    caracteristicsById.set(id, bucket);
  });

  const suppliersById = new Map<string, string[]>();
  supplierRows.forEach((row, i) => {
    const id = String(row.materialId ?? "").trim();
    const supplier = String(row.supplier ?? "").trim();
    if (!id || !supplier) {
      errors.push({ sheet: "Suppliers", row: i + 2, message: "missing materialId/supplier" });
      return;
    }
    const list = suppliersById.get(id) ?? [];
    list.push(supplier);
    suppliersById.set(id, list);
  });

  const materials: AddMaterialInput[] = [];
  const now = Date.now();
  materialRows.forEach((row, i) => {
    const rowNum = i + 2;
    const id = String(row.id ?? "").trim();
    const type = String(row.type ?? "").trim();
    if (!id || !type) {
      errors.push({ sheet: "Materials", row: rowNum, message: "missing id/type" });
      return;
    }
    const schemaVersion = String(row.schemaVersion ?? "").trim() || "0.0.1";
    const typeVersion = `${type}@${schemaVersion}`;
    const stockAmount = Number(row.stockAmount ?? 0);
    const stockUnit = String(row.stockUnit ?? "").trim();
    const industry = String(row.industry ?? "").trim();

    const material: MaterialDTO = {
      id,
      type,
      schemaVersion,
      stock: {
        amount: Number.isFinite(stockAmount) ? stockAmount : 0,
        unit: stockUnit,
      },
      attributes: attributesById.get(id) ?? {},
      composition: compositionById.get(id),
      caracteristics: caracteristicsById.get(id),
      externalId: String(row.externalId ?? "").trim() || undefined,
      externalURL: String(row.externalURL ?? "").trim() || undefined,
      description: String(row.description ?? "").trim() || undefined,
      updatedAt: now,
    };

    materials.push({
      material,
      typeVersion,
      industryId: industry || undefined,
      sellerIds: suppliersById.get(id),
    });
  });

  return { types, materials, errors };
};
