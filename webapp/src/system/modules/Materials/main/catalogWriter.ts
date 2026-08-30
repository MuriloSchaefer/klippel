/**
 * Writing the catalog to SQLite, and filling it from Jazz the first time.
 *
 * Two jobs that share one row-shaping function, deliberately: a row written by
 * `upsertMaterial` and a row projected from a CoValue must be byte-identical,
 * or the migration would silently change data as it moved it.
 *
 * `materials_fts` is maintained here rather than by triggers. A trigger would
 * have to reconstruct the haystack in SQL — duplicating `buildHaystack`, which
 * the renderer also uses — and the two would drift the first time the search
 * surface changed.
 */
import type { Database as Db } from "better-sqlite3";

import { prepare, workspaceDb } from "../../../../../electron/main/db";
import { storageId } from "../../../../../electron/main/db/ids";
import { SQL } from "./queries";
import { haystackForRow } from "./catalogDb";
import type {
  AttributeMap,
  EdgeDTO,
  MaterialDTO,
  MaterialTypeVersionDTO,
  OrgNodeDTO,
  UpdateMaterialInput,
} from "../typings/catalog";

/** JSON-decoded leaf of one attribute, or `undefined`. */
function attributeLeaf(attrs: AttributeMap | undefined, key: string): unknown {
  const attr = attrs?.[key];
  if (!attr || attr.valueJson === undefined) return undefined;
  try {
    return JSON.parse(attr.valueJson);
  } catch {
    return attr.valueJson;
  }
}

/**
 * The searchable fields a material carries in columns rather than in its blob.
 *
 * `nome` and `cor` are attributes, so they are copied out on write. That is a
 * denormalisation and it has the usual cost: a writer that sets attributes
 * without going through here leaves the columns stale.
 */
export function searchableColumns(dto: MaterialDTO): {
  name: string;
  colorLabel: string;
} {
  const nome = attributeLeaf(dto.attributes, "nome");
  const cor = attributeLeaf(dto.attributes, "cor");
  const colorLabel =
    cor && typeof cor === "object"
      ? ((cor as { label?: string }).label ?? (cor as { hex?: string }).hex ?? "")
      : typeof cor === "string"
      ? cor
      : "";
  return {
    name: typeof nome === "string" ? nome : nome == null ? "" : String(nome),
    colorLabel: String(colorLabel ?? ""),
  };
}


const materialParams = (dto: MaterialDTO, industry: string) => {
  const { name, colorLabel } = searchableColumns(dto);
  return {
    // Storage identity is a hash of the domain id; the domain id rides along.
    id: storageId("material", dto.id),
    material_key: dto.id,
    type: dto.type ?? "",
    label: dto.label ?? "",
    external_id: dto.externalId ?? "",
    external_url: dto.externalURL ?? "",
    image_url: dto.imageURL ?? "",
    description: dto.description ?? "",
    schema_version: dto.schemaVersion ?? "",
    name,
    color_label: colorLabel,
    industry,
    stock_amount: dto.stock?.amount ?? 0,
    stock_unit: dto.stock?.unit ?? "",
    pos_x: dto.position?.x ?? 0,
    pos_y: dto.position?.y ?? 0,
    attrs_json: JSON.stringify(dto.attributes ?? {}),
    composition_json: dto.composition ? JSON.stringify(dto.composition) : "",
    caracteristics_json: dto.caracteristics
      ? JSON.stringify(dto.caracteristics)
      : "",
    updated_at: dto.updatedAt ?? Date.now(),
  };
};

/** Rewrite one row's searchable text, addressed by domain key. */
function reindex(db: Db, materialKey: string): void {
  prepare(db, SQL.ftsDeleteRow).run(materialKey);
  const row = prepare(db, SQL.ftsSelectSource).get(materialKey) as
    | {
        name: string;
        color_label: string;
        type: string;
        industry: string;
        external_id: string;
      }
    | undefined;
  if (!row) return;
  prepare(db, SQL.ftsInsertRow).run(materialKey, haystackForRow(row));
}

