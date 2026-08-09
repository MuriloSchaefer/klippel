/**
 * Main-process Jazz handlers for the Materials catalog.
 *
 * The catalog is persisted as `WorkspaceCoMap.materials` (a
 * `MaterialCatalogCoMap`) where every node, edge, and attribute is its
 * own CoValue. See `Materials/docs/architecture/graph-semantics.md` for
 * the rationale (long-lived shared state, per-attribute CRDT merge, no
 * `EditLease`).
 *
 * Renderer exposure happens via the `window.electron.jazz` IPC surface
 * declared in `electron/preload/jazz.ts`; this file is the
 * authoritative reader/writer of the catalog CoValues.
 */
import {
  AttributeCoMap,
  AttributeRecord,
  EdgeCoMap,
  EdgesRecord,
  MaterialCatalogCoMap,
  MaterialCoMap,
  MaterialsRecord,
  MaterialTypeCoMap,
  MaterialTypesRecord,
  NodePosition,
  OrgNodeCoMap,
  OrgNodesRecord,
  StockCoMap,
} from "../../../../kernel/modules/Store/schema";
import {
  getActiveWorkspace,
  invalidateActiveWorkspaceHandle,
  requireActiveWorkspaceHandle,
} from "../../../../../electron/main/jazz";
import { recordEntry as recordSyncLog } from "../../../../../electron/main/jazzLogBuffer";

/**
 * Per-mutation trace logger. Always pushes into the sync-log ring
 * buffer so the system-tray panel surfaces catalog activity in real
 * time — cojson itself emits very few DEBUG events, so without this
 * tee the panel sits empty during normal operation. Stdout
 * mirroring is gated on `KLIPPEL_MATERIALS_TRACE=1` or
 * `KLIPPEL_JAZZ_DEBUG=1` to avoid log spam in non-diagnostic runs.
 */
const STDOUT_TRACE =
  (process.env.KLIPPEL_MATERIALS_TRACE ?? "") === "1" ||
  (process.env.KLIPPEL_JAZZ_DEBUG ?? "").toLowerCase() === "1" ||
  (process.env.KLIPPEL_JAZZ_DEBUG ?? "").toLowerCase() === "debug";
const trace = (message: string, ...rest: unknown[]): void => {
  const attrs =
    rest.length === 0
      ? undefined
      : rest.length === 1 && typeof rest[0] === "object" && rest[0] !== null
      ? (rest[0] as Record<string, unknown>)
      : { detail: rest };
  recordSyncLog("info", `[materials] ${message}`, attrs);
  if (STDOUT_TRACE) console.log("[materials]", message, ...rest);
};
import type {
  AddMaterialInput,
  AttributeDTO,
  AttributeMap,
  CatalogSnapshot,
  EdgeDTO,
  MaterialDTO,
  MaterialTypeVersionDTO,
  OrgNodeDTO,
  SeedCatalogInput,
  UpdateMaterialInput,
  UpdateMaterialStockInput,
} from "../typings/catalog";

type Owner = Parameters<typeof MaterialCatalogCoMap.create>[1];

type AnyRecord = Record<string, unknown> & {
  $jazz: { set: (k: string, v: unknown) => void; delete?: (k: string) => void };
};

type ResolvedCatalog = {
  materials: AnyRecord;
  materialTypes: AnyRecord;
  industries: AnyRecord;
  sellers: AnyRecord;
  edges: AnyRecord;
  $jazz: { owner: unknown };
};

type ResolvedWorkspace = {
  $jazz: {
    owner: unknown;
    set: (k: string, v: unknown) => void;
    /**
     * Unresolved-ref handles by field name. `refs.materials.id` is the
     * authoritative existence signal for the catalog CoMap: the typed
     * `workspace.materials` accessor only returns a value when the
     * `materials` field is in the workspace handle's `resolve` set,
     * which it isn't — see `requireActiveWorkspaceHandle` in
     * `electron/main/jazz.ts`. Without this we'd see `undefined`
     * every time and clobber the existing catalog with a fresh one.
     */
    refs: { materials?: { id: string } };
  };
  materials: ResolvedCatalog | null | undefined;
};