export interface CatalogWriteInput {
  materials?: MaterialDTO[];
  edges?: EdgeDTO[];
  materialTypes?: MaterialTypeVersionDTO[];
  industries?: OrgNodeDTO[];
  sellers?: OrgNodeDTO[];
}

/**
 * Apply a batch of catalog writes in one transaction.
 *
 * Batched because that is how the catalog is actually written — an import is
 * thousands of rows, a form save is one — and because a partially-applied
 * batch would leave a material without the edges that give it an industry and
 * suppliers, which the renderer reads as a row that lost its relations.
 */
export function writeCatalog(workspace: string, input: CatalogWriteInput): void {
  const db = workspaceDb(workspace).db;
  const upsertMaterial = prepare(db, SQL.upsertMaterial);
  const upsertEdge = prepare(db, SQL.upsertEdge);
  const upsertType = prepare(db, SQL.upsertType);
  const upsertOrg = prepare(db, SQL.upsertOrganization);

  const orgParams = (o: OrgNodeDTO, fallbackType: string) => ({
    id: storageId("organization", o.id),
    org_key: o.id,
    type: o.type || fallbackType,
    label: o.label ?? "",
    name: o.name ?? "",
    country: o.country ?? "",
    contact: o.contact ?? "",
    pos_x: o.position?.x ?? 0,
    pos_y: o.position?.y ?? 0,
    updated_at: o.updatedAt ?? Date.now(),
  });

  // The industry a material shows is its first `manufacturedBy` edge. Read it
  // from the batch when the batch carries it, and fall back to what is already
  // stored — a material can be updated without its edges being resent.
  const industryOf = new Map<string, string>();
  for (const e of input.edges ?? []) {
    if (e.type === "manufacturedBy" && !industryOf.has(e.sourceId)) {
      industryOf.set(e.sourceId, e.targetId);
    }
  }

  db.transaction(() => {
    for (const t of input.materialTypes ?? []) {
      upsertType.run(storageId("materialType", t.id), t.id, t.schemaJson);
    }
    for (const o of input.industries ?? []) upsertOrg.run(orgParams(o, "industry"));
    for (const o of input.sellers ?? []) upsertOrg.run(orgParams(o, "seller"));
    for (const e of input.edges ?? []) {
      upsertEdge.run({
        id: storageId("edge", e.id),
        edge_key: e.id,
        source_id: storageId("material", e.sourceId),
        source_key: e.sourceId,
        type: e.type,
        target_id: e.targetId,
      });
    }

    const lookupIndustry = prepare(db, SQL.selectIndustryEdge);
    for (const m of input.materials ?? []) {
      const industry =
        industryOf.get(m.id) ??
        ((lookupIndustry.get(m.id) as { target_id?: string } | undefined)
          ?.target_id ??
          "");
      upsertMaterial.run(materialParams(m, industry));
      prepare(db, SQL.deleteTombstone).run(m.id);
      reindex(db, m.id);
    }
  })();
}

/**
 * Delete a material and everything that hangs off it, by domain key.
 *
 * Leaves a tombstone: a delta has to be able to report the removal, and a row
 * that is gone cannot report itself (`catalogDelta.ts`).
 */
export function deleteMaterialRow(workspace: string, materialKey: string): void {
  const db = workspaceDb(workspace).db;
  db.transaction(() => {
    // `material_usage` cascades from the FK; the rest is addressed by key.
    prepare(db, SQL.deleteMaterial).run(materialKey);
    prepare(db, SQL.ftsDeleteRow).run(materialKey);
    prepare(db, SQL.deleteMaterialEdges).run(materialKey, materialKey);
    prepare(db, SQL.insertTombstone).run(materialKey, Date.now());
  })();
}

/**
 * Forget a tombstone for an id that exists again.
 *
 * Re-adding a material the user just deleted is an ordinary thing to do, and a
 * stale tombstone would have the next delta tell every client to drop the row
 * they were just given.
 */
export function clearTombstones(workspace: string, keys: string[]): void {
  if (!keys.length) return;
  const db = workspaceDb(workspace).db;
  const stmt = prepare(db, SQL.deleteTombstone);
  db.transaction(() => {
    for (const key of keys) stmt.run(key);
  })();
}