/**
 * Walk a Jazz `co.record` and yield (key, value) pairs while skipping
 * the `$jazz` symbol-bag that `Object.entries` exposes.
 */
function recordEntries<V>(record: AnyRecord): Array<[string, V]> {
  const out: Array<[string, V]> = [];
  for (const [k, v] of Object.entries(record as Record<string, unknown>)) {
    if (k === "$jazz" || !v || typeof v !== "object") continue;
    out.push([k, v as V]);
  }
  return out;
}

function deleteFromRecord(record: AnyRecord, key: string): void {
  // Jazz exposes deletion via `$jazz.delete` on records; fall back to
  // setting `undefined` if the runtime ever lacks it.
  if (typeof record.$jazz.delete === "function") {
    record.$jazz.delete(key);
    return;
  }
  record.$jazz.set(key, undefined);
}

async function requireWorkspace(): Promise<ResolvedWorkspace> {
  const handle = await requireActiveWorkspaceHandle();
  return handle as unknown as ResolvedWorkspace;
}

// -- Catalog change subscription -------------------------------------
// Renderer-side slices are populated by `loadMaterialsCatalog`, but
// nothing wakes them up when a *remote* peer mutates the catalog over
// sync — peer B would only see peer A's edits on the next workspace
// switch. The wiring below subscribes to the active workspace's
// `MaterialCatalogCoMap` on first listener attach and broadcasts a
// debounced "changed" tick to every listener, which `jazz-hooks.ts`
// fans out to renderers as a `jazz-materials:changed` IPC event.

type CatalogChangeListener = () => void;
const catalogChangeListeners = new Set<CatalogChangeListener>();
let subscribedCatalogId: string | null = null;
let unsubscribeFromCatalog: (() => void) | null = null;
let notifyDebounceTimer: NodeJS.Timeout | null = null;

/**
 * Single deep-resolve shape for the materials catalog. Shared by every
 * caller that needs the full graph in memory:
 *   1. `requireCatalog`'s `MaterialCatalogCoMap.load`.
 *   2. The live `MaterialCatalogCoMap.subscribe` that powers the change
 *      fan-out (see `ensureCatalogSubscription`).
 *   3. The kernel's join / enable-sync preload, via the
 *      `Materials` module config's `syncPreloadResolve` (`./index.ts`).
 *
 * Exported so those three call sites can't drift.
 */
export const materialsCatalogResolve = {
  materials: {
    $each: {
      stock: { $onError: "catch" as const },
      position: { $onError: "catch" as const },
      attributes: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
      composition: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
      caracteristics: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
      $onError: "catch" as const,
    },
    $onError: "catch" as const,
  },
  materialTypes: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
  industries: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
  sellers: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
  edges: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
} as const;

function notifyCatalogChange(): void {
  if (notifyDebounceTimer) return;
  notifyDebounceTimer = setTimeout(() => {
    notifyDebounceTimer = null;
    for (const listener of [...catalogChangeListeners]) {
      try {
        listener();
      } catch (err) {
        console.error("[materials] catalog change listener threw", err);
      }
    }
  }, 150);
}

function ensureCatalogSubscription(catalogId: string): void {
  if (subscribedCatalogId === catalogId && unsubscribeFromCatalog) return;
  unsubscribeFromCatalog?.();
  try {
    unsubscribeFromCatalog = (MaterialCatalogCoMap as unknown as {
      subscribe: (
        id: string,
        options: { resolve: typeof materialsCatalogResolve },
        listener: () => void,
      ) => () => void;
    }).subscribe(catalogId, { resolve: materialsCatalogResolve }, () =>
      notifyCatalogChange(),
    );
    subscribedCatalogId = catalogId;
    trace("ensureCatalogSubscription: attached", { catalogId });
  } catch (err) {
    console.error("[materials] failed to attach catalog subscription", err);
    unsubscribeFromCatalog = null;
    subscribedCatalogId = null;
  }
}