/**
 * Replace the local usage projection.
 *
 * Not replicated: two peers legitimately disagree about which materials *they*
 * use, and the ranking is a local convenience, not shared state. Counts arrive
 * keyed by domain id and are stored against the storage id, so rows the
 * catalog does not hold are dropped rather than violating the foreign key —
 * a model can reference a material this workspace never had.
 */
export function replaceUsage(
  workspace: string,
  counts: Map<string, number> | Record<string, number>,
): void {
  const db = workspaceDb(workspace).db;
  const entries =
    counts instanceof Map ? [...counts.entries()] : Object.entries(counts);
  const insert = prepare(db, SQL.insertUsage);
  db.transaction(() => {
    prepare(db, SQL.clearUsage).run();
    for (const [key, uses] of entries) {
      if (!Number.isFinite(uses) || uses <= 0) continue;
      insert.run(uses, key);
    }
  })();
}

/** Rebuild every row's searchable text — after a bulk projection. */
export function reindexAll(workspace: string): number {
  const db = workspaceDb(workspace).db;
  const rows = prepare(db, SQL.ftsSelectAllSources).all() as Array<{
    material_key: string;
    name: string;
    color_label: string;
    type: string;
    industry: string;
    external_id: string;
  }>;
  const insert = prepare(db, SQL.ftsInsertRow);
  db.transaction(() => {
    prepare(db, SQL.ftsClearAll).run();
    for (const row of rows) insert.run(row.material_key, haystackForRow(row));
  })();
  return rows.length;
}

// ---- store-of-record writes -----------------------------------------
//
// Phase 2: these replace the Jazz write paths rather than mirroring them.
// Each one reproduces the semantics `materials.ts` had, against tables.

/** One material's current row, or `undefined`. */
function materialRow(
  db: Db,
  key: string,
): { id: string; type: string; schema_version: string } | undefined {
  return prepare(db, SQL.selectMaterialMeta).get(key) as
    | { id: string; type: string; schema_version: string }
    | undefined;
}

/**
 * Apply an edit to one material.
 *
 * Mirrors what the Jazz `updateMaterial` did, including the parts that are not
 * field writes: re-pointing `conformsTo` when the type moves, replacing the
 * `manufacturedBy` edge (and clearing it on an empty industry), and replacing
 * the whole `suppliedBy` set. Attribute maps are replaced wholesale, which is
 * what the form submits.
 *
 * Returns `false` when the material does not exist, so callers can report it
 * rather than silently succeeding.
 */