export function dropCatalogSubscription(): void {
  if (notifyDebounceTimer) {
    clearTimeout(notifyDebounceTimer);
    notifyDebounceTimer = null;
  }
  unsubscribeFromCatalog?.();
  unsubscribeFromCatalog = null;
  subscribedCatalogId = null;
}

export function onCatalogChange(listener: CatalogChangeListener): () => void {
  catalogChangeListeners.add(listener);
  return () => {
    catalogChangeListeners.delete(listener);
  };
}

async function requireCatalog(): Promise<{
  workspace: ResolvedWorkspace;
  catalog: ResolvedCatalog;
  owner: Owner;
}> {
  const workspace = await requireWorkspace();
  const owner = workspace.$jazz.owner as Owner;

  // The cached workspace handle resolves `metadata + models +
  // modelSummaries.$each` only — `materials` is not in that resolve
  // set. The typed `workspace.materials` accessor therefore reads
  // `undefined` even when the workspace has had a catalog written to
  // it on a prior call. Reading the unresolved ref through
  // `$jazz.refs.materials` is the authoritative existence signal: if
  // the field has ever been set, `refs.materials.id` is the catalog's
  // coId. Without this branch every IPC call would overwrite the
  // existing catalog with a fresh empty one and wipe state.
  // Bounded wait for the catalog ref to arrive over sync. Joiners
  // who hit `requireCatalog` before peer A's catalog ref has
  // propagated must NOT create their own — that would race-clobber
  // the owner's ref via `workspace.$jazz.set("materials", …)` and
  // produce two divergent `MaterialCatalogCoMap`s with the same
  // workspace pointing at the wrong one. We re-read the live ref a
  // few times before giving up.
  const REF_WAIT_TRIES = 20;
  const REF_WAIT_INTERVAL_MS = 250;
  let materialsRef = workspace.$jazz.refs.materials;
  if (!materialsRef && isJoinerOf(workspace)) {
    trace(
      "requireCatalog: joiner waiting for owner catalog ref to sync",
      { workspaceCoId: (workspace as unknown as { $jazz: { id: string } }).$jazz.id },
    );
    for (let i = 0; i < REF_WAIT_TRIES; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, REF_WAIT_INTERVAL_MS));
      materialsRef = workspace.$jazz.refs.materials;
      if (materialsRef) break;
    }
    if (!materialsRef) {
      trace(
        "requireCatalog: joiner timeout — catalog ref never arrived; refusing to create",
      );
      throw new Error(
        "Materials catalog has not synced from the workspace owner yet; try again in a moment",
      );
    }
  }

  if (materialsRef) {
    // `materialsCatalogResolve` is the single source of truth for the
    // deep-resolve shape — also used by the live `subscribe` below and
    // by the kernel's join / enable-sync preload via the `Materials`
    // module config (`./index.ts`).
    const settled = await MaterialCatalogCoMap.load(materialsRef.id, {
      resolve: materialsCatalogResolve,
    });
    if (!settled || ("$isLoaded" in settled && (settled as { $isLoaded: boolean }).$isLoaded === false)) {
      throw new Error(
        `Could not deep-load materials catalog ${materialsRef.id}`,
      );
    }
    // Note: don't write back to `workspace.materials` — Jazz CoMaps
    // reject direct property assignment ("Cannot update a CoMap
    // directly. Use `$jazz.set` instead."). The ref is already set
    // on the workspace; we just return the deeply-resolved view.
    const catalog = settled as unknown as ResolvedCatalog;
    trace("requireCatalog: reusing existing catalog", {
      catalogCoId: materialsRef.id,
      materials: recordEntries(catalog.materials).length,
      materialTypes: recordEntries(catalog.materialTypes).length,
      edges: recordEntries(catalog.edges).length,
    });
    ensureCatalogSubscription(materialsRef.id);
    return { workspace, catalog, owner };
  }

  // Owner branch: no catalog ref yet, but we authored this workspace
  // so it's safe to create one. Joiners hit the wait+throw branch
  // above instead.
  const created = MaterialCatalogCoMap.create(
    {
      materials: MaterialsRecord.create({}, owner as never) as never,
      materialTypes: MaterialTypesRecord.create({}, owner as never) as never,
      industries: OrgNodesRecord.create({}, owner as never) as never,
      sellers: OrgNodesRecord.create({}, owner as never) as never,
      edges: EdgesRecord.create({}, owner as never) as never,
    },
    owner as never,
  );
  workspace.$jazz.set("materials", created);
  // The cached workspace handle's `$jazz.refs.materials` accessor was
  // captured at resolve time and does not reflect this fresh `$jazz.set`.
  // Without invalidation, every subsequent `requireCatalog` call in the
  // same process re-reads `materialsRef` as `undefined`, re-enters this
  // owner branch, and overwrites the catalog we just wrote — wiping
  // every write made in between (this is exactly what made bare
  // `loadMaterialsCatalog` dispatches after an xlsx import come back
  // empty while the tray's `refreshFromPeers` path worked, since the
  // latter rebuilds the handle from scratch).
  invalidateActiveWorkspaceHandle();
  const catalog = created as unknown as ResolvedCatalog;
  const createdId = (created as { $jazz: { id: string } }).$jazz.id;
  trace("requireCatalog: created fresh catalog (owner)", {
    catalogCoId: createdId,
  });
  ensureCatalogSubscription(createdId);
  return { workspace, catalog, owner };
}

/**
 * True iff the active account is not the workspace's recorded
 * `ownerAccountId`. The metadata field is in the cached workspace
 * handle's resolve set (`requireActiveWorkspaceHandle` resolves
 * `metadata: true`), and the active account id is read off the live
 * Jazz context — both synchronous.
 */
function isJoinerOf(workspace: ResolvedWorkspace): boolean {
  const active = getActiveWorkspace();
  const account = active?.context.account as unknown as
    | { $jazz?: { id?: string } }
    | undefined;
  const accountId = account?.$jazz?.id;
  const ownerAccountId = (workspace as unknown as {
    metadata?: { ownerAccountId?: string };
  }).metadata?.ownerAccountId;
  if (!accountId || !ownerAccountId) return false;
  return accountId !== ownerAccountId;
}

// ---- DTO ↔ CoValue conversion ---------------------------------------

function attributeDtoToCoMap(attr: AttributeDTO, owner: Owner): unknown {
  const childrenRecord =
    attr.children !== undefined
      ? attributeMapToRecord(attr.children, owner)
      : undefined;
  return AttributeCoMap.create(
    {
      key: attr.key,
      valueJson: attr.valueJson,
      children: childrenRecord as never,
    },
    owner as never,
  );
}

function attributeMapToRecord(map: AttributeMap, owner: Owner): unknown {
  const initial: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(map)) {
    initial[k] = attributeDtoToCoMap(v, owner);
  }
  return AttributeRecord.create(initial as never, owner as never);
}

function attributeCoMapToDto(co: AnyRecord): AttributeDTO {
  const out: AttributeDTO = {
    key: (co as unknown as { key: string }).key,
    valueJson: (co as unknown as { valueJson?: string }).valueJson,
  };
  const childrenAny = (co as unknown as { children?: AnyRecord | null }).children;
  if (childrenAny) {
    const map: AttributeMap = {};
    for (const [k, v] of recordEntries<AnyRecord>(childrenAny)) {
      map[k] = attributeCoMapToDto(v);
    }
    out.children = map;
  }
  return out;
}

function attributeRecordToMap(record: AnyRecord | undefined | null): AttributeMap {
  const out: AttributeMap = {};
  if (!record) return out;
  for (const [k, v] of recordEntries<AnyRecord>(record)) {
    out[k] = attributeCoMapToDto(v);
  }
  return out;
}