export function applyMaterialUpdate(
  workspace: string,
  input: UpdateMaterialInput,
): boolean {
  const db = workspaceDb(workspace).db;
  const key = input.id;
  const existing = materialRow(db, key);
  if (!existing) return false;

  const patch = input.patch;
  const now = Date.now();

  db.transaction(() => {
    // Every column is bound; NULL means "leave it alone" (see
    // `queries/write/updateMaterialPatch.sql`). That keeps the statement
    // static — no SET clause assembled per call — and makes the empty string
    // a real value, which matters: clearing a material's industry is an edit,
    // not an omission.
    const orNull = <T>(value: T | undefined): T | null =>
      value === undefined ? null : value;
    const searchable =
      patch.attributes !== undefined
        ? searchableColumns({ attributes: patch.attributes } as MaterialDTO)
        : null;

    prepare(db, SQL.updateMaterialPatch).run({
      material_key: key,
      type: orNull(patch.type),
      label: orNull(patch.label),
      external_id: orNull(patch.externalId),
      external_url: orNull(patch.externalURL),
      image_url: orNull(patch.imageURL),
      description: orNull(patch.description),
      schema_version: orNull(patch.schemaVersion),
      // The searchable columns are copied out of `attributes`, so they move
      // with it or the grid and the index disagree with the row.
      name: searchable ? searchable.name : null,
      color_label: searchable ? searchable.colorLabel : null,
      industry: orNull(input.industryId),
      stock_amount: patch.stock ? patch.stock.amount : null,
      stock_unit: patch.stock ? patch.stock.unit : null,
      attrs_json:
        patch.attributes !== undefined ? JSON.stringify(patch.attributes) : null,
      composition_json:
        patch.composition !== undefined
          ? JSON.stringify(patch.composition)
          : null,
      caracteristics_json:
        patch.caracteristics !== undefined
          ? JSON.stringify(patch.caracteristics)
          : null,
      updated_at: now,
    });

    // `conformsTo` follows the type. The target is `type@schemaVersion`, and
    // the version comes from the patch when it carries one, else from the row.
    if (patch.type !== undefined) {
      const version = patch.schemaVersion ?? existing.schema_version;
      prepare(db, SQL.updateConformsTarget).run(
        `${patch.type}@${version}`,
        `conformsTo:${key}`,
      );
    }

    if (input.industryId !== undefined) {
      const edgeKey = `manufacturedBy:${key}`;
      if (input.industryId === "") {
        prepare(db, SQL.deleteEdgeByKey).run(edgeKey);
      } else {
        prepare(db, SQL.insertOrganizationIfAbsent).run(
          storageId("organization", input.industryId),
          input.industryId,
          "industry",
          input.industryId,
          now,
        );
        prepare(db, SQL.upsertEdge).run({
          id: storageId("edge", edgeKey),
          edge_key: edgeKey,
          source_id: existing.id,
          source_key: key,
          type: "manufacturedBy",
          target_id: input.industryId,
        });
      }
    }

    if (input.sellerIds !== undefined) {
      // Replace the set: drop what is there, then write what was asked for.
      prepare(db, SQL.deleteSupplierEdges).run(key);
      for (const sellerId of input.sellerIds) {
        prepare(db, SQL.insertOrganizationIfAbsent).run(
          storageId("organization", sellerId),
          sellerId,
          "seller",
          sellerId,
          now,
        );
        const edgeKey = `suppliedBy:${key}:${sellerId}`;
        prepare(db, SQL.upsertEdge).run({
          id: storageId("edge", edgeKey),
          edge_key: edgeKey,
          source_id: existing.id,
          source_key: key,
          type: "suppliedBy",
          target_id: sellerId,
        });
      }
    }

    reindex(db, key);
  })();
  return true;
}

/** Set a material's stock. Returns `false` when the row is absent. */
export function applyStockUpdate(
  workspace: string,
  id: string,
  stock: { amount: number; unit: string },
): boolean {
  const db = workspaceDb(workspace).db;
  const result = prepare(db, SQL.updateStock).run(
    stock.amount,
    stock.unit,
    Date.now(),
    id,
  );
  return result.changes > 0;
}

/**
 * Register a new type version, and the `succeedsVersion` edge to the one it
 * replaces. Throws on a duplicate, as the Jazz path did — registering a
 * version that exists is a caller bug, not a merge.
 */
export function registerTypeVersion(
  workspace: string,
  input: MaterialTypeVersionDTO & { predecessorId?: string },
): void {
  const db = workspaceDb(workspace).db;
  const exists = prepare(db, SQL.typeExists).get(input.id);
  if (exists) {
    throw new Error(`Material type version "${input.id}" already exists`);
  }
  db.transaction(() => {
    prepare(db, SQL.insertTypeVersion).run(
      storageId("materialType", input.id),
      input.id,
      input.schemaJson,
    );
    if (!input.predecessorId) return;
    if (!prepare(db, SQL.typeExists).get(input.predecessorId)) return;
    const edgeKey = `succeedsVersion:${input.id}`;
    prepare(db, SQL.insertSucceedsEdge).run(
      storageId("edge", edgeKey),
      edgeKey,
      input.id,
      input.predecessorId,
    );
  })();
}

/** True when the catalog holds nothing — the seed path's precondition. */
export function catalogIsEmpty(workspace: string): boolean {
  const db = workspaceDb(workspace).db;
  const materials = prepare(db, SQL.anyMaterial).get();
  const types = prepare(db, SQL.anyType).get();
  return !materials && !types;
}