function materialCoMapToDto(co: AnyRecord): MaterialDTO {
  const m = co as unknown as {
    id: string;
    type: string;
    label?: string;
    position?: { x: number; y: number };
    attributes: AnyRecord;
    stock: { amount: number; unit: string };
    composition?: AnyRecord | null;
    caracteristics?: AnyRecord | null;
    externalId?: string;
    externalURL?: string;
    imageURL?: string;
    description?: string;
    schemaVersion: string;
    updatedAt: number;
  };
  return {
    id: m.id,
    type: m.type,
    label: m.label,
    position: m.position
      ? { x: m.position.x, y: m.position.y }
      : { x: 0, y: 0 },
    attributes: attributeRecordToMap(m.attributes),
    stock: { amount: m.stock.amount, unit: m.stock.unit },
    composition: m.composition
      ? attributeRecordToMap(m.composition)
      : undefined,
    caracteristics: m.caracteristics
      ? attributeRecordToMap(m.caracteristics)
      : undefined,
    externalId: m.externalId,
    externalURL: m.externalURL,
    imageURL: m.imageURL,
    description: m.description,
    schemaVersion: m.schemaVersion,
    updatedAt: m.updatedAt,
  };
}

function orgCoMapToDto(co: AnyRecord): OrgNodeDTO {
  const o = co as unknown as OrgNodeDTO & {
    position?: { x: number; y: number };
  };
  // `position` is a `NodePosition` CoMap proxy on the live view —
  // flatten to plain `{x, y}` so the snapshot survives Electron's
  // structured-clone IPC. Mirrors `materialCoMapToDto`.
  return {
    id: o.id,
    type: o.type,
    label: o.label,
    position: o.position
      ? { x: o.position.x, y: o.position.y }
      : { x: 0, y: 0 },
    name: o.name,
    country: o.country,
    contact: o.contact,
    updatedAt: o.updatedAt,
  };
}

function edgeCoMapToDto(co: AnyRecord): EdgeDTO {
  const e = co as unknown as EdgeDTO;
  return { id: e.id, type: e.type, sourceId: e.sourceId, targetId: e.targetId };
}

function typeCoMapToDto(co: AnyRecord): MaterialTypeVersionDTO {
  const t = co as unknown as MaterialTypeVersionDTO;
  return { id: t.id, schemaJson: t.schemaJson };
}

// ---- public surface --------------------------------------------------

export async function loadMaterialsCatalog(): Promise<CatalogSnapshot> {
  const { catalog } = await requireCatalog();
  const snapshot: CatalogSnapshot = {
    materials: {},
    materialTypes: {},
    industries: {},
    sellers: {},
    edges: {},
  };
  for (const [k, v] of recordEntries<AnyRecord>(catalog.materials)) {
    snapshot.materials[k] = materialCoMapToDto(v);
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.materialTypes)) {
    snapshot.materialTypes[k] = typeCoMapToDto(v);
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.industries)) {
    snapshot.industries[k] = orgCoMapToDto(v);
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.sellers)) {
    snapshot.sellers[k] = orgCoMapToDto(v);
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.edges)) {
    snapshot.edges[k] = edgeCoMapToDto(v);
  }
  return snapshot;
}

/**
 * Resolve a single material by id, O(1) against the catalog record —
 * the scale-safe read path for perf tests and lazy renderer loads.
 * Unlike `loadMaterialsCatalog`, this does not project the whole
 * catalog (which is O(N) and structured-cloned per call), so it stays
 * cheap at 10k/100k materials. Returns `null` when the id is absent.
 * See e2e-tests.md §11.4.
 */
export async function getMaterial(id: string): Promise<MaterialDTO | null> {
  const { catalog } = await requireCatalog();
  const co = catalog.materials[id] as AnyRecord | undefined;
  if (!co) return null;
  return materialCoMapToDto(co);
}

function createMaterialCoValue(dto: MaterialDTO, owner: Owner) {
  return MaterialCoMap.create(
    {
      id: dto.id,
      type: dto.type,
      label: dto.label,
      position: NodePosition.create(
        { x: dto.position?.x ?? 0, y: dto.position?.y ?? 0 },
        owner as never,
      ),
      attributes: attributeMapToRecord(dto.attributes, owner) as never,
      stock: StockCoMap.create(
        { amount: dto.stock.amount, unit: dto.stock.unit },
        owner as never,
      ),
      composition: dto.composition
        ? (attributeMapToRecord(dto.composition, owner) as never)
        : undefined,
      caracteristics: dto.caracteristics
        ? (attributeMapToRecord(dto.caracteristics, owner) as never)
        : undefined,
      externalId: dto.externalId,
      externalURL: dto.externalURL,
      imageURL: dto.imageURL,
      description: dto.description,
      schemaVersion: dto.schemaVersion,
      updatedAt: dto.updatedAt || Date.now(),
    },
    owner as never,
  );
}

function createOrgCoValue(dto: OrgNodeDTO, owner: Owner) {
  return OrgNodeCoMap.create(
    {
      id: dto.id,
      type: dto.type,
      label: dto.label,
      position: NodePosition.create(
        { x: dto.position?.x ?? 0, y: dto.position?.y ?? 0 },
        owner as never,
      ),
      name: dto.name,
      country: dto.country,
      contact: dto.contact,
      updatedAt: dto.updatedAt || Date.now(),
    },
    owner as never,
  );
}

function createEdgeCoValue(dto: EdgeDTO, owner: Owner) {
  return EdgeCoMap.create(
    {
      id: dto.id,
      type: dto.type,
      sourceId: dto.sourceId,
      targetId: dto.targetId,
    },
    owner as never,
  );
}

function createTypeCoValue(dto: MaterialTypeVersionDTO, owner: Owner) {
  return MaterialTypeCoMap.create(
    { id: dto.id, schemaJson: dto.schemaJson },
    owner as never,
  );
}

/**
 * Idempotent cold-start seed. If the catalog already has any material,
 * type, industry, seller, or edge, the seed is treated as already
 * applied and the call is a no-op. Renderer boot fires this once per
 * workspace open so dev workflows keep their fixtures.
 */
export async function seedCatalogIfEmpty(input: SeedCatalogInput): Promise<{
  seeded: boolean;
}> {
  const { catalog, owner } = await requireCatalog();
  const isEmpty =
    recordEntries(catalog.materials).length === 0 &&
    recordEntries(catalog.materialTypes).length === 0 &&
    recordEntries(catalog.industries).length === 0 &&
    recordEntries(catalog.sellers).length === 0 &&
    recordEntries(catalog.edges).length === 0;
  if (!isEmpty) return { seeded: false };

  for (const t of input.materialTypes) {
    catalog.materialTypes.$jazz.set(t.id, createTypeCoValue(t, owner));
  }
  for (const i of input.industries) {
    catalog.industries.$jazz.set(i.id, createOrgCoValue(i, owner));
  }
  for (const s of input.sellers) {
    catalog.sellers.$jazz.set(s.id, createOrgCoValue(s, owner));
  }
  for (const m of input.materials) {
    catalog.materials.$jazz.set(m.id, createMaterialCoValue(m, owner));
  }
  for (const e of input.edges) {
    catalog.edges.$jazz.set(e.id, createEdgeCoValue(e, owner));
  }
  trace(
    "seedCatalogIfEmpty: seeded",
    `materials=${input.materials.length}, types=${input.materialTypes.length}, edges=${input.edges.length}`,
  );
  return { seeded: true };
}

export async function addMaterial(input: AddMaterialInput): Promise<MaterialDTO> {
  const { catalog, owner } = await requireCatalog();
  if (catalog.materials[input.material.id]) {
    throw new Error(`Material "${input.material.id}" already exists`);
  }
  trace("addMaterial", input.material.id, "→ typeVersion=", input.typeVersion);
  const dto: MaterialDTO = {
    ...input.material,
    schemaVersion: input.typeVersion.includes("@")
      ? input.typeVersion.split("@")[1]
      : input.material.schemaVersion,
    updatedAt: Date.now(),
  };
  catalog.materials.$jazz.set(dto.id, createMaterialCoValue(dto, owner));

  // conformsTo
  const conformsId = `conformsTo:${dto.id}`;
  catalog.edges.$jazz.set(
    conformsId,
    createEdgeCoValue(
      {
        id: conformsId,
        type: "conformsTo",
        sourceId: dto.id,
        targetId: input.typeVersion,
      },
      owner,
    ),
  );

  if (input.industryId) {
    if (!catalog.industries[input.industryId]) {
      catalog.industries.$jazz.set(
        input.industryId,
        createOrgCoValue(
          {
            id: input.industryId,
            type: "industry",
            name: input.industryId,
            updatedAt: Date.now(),
          },
          owner,
        ),
      );
    }
    const eid = `manufacturedBy:${dto.id}`;
    catalog.edges.$jazz.set(
      eid,
      createEdgeCoValue(
        {
          id: eid,
          type: "manufacturedBy",
          sourceId: dto.id,
          targetId: input.industryId,
        },
        owner,
      ),
    );
  }

  for (const sellerId of input.sellerIds ?? []) {
    if (!catalog.sellers[sellerId]) {
      catalog.sellers.$jazz.set(
        sellerId,
        createOrgCoValue(
          {
            id: sellerId,
            type: "seller",
            name: sellerId,
            updatedAt: Date.now(),
          },
          owner,
        ),
      );
    }
    const eid = `suppliedBy:${dto.id}:${sellerId}`;
    catalog.edges.$jazz.set(
      eid,
      createEdgeCoValue(
        {
          id: eid,
          type: "suppliedBy",
          sourceId: dto.id,
          targetId: sellerId,
        },
        owner,
      ),
    );
  }
  return dto;
}

export async function updateMaterialStock(
  input: UpdateMaterialStockInput,
): Promise<void> {
  const { catalog } = await requireCatalog();
  const material = catalog.materials[input.id] as unknown as {
    stock: { $jazz: { set: (k: string, v: unknown) => void } };
    $jazz: { set: (k: string, v: unknown) => void };
  } | undefined;
  if (!material) throw new Error(`Material "${input.id}" not found`);
  material.stock.$jazz.set("amount", input.stock.amount);
  material.stock.$jazz.set("unit", input.stock.unit);
  material.$jazz.set("updatedAt", Date.now());
  trace("updateMaterialStock", input.id, input.stock);
}

export async function updateMaterial(input: UpdateMaterialInput): Promise<void> {
  trace("updateMaterial", input.id, Object.keys(input.patch));
  const { catalog, owner } = await requireCatalog();
  const material = catalog.materials[input.id] as unknown as
    | (Record<string, unknown> & {
        $jazz: { set: (k: string, v: unknown) => void };
        stock: { $jazz: { set: (k: string, v: unknown) => void } };
      })
    | undefined;
  if (!material) throw new Error(`Material "${input.id}" not found`);

  const patch = input.patch;
  if (patch.type !== undefined) material.$jazz.set("type", patch.type);
  if (patch.label !== undefined) material.$jazz.set("label", patch.label);
  if (patch.externalId !== undefined)
    material.$jazz.set("externalId", patch.externalId);
  if (patch.externalURL !== undefined)
    material.$jazz.set("externalURL", patch.externalURL);
  if (patch.imageURL !== undefined)
    material.$jazz.set("imageURL", patch.imageURL);
  if (patch.description !== undefined)
    material.$jazz.set("description", patch.description);
  if (patch.schemaVersion !== undefined)
    material.$jazz.set("schemaVersion", patch.schemaVersion);

  if (patch.stock !== undefined) {
    material.stock.$jazz.set("amount", patch.stock.amount);
    material.stock.$jazz.set("unit", patch.stock.unit);
  }

  if (patch.attributes !== undefined) {
    // Replace the whole attribute record. Per-attribute CRDT preservation
    // is a future refinement; the renderer currently submits the full
    // attribute block on every form save.
    material.$jazz.set(
      "attributes",
      attributeMapToRecord(patch.attributes, owner),
    );
  }
  if (patch.composition !== undefined) {
    material.$jazz.set(
      "composition",
      attributeMapToRecord(patch.composition, owner),
    );
  }
  if (patch.caracteristics !== undefined) {
    material.$jazz.set(
      "caracteristics",
      attributeMapToRecord(patch.caracteristics, owner),
    );
  }

  // Re-point conformsTo when the type changes. Identifier is stable
  // (`conformsTo:<materialId>`) so we can just rewrite the edge.
  if (patch.type !== undefined) {
    const conformsId = `conformsTo:${input.id}`;
    const existing = catalog.edges[conformsId] as unknown as
      | { $jazz: { set: (k: string, v: unknown) => void } }
      | undefined;
    const targetVersion =
      patch.schemaVersion !== undefined
        ? `${patch.type}@${patch.schemaVersion}`
        : `${patch.type}@${
            (material as unknown as { schemaVersion: string }).schemaVersion
          }`;
    if (existing) existing.$jazz.set("targetId", targetVersion);
  }

  if (input.industryId !== undefined) {
    const eid = `manufacturedBy:${input.id}`;
    if (input.industryId === "") {
      deleteFromRecord(catalog.edges, eid);
    } else {
      if (!catalog.industries[input.industryId]) {
        catalog.industries.$jazz.set(
          input.industryId,
          createOrgCoValue(
            {
              id: input.industryId,
              type: "industry",
              name: input.industryId,
              updatedAt: Date.now(),
            },
            owner,
          ),
        );
      }
      catalog.edges.$jazz.set(
        eid,
        createEdgeCoValue(
          {
            id: eid,
            type: "manufacturedBy",
            sourceId: input.id,
            targetId: input.industryId,
          },
          owner,
        ),
      );
    }
  }

  if (input.sellerIds !== undefined) {
    // Drop existing suppliedBy edges, then add the new set.
    for (const [k, e] of recordEntries<{ type: string; sourceId: string }>(
      catalog.edges,
    )) {
      if (e.type === "suppliedBy" && e.sourceId === input.id) {
        deleteFromRecord(catalog.edges, k);
      }
    }
    for (const sellerId of input.sellerIds) {
      if (!catalog.sellers[sellerId]) {
        catalog.sellers.$jazz.set(
          sellerId,
          createOrgCoValue(
            {
              id: sellerId,
              type: "seller",
              name: sellerId,
              updatedAt: Date.now(),
            },
            owner,
          ),
        );
      }
      const eid = `suppliedBy:${input.id}:${sellerId}`;
      catalog.edges.$jazz.set(
        eid,
        createEdgeCoValue(
          {
            id: eid,
            type: "suppliedBy",
            sourceId: input.id,
            targetId: sellerId,
          },
          owner,
        ),
      );
    }
  }

  material.$jazz.set("updatedAt", Date.now());
}

export async function deleteMaterial(id: string): Promise<void> {
  const { catalog } = await requireCatalog();
  if (!catalog.materials[id]) return;
  trace("deleteMaterial", id);
  deleteFromRecord(catalog.materials, id);
  for (const [k, e] of recordEntries<{ sourceId: string; targetId: string }>(
    catalog.edges,
  )) {
    if (e.sourceId === id || e.targetId === id) {
      deleteFromRecord(catalog.edges, k);
    }
  }
}

export async function registerMaterialTypeVersion(
  input: MaterialTypeVersionDTO & { predecessorId?: string },
): Promise<void> {
  const { catalog, owner } = await requireCatalog();
  if (catalog.materialTypes[input.id]) {
    throw new Error(`Material type version "${input.id}" already exists`);
  }
  trace("registerMaterialTypeVersion", input.id, "predecessor=", input.predecessorId);
  catalog.materialTypes.$jazz.set(
    input.id,
    createTypeCoValue({ id: input.id, schemaJson: input.schemaJson }, owner),
  );
  if (input.predecessorId && catalog.materialTypes[input.predecessorId]) {
    const eid = `succeedsVersion:${input.id}`;
    catalog.edges.$jazz.set(
      eid,
      createEdgeCoValue(
        {
          id: eid,
          type: "succeedsVersion",
          sourceId: input.id,
          targetId: input.predecessorId,
        },
        owner,
      ),
    );
  }
}
