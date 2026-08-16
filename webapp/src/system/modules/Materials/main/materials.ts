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
  CatalogDelta,
  CatalogSnapshot,
  CatalogWindow,
  CatalogWindowRequest,
  EdgeDTO,
  MaterialDTO,
  MaterialTypeVersionDTO,
  OrgNodeDTO,
  SeedCatalogInput,
  UpdateMaterialInput,
  UpdateMaterialStockInput,
} from "../typings/catalog";
import {
  buildHaystack,
  normalizeQuery,
  scoreSubsequence,
} from "../shared/materialSearch";
import { collectMaterialUsage, invalidateMaterialUsage } from "./usage";

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
 *   2. The kernel's join / enable-sync preload, via the
 *      `Materials` module config's `syncPreloadResolve` (`./index.ts`).
 *
 * Exported so those call sites can't drift. The live change subscription
 * deliberately uses the shallower `materialsCatalogChangeResolve` below.
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

/**
 * Resolve shape for the **live change subscription** only.
 *
 * The subscription's job is to answer one question — did anything move? — and
 * that is decidable from the material CoMaps themselves: every mutator bumps
 * `updatedAt` on the material (see `updateMaterial`, `updateMaterialStock`,
 * `addMaterial`), and a peer's write carries the same field over sync. Holding
 * the attribute / composition / caracteristics sub-CoMaps open as well made
 * every catalog change re-validate the whole deep subtree for no added signal
 * (docs/analysis/materials-catalog-lag-analysis.md, F8).
 *
 * The deep shape is still used where the *content* is needed:
 * `requireCatalog`'s load — which `computeCatalogDelta` and
 * `loadMaterialsCatalog` both go through — and the sync preload.
 */
export const materialsCatalogChangeResolve = {
  materials: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
  materialTypes: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
  industries: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
  sellers: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
  edges: { $each: { $onError: "catch" as const }, $onError: "catch" as const },
} as const;

function notifyCatalogChange(): void {
  // Invalidate at *schedule* time, not when the timer fires. A window read
  // issued in the gap between a write and the debounced tick would otherwise
  // rank and search against a pre-write index and answer with rows that no
  // longer match.
  invalidateCatalogIndex();
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
        options: { resolve: typeof materialsCatalogChangeResolve },
        listener: () => void,
      ) => () => void;
    }).subscribe(catalogId, { resolve: materialsCatalogChangeResolve }, () =>
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
  // Shadows are diffed against a specific catalog; keeping them across a
  // workspace switch would produce a delta between two unrelated catalogs.
  dropCatalogShadows();
  // Same reasoning for the search / rank index and the usage counts behind
  // it: both are keyed to this workspace's ids.
  invalidateCatalogIndex();
  invalidateMaterialUsage();
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

export async function loadMaterialsCatalog(
  /**
   * When given, the whole catalog becomes this client's mirror — so its
   * deltas cover every row it just received. Without it a client that took a
   * full snapshot while marked as windowed would go stale for everything
   * outside its last page.
   */
  clientId?: string,
): Promise<CatalogSnapshot> {
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
  // This client asked for everything, so everything is what it mirrors —
  // and it is the one kind of client a tick may answer with a full snapshot.
  if (clientId) {
    fullCatalogClients.add(clientId);
    clientWindows.delete(clientId);
  }
  return snapshot;
}

// ---- change deltas ---------------------------------------------------
//
// A catalog tick used to mean "re-fetch everything": each renderer answered
// `jazz-materials:changed` with a full `loadMaterialsCatalog`, paying a whole-
// catalog projection, a multi-MB structured clone, and a full re-derivation in
// the reducer — for a one-field edit. During an xlsx import, where chunk writes
// tick faster than the rebuild completes, that never drained
// (docs/analysis/materials-catalog-lag-analysis.md, F2).
//
// Instead we keep a per-client *shadow* of cheap signatures and diff against it.
// The shadow is per client (renderer webContents), not global, because each
// client must be told about a change exactly once: a single shared shadow would
// let whichever renderer asked first consume the delta and leave the others
// stale.

interface CatalogShadow {
  catalogId: string;
  /** id → `updatedAt`. Every mutator bumps it, so it is a sound change key. */
  materials: Map<string, number>;
  /** id → `type|sourceId|targetId`; edges have no timestamp of their own. */
  edges: Map<string, string>;
  materialTypes: Map<string, string>;
  industries: Map<string, number>;
  sellers: Map<string, number>;
}

const catalogShadows = new Map<string, CatalogShadow>();

/**
 * Which materials each client actually mirrors.
 *
 * A windowed renderer holds a page, not the catalog, so a delta must be
 * scoped to what it has: sending it a row it never loaded would silently
 * grow its slice back towards the full catalog — exactly what windowing
 * exists to prevent — and sending a *removal* for a row it never held is
 * noise. Absent from this map ⇒ the client asked for the whole catalog via
 * `load()` and gets whole-catalog deltas, which is the pre-windowing
 * behaviour the perf harness still exercises.
 */
const clientWindows = new Map<string, Set<string>>();

/**
 * Clients that asked for the **whole** catalog (`load()`), and may therefore
 * be handed a full snapshot on a tick.
 *
 * Explicit, because "has no recorded window" is not the same question. A
 * renderer has no window between a workspace switch (which drops every
 * window) and its first window read — and in that gap a tick used to hand it
 * the entire catalog, which its reducer applied wholesale. One write during
 * a workspace switch was enough to put the whole catalog back in Redux, i.e.
 * to undo windowing entirely (Materials/docs/architecture/catalog-mirror.md
 * §1). Unknown clients are windowed; only saying `load()` opts out.
 */
const fullCatalogClients = new Set<string>();

/**
 * Materials this client mirrors, or `null` when it holds the whole catalog.
 *
 * An unknown client gets a fresh empty set — "windowed, mirroring nothing
 * yet" — rather than `null`. A fresh set per call because callers mutate what
 * they get (a removal drops out of the window); nothing is lost by throwing
 * it away, since the client has no recorded window to update.
 */
const windowOf = (clientId: string): Set<string> | null =>
  clientWindows.get(clientId) ??
  (fullCatalogClients.has(clientId) ? null : new Set<string>());

/**
 * Record that `clientId` now holds these materials, so subsequent deltas
 * carry their changes. Called by every path that hands a renderer rows it
 * did not have: a window page, a by-id resolve, and its own `addMaterial`
 * (whose optimistic reducer puts the row in Redux before any delta could).
 */
export function trackClientWindow(
  clientId: string,
  ids: Iterable<string>,
  options?: { reset?: boolean },
): void {
  const current = options?.reset ? new Set<string>() : windowOf(clientId) ?? new Set<string>();
  for (const id of ids) current.add(id);
  clientWindows.set(clientId, current);
}

/** Forget one client's window — it reloaded, or switched workspace. */
function dropClientWindow(clientId: string): void {
  clientWindows.delete(clientId);
  fullCatalogClients.delete(clientId);
}

/**
 * Forget every client's shadow. Called when the catalog subscription is
 * dropped (workspace close/switch) so the next tick re-syncs from a full
 * snapshot rather than diffing against another workspace's catalog.
 */
export function dropCatalogShadows(): void {
  catalogShadows.clear();
  clientWindows.clear();
  fullCatalogClients.clear();
}

/**
 * Forget one client's shadow, so its next delta is a full snapshot.
 *
 * Called when a renderer (re)subscribes. This matters because the shadow
 * advances when main *computes* a delta, not when the renderer *applies* it —
 * so anything that discards renderer state without discarding the shadow
 * leaves main believing that client is up to date when it holds nothing.
 * A reload is exactly that case: `webContents.id` survives it, but Redux does
 * not. Re-subscribing is the renderer's own signal that it started over.
 */
export function dropCatalogShadow(clientId: string): void {
  catalogShadows.delete(clientId);
  // The window goes with it, for the same reason: the renderer that comes
  // back after a reload holds nothing, so claiming it still mirrors last
  // session's page would scope its deltas to rows it no longer has.
  dropClientWindow(clientId);
}

const edgeSignature = (e: EdgeDTO): string =>
  `${e.type}|${e.sourceId}|${e.targetId}`;

function shadowFromSnapshot(
  catalogId: string,
  snapshot: CatalogSnapshot,
): CatalogShadow {
  return {
    catalogId,
    materials: new Map(
      Object.entries(snapshot.materials).map(([k, v]) => [k, v.updatedAt]),
    ),
    edges: new Map(
      Object.entries(snapshot.edges).map(([k, v]) => [k, edgeSignature(v)]),
    ),
    materialTypes: new Map(
      Object.entries(snapshot.materialTypes).map(([k, v]) => [k, v.schemaJson]),
    ),
    industries: new Map(
      Object.entries(snapshot.industries).map(([k, v]) => [k, v.updatedAt]),
    ),
    sellers: new Map(
      Object.entries(snapshot.sellers).map(([k, v]) => [k, v.updatedAt]),
    ),
  };
}

/**
 * What changed for `clientId` since it last asked.
 *
 * Returns `{ full }` when there is no usable "since" — first call for this
 * client, or a different catalog than the one the shadow was built against.
 * Otherwise returns only the rows that moved, plus every current edge belonging
 * to a changed material (a material's `suppliers`/`industry` are derived from
 * its whole edge set, so a partial set would silently drop relations).
 *
 * Cost is O(catalog) in *signature reads* — a number and three strings per
 * entry — but O(changed) in the expensive parts: attribute projection and the
 * structured clone across IPC.
 */
export async function computeCatalogDelta(
  clientId: string,
): Promise<CatalogDelta> {
  const { catalog } = await requireCatalog();
  const catalogId = (catalog as unknown as { $jazz?: { id?: string } }).$jazz
    ?.id ?? "unknown";

  // What this client mirrors. `null` ⇒ the whole catalog (a `load()` client).
  const mirrored = windowOf(clientId);
  const mirrors = (id: string): boolean => mirrored === null || mirrored.has(id);

  const previous = catalogShadows.get(clientId);
  if (!previous || previous.catalogId !== catalogId) {
    if (mirrored !== null) {
      // A windowed client must never be handed a full snapshot — that is the
      // whole-catalog load windowing replaces. It has no usable "since", but
      // it does not need one: it is about to (re)issue a window request, and
      // that answer is authoritative. Report the size so its counters stay
      // honest in the meantime.
      const total = recordEntries(catalog.materials).length;
      trace("computeCatalogDelta: windowed client with no shadow", {
        clientId,
        catalogId,
        total,
      });
      return { total };
    }
    const full = await loadMaterialsCatalog();
    catalogShadows.set(clientId, shadowFromSnapshot(catalogId, full));
    trace("computeCatalogDelta: full snapshot", {
      clientId,
      catalogId,
      materials: Object.keys(full.materials).length,
    });
    return { full };
  }

  const delta: CatalogDelta = {};
  const nextShadow: CatalogShadow = {
    catalogId,
    materials: new Map(),
    edges: new Map(),
    materialTypes: new Map(),
    industries: new Map(),
    sellers: new Map(),
  };

  // Materials whose own row moved, plus those whose edges did — both need a
  // re-projected DTO downstream.
  const affected = new Set<string>();
  const materialCoMaps = new Map<string, AnyRecord>();
  let total = 0;
  for (const [k, v] of recordEntries<AnyRecord>(catalog.materials)) {
    total += 1;
    // Rows outside this client's window are not tracked at all: they never
    // enter its shadow, so they can neither be reported as changed nor,
    // later, be mistaken for removed.
    if (!mirrors(k)) continue;
    materialCoMaps.set(k, v);
    const updatedAt = Number(
      (v as unknown as { updatedAt?: number }).updatedAt ?? 0,
    );
    nextShadow.materials.set(k, updatedAt);
    if (previous.materials.get(k) !== updatedAt) affected.add(k);
  }
  const removedMaterials = [...previous.materials.keys()].filter(
    (id) => !nextShadow.materials.has(id),
  );

  const edgeDtos = new Map<string, EdgeDTO>();
  const changedEdges: { [id: string]: EdgeDTO } = {};
  for (const [k, v] of recordEntries<AnyRecord>(catalog.edges)) {
    const dto = edgeCoMapToDto(v);
    if (!mirrors(dto.sourceId)) continue;
    edgeDtos.set(k, dto);
    const signature = edgeSignature(dto);
    nextShadow.edges.set(k, signature);
    if (previous.edges.get(k) !== signature) {
      changedEdges[k] = dto;
      affected.add(dto.sourceId);
    }
  }
  const removedEdges = [...previous.edges.keys()].filter(
    (id) => !nextShadow.edges.has(id),
  );
  for (const id of removedEdges) {
    // The edge is gone, but the material it hung off still has to be
    // re-projected without it. Its sourceId is recoverable from the shadow's
    // signature (`type|sourceId|targetId`).
    const sourceId = previous.edges.get(id)?.split("|")[1];
    if (sourceId && nextShadow.materials.has(sourceId)) affected.add(sourceId);
  }

  for (const [k, v] of recordEntries<AnyRecord>(catalog.materialTypes)) {
    const dto = typeCoMapToDto(v);
    nextShadow.materialTypes.set(k, dto.schemaJson);
    if (previous.materialTypes.get(k) !== dto.schemaJson) {
      (delta.materialTypes ??= {})[k] = dto;
    }
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.industries)) {
    const dto = orgCoMapToDto(v);
    nextShadow.industries.set(k, dto.updatedAt);
    if (previous.industries.get(k) !== dto.updatedAt) {
      (delta.industries ??= {})[k] = dto;
    }
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.sellers)) {
    const dto = orgCoMapToDto(v);
    nextShadow.sellers.set(k, dto.updatedAt);
    if (previous.sellers.get(k) !== dto.updatedAt) {
      (delta.sellers ??= {})[k] = dto;
    }
  }

  if (affected.size) {
    const materials: { [id: string]: MaterialDTO } = {};
    for (const id of affected) {
      const co = materialCoMaps.get(id);
      if (co) materials[id] = materialCoMapToDto(co);
    }
    if (Object.keys(materials).length) delta.materials = materials;

    // Every *current* edge of an affected material, not only the changed ones.
    const edges: { [id: string]: EdgeDTO } = { ...changedEdges };
    for (const [id, dto] of edgeDtos) {
      if (affected.has(dto.sourceId)) edges[id] = dto;
    }
    if (Object.keys(edges).length) delta.edges = edges;
  } else if (Object.keys(changedEdges).length) {
    delta.edges = changedEdges;
  }

  if (removedMaterials.length) delta.removedMaterials = removedMaterials;
  if (removedEdges.length) delta.removedEdges = removedEdges;

  if (mirrored !== null) {
    // A deleted row leaves the client's window with the delta that reports
    // it; keeping it would make the next tick re-report a removal for a row
    // neither side holds.
    for (const id of removedMaterials) mirrored.delete(id);
    // Windowed clients mirror a fraction of the catalog, so "how many rows
    // are there" is not derivable from what they hold.
    delta.total = total;
  }

  catalogShadows.set(clientId, nextShadow);
  trace("computeCatalogDelta", {
    clientId,
    windowed: mirrored !== null,
    changedMaterials: Object.keys(delta.materials ?? {}).length,
    removedMaterials: removedMaterials.length,
    changedEdges: Object.keys(delta.edges ?? {}).length,
  });
  return delta;
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

// ---- windowed reads --------------------------------------------------
//
// Deltas made *edits* cheap, but cold open still projected and cloned every
// material into Redux, and the slice still held all of them — 609 ms of
// `apply` at 1 000 rows, growing linearly, for a grid that virtualizes ~30
// (docs/analysis/materials-catalog-lag-analysis.md, "Still open"). The
// renderer now mirrors a *window*: what open models reference, plus the
// most-used page, extended on search and scroll.
//
// The ordering that defines "the first page" has to be stable — a page whose
// contents depend on Map iteration order would make "load more" both skip and
// repeat rows — so ranking is a total order: usage count descending, then id
// ascending. The tiebreak is `id` rather than `updatedAt` because an xlsx
// import stamps thousands of rows with the same millisecond.

/** Default page size — "100 more frequently used" from the product ask. */
export const DEFAULT_WINDOW_LIMIT = 100;
/**
 * Ceiling on one page. A caller asking for everything would reintroduce the
 * whole-catalog clone through the back door.
 */
const MAX_WINDOW_LIMIT = 1_000;

interface CatalogIndexEntry {
  id: string;
  /** Lower-cased searchable text — see `shared/materialSearch`. */
  haystack: string;
  /** Material type slug, for type-scoped reads (the pickers' path). */
  type: string;
}

interface CatalogIndexCache {
  catalogId: string;
  entries: Map<string, CatalogIndexEntry>;
  /** Every id, in rank order. The browse page is a slice of this. */
  ranked: string[];
  /**
   * `material id → its edges`, as DTOs, keyed by edge id.
   *
   * A window answer carries every edge of every material it returns, and that
   * used to mean walking the whole edge record per request — 30k edges for a
   * 100-row page at a 10k catalog, once per scroll page. The walk happens
   * once per index build instead, and a page costs O(page).
   */
  edgesBySource: Map<string, Array<[string, EdgeDTO]>>;
}

let catalogIndex: CatalogIndexCache | null = null;

/**
 * Drop the search / rank index. Rebuilt on the next window read.
 *
 * Invalidated by any catalog change (see `notifyCatalogChange`) because both
 * the haystacks and the id set it ranks are derived from catalog content.
 */
export function invalidateCatalogIndex(): void {
  catalogIndex = null;
}

/**
 * Drop the index *and* the usage counts behind it.
 *
 * The public entry point for "a model's material references changed" —
 * Composer calls it when a model graph is written. Ranking is a function of
 * usage, so invalidating usage alone would leave a ranked order computed from
 * counts that no longer hold.
 */
export function invalidateCatalogRanking(): void {
  invalidateMaterialUsage();
  invalidateCatalogIndex();
}

/** JSON-decoded leaf of one attribute, or `undefined`. */
function attributeLeaf(
  attributes: AnyRecord | undefined | null,
  key: string,
): unknown {
  const attr = (attributes as Record<string, unknown> | undefined)?.[key] as
    | AnyRecord
    | undefined;
  if (!attr) return undefined;
  const json = (attr as unknown as { valueJson?: string }).valueJson;
  if (json === undefined) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

/**
 * Build the searchable text for one material, from the same fields the grid
 * renders. `industry` comes from the edge set, so it is passed in rather than
 * re-derived per material (that scan is what made the renderer's adapter
 * quadratic — F1).
 *
 * The type label is the type's own name: nothing in the app ever renames a
 * type away from its slug (`mergeTypeVersions` seeds `label` from `name` and
 * no writer changes it), so main and renderer agree without main having to
 * resolve type schemas.
 */
function haystackFor(co: AnyRecord, industry: string | undefined): string {
  const m = co as unknown as {
    type: string;
    externalId?: string;
    attributes?: AnyRecord;
  };
  const nome = attributeLeaf(m.attributes, "nome");
  const cor = attributeLeaf(m.attributes, "cor");
  const corLabel =
    cor && typeof cor === "object"
      ? ((cor as { label?: string }).label ?? (cor as { hex?: string }).hex)
      : typeof cor === "string"
      ? cor
      : undefined;
  return buildHaystack({
    nome: typeof nome === "string" ? nome : nome == null ? undefined : String(nome),
    corLabel,
    typeLabel: m.type,
    industry,
    externalId: m.externalId,
  });
}

/**
 * Build (or reuse) the search + rank index.
 *
 * One linear pass over materials and one over edges. This is the same order
 * of work the old full projection did — the difference is that it happens on
 * a user action (a search, a scroll) rather than on every sync tick, and it
 * produces ~40 bytes per material instead of a full DTO graph.
 */
async function requireCatalogIndex(
  catalog: ResolvedCatalog,
  catalogId: string,
): Promise<CatalogIndexCache> {
  if (catalogIndex && catalogIndex.catalogId === catalogId) return catalogIndex;

  const industryOf = new Map<string, string>();
  const edgesBySource = new Map<string, Array<[string, EdgeDTO]>>();
  for (const [k, v] of recordEntries<AnyRecord>(catalog.edges)) {
    const e = edgeCoMapToDto(v);
    // First `manufacturedBy` wins, matching the renderer's `relationsFor`.
    if (e.type === "manufacturedBy" && !industryOf.has(e.sourceId)) {
      industryOf.set(e.sourceId, e.targetId);
    }
    const bucket = edgesBySource.get(e.sourceId);
    if (bucket) bucket.push([k, e]);
    else edgesBySource.set(e.sourceId, [[k, e]]);
  }

  const entries = new Map<string, CatalogIndexEntry>();
  for (const [k, v] of recordEntries<AnyRecord>(catalog.materials)) {
    entries.set(k, {
      id: k,
      haystack: haystackFor(v, industryOf.get(k)),
      type: String((v as unknown as { type?: string }).type ?? ""),
    });
  }

  const usage = await collectMaterialUsage();
  const ranked = [...entries.keys()].sort((a, b) => {
    const ua = usage.get(a) ?? 0;
    const ub = usage.get(b) ?? 0;
    if (ua !== ub) return ub - ua;
    return a < b ? -1 : a > b ? 1 : 0;
  });

  catalogIndex = { catalogId, entries, ranked, edgesBySource };
  trace("requireCatalogIndex: built", {
    catalogId,
    materials: entries.size,
    ranked: ranked.length,
    withUsage: usage.size,
  });
  return catalogIndex;
}

/**
 * One page of the catalog for one client.
 *
 * Answers three addressing modes (see `CatalogWindowRequest`) and, whichever
 * it is, always includes `pinnedIds` — the materials open models reference,
 * which must never fall out of the renderer's mirror just because they rank
 * poorly or do not match the current query.
 *
 * Side effect by design: the ids in the answer are recorded as this client's
 * window, which is what scopes its subsequent deltas.
 */
export async function loadMaterialsWindow(
  clientId: string,
  request: CatalogWindowRequest,
): Promise<CatalogWindow> {
  const { catalog } = await requireCatalog();
  const catalogId =
    (catalog as unknown as { $jazz?: { id?: string } }).$jazz?.id ?? "unknown";

  const limit = Math.min(
    Math.max(1, request.limit ?? DEFAULT_WINDOW_LIMIT),
    MAX_WINDOW_LIMIT,
  );
  const offset = Math.max(0, request.offset ?? 0);
  const query = normalizeQuery(request.query);
  const reset = request.reset === true;

  const index = await requireCatalogIndex(catalog, catalogId);
  const total = index.entries.size;

  let mode: CatalogWindow["mode"];
  let page: string[];
  let matched: number;

  // Candidate set. Type-scoping narrows it before ranking or scoring, so a
  // picker's page is the type's most-used rows rather than the catalog's.
  const candidates = request.type
    ? [...index.entries.values()].filter((e) => e.type === request.type)
    : null;
  const inScope = (id: string): boolean =>
    candidates === null || index.entries.get(id)?.type === request.type;

  if (request.ids) {
    // By-id resolve — the lazy path a graph node takes when it references a
    // material the window has not reached. Not paged: the caller already
    // knows exactly what it wants, and the set is bounded by one model's
    // node count.
    mode = "ids";
    page = request.ids.filter((id) => index.entries.has(id));
    matched = page.length;
  } else if (query) {
    mode = request.type ? "type" : "search";
    const scored: Array<{ id: string; score: number }> = [];
    for (const entry of candidates ?? index.entries.values()) {
      const score = scoreSubsequence(query, entry.haystack);
      if (score > 0) scored.push({ id: entry.id, score });
    }
    // Score descending, then id ascending — a total order, so paging through
    // results neither repeats nor skips a row.
    scored.sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );
    matched = scored.length;
    page = scored.slice(offset, offset + limit).map((s) => s.id);
  } else if (candidates) {
    mode = "type";
    // Ranked order, filtered to the type — reusing `ranked` keeps the
    // most-used-first property inside a type without a second sort.
    const scoped = index.ranked.filter(inScope);
    matched = scoped.length;
    page = scoped.slice(offset, offset + limit);
  } else {
    mode = "rank";
    matched = total;
    page = index.ranked.slice(offset, offset + limit);
  }

  // Pinned rows ride along with every answer, minus any the page already
  // carries, so the client never has to reconcile a row appearing twice.
  const pageSet = new Set(page);
  const pinned = (request.pinnedIds ?? []).filter(
    (id) => !pageSet.has(id) && index.entries.has(id),
  );

  const materials: { [id: string]: MaterialDTO } = {};
  for (const id of [...page, ...pinned]) {
    const co = catalog.materials[id] as AnyRecord | undefined;
    if (co) materials[id] = materialCoMapToDto(co);
  }

  // Every current edge of every material in the answer — `suppliers` and
  // `industry` are derived from a material's whole edge set, so a partial one
  // would silently drop relations (same contract as `CatalogDelta.edges`).
  // Read out of the index by source, so this is O(rows in the answer) rather
  // than a walk of every edge in the catalog per page request.
  const edges: { [id: string]: EdgeDTO } = {};
  for (const id of Object.keys(materials)) {
    for (const [edgeId, dto] of index.edgesBySource.get(id) ?? []) {
      edges[edgeId] = dto;
    }
  }

  // Types, industries and sellers come whole: they are bounded by how many
  // types and organizations exist, not by catalog size, and every rendered
  // row needs its type schema to resolve.
  const materialTypes: { [id: string]: MaterialTypeVersionDTO } = {};
  for (const [k, v] of recordEntries<AnyRecord>(catalog.materialTypes)) {
    materialTypes[k] = typeCoMapToDto(v);
  }
  const industries: { [id: string]: OrgNodeDTO } = {};
  for (const [k, v] of recordEntries<AnyRecord>(catalog.industries)) {
    industries[k] = orgCoMapToDto(v);
  }
  const sellers: { [id: string]: OrgNodeDTO } = {};
  for (const [k, v] of recordEntries<AnyRecord>(catalog.sellers)) {
    sellers[k] = orgCoMapToDto(v);
  }

  // Record what this client now holds. `reset` mirrors the renderer replacing
  // its slice rather than extending it; the two must agree or main would
  // scope deltas to rows Redux has already dropped.
  // On `reset` the shadow is rebuilt from scratch below rather than extended,
  // because its old "since" describes rows the client has just dropped.
  trackClientWindow(clientId, Object.keys(materials), { reset });
  seedShadowFromWindow(clientId, catalogId, catalog, materials, edges, reset);

  const result: CatalogWindow = {
    materials,
    edges,
    materialTypes,
    industries,
    sellers,
    page,
    pinned,
    offset,
    limit,
    matched,
    total,
    hasMore: mode === "ids" ? false : offset + page.length < matched,
    query: request.query ?? "",
    reset,
    mode,
    type: request.type,
  };
  trace("loadMaterialsWindow", {
    clientId,
    mode,
    offset,
    limit,
    returned: Object.keys(materials).length,
    pinned: pinned.length,
    matched,
    total,
  });
  return result;
}

/**
 * Fold a window answer into the client's delta shadow.
 *
 * Without this, the tick that follows a window read would re-send every row
 * the read just delivered: the shadow would have no signature for them, so
 * they would all look changed. Seeding it here makes a window read and a
 * delta two views of one cursor rather than two competing ones.
 */
function seedShadowFromWindow(
  clientId: string,
  catalogId: string,
  catalog: ResolvedCatalog,
  materials: { [id: string]: MaterialDTO },
  edges: { [id: string]: EdgeDTO },
  reset: boolean,
): void {
  const existing = catalogShadows.get(clientId);
  const shadow: CatalogShadow =
    existing && existing.catalogId === catalogId && !reset
      ? existing
      : {
          catalogId,
          materials: new Map(),
          edges: new Map(),
          materialTypes: new Map(),
          industries: new Map(),
          sellers: new Map(),
        };

  for (const [id, dto] of Object.entries(materials)) {
    shadow.materials.set(id, dto.updatedAt);
  }
  for (const [id, dto] of Object.entries(edges)) {
    shadow.edges.set(id, edgeSignature(dto));
  }
  // Types / industries / sellers went over whole, so their signatures are
  // current for every entry, not only the ones in this page.
  for (const [k, v] of recordEntries<AnyRecord>(catalog.materialTypes)) {
    shadow.materialTypes.set(k, typeCoMapToDto(v).schemaJson);
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.industries)) {
    shadow.industries.set(k, orgCoMapToDto(v).updatedAt);
  }
  for (const [k, v] of recordEntries<AnyRecord>(catalog.sellers)) {
    shadow.sellers.set(k, orgCoMapToDto(v).updatedAt);
  }

  catalogShadows.set(clientId, shadow);
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

/**
 * Append one chunk of a synthetic catalog — the batched seeding path
 * e2e-tests.md §11.2 prescribes for the 10k tier.
 *
 * `seedCatalogIfEmpty` is single-shot by design (it is the dev-fixture cold
 * start and must never double-apply), which caps a live seed at whatever one
 * IPC round trip can carry. A 10k catalog cannot go through one call — the
 * structured clone and the CoValue writes both block main for seconds — so a
 * perf fixture is written in chunks instead, each a plain append.
 *
 * **Fixture construction only.** It appends unconditionally and does not
 * check for duplicates: callers are generators with index-derived ids
 * (`mat-{seed}-{i}`), so uniqueness is a property of the fixture, not
 * something this has to enforce per row at 10k scale. Nothing in the product
 * calls it.
 */
export async function appendCatalogChunk(input: SeedCatalogInput): Promise<{
  materials: number;
}> {
  const { catalog, owner } = await requireCatalog();
  for (const t of input.materialTypes) {
    if (catalog.materialTypes[t.id]) continue;
    catalog.materialTypes.$jazz.set(t.id, createTypeCoValue(t, owner));
  }
  for (const i of input.industries) {
    if (catalog.industries[i.id]) continue;
    catalog.industries.$jazz.set(i.id, createOrgCoValue(i, owner));
  }
  for (const s of input.sellers) {
    if (catalog.sellers[s.id]) continue;
    catalog.sellers.$jazz.set(s.id, createOrgCoValue(s, owner));
  }
  for (const m of input.materials) {
    catalog.materials.$jazz.set(m.id, createMaterialCoValue(m, owner));
  }
  for (const e of input.edges) {
    catalog.edges.$jazz.set(e.id, createEdgeCoValue(e, owner));
  }
  // The rank / search index and the usage counts behind it are derived from
  // catalog content, and this just changed it.
  invalidateCatalogRanking();
  trace("appendCatalogChunk", `materials=${input.materials.length}`);
  return { materials: input.materials.length };
}

export async function addMaterial(
  input: AddMaterialInput,
  /**
   * The renderer that authored this row. Its optimistic reducer puts the
   * material in Redux immediately, so main must record it as mirrored —
   * otherwise the client's window would not contain a row it is displaying,
   * and every later edit to it would be filtered out of that client's deltas.
   */
  clientId?: string,
): Promise<MaterialDTO> {
  const { catalog, owner } = await requireCatalog();
  if (catalog.materials[input.material.id]) {
    throw new Error(`Material "${input.material.id}" already exists`);
  }
  if (clientId && windowOf(clientId)) {
    trackClientWindow(clientId, [input.material.id]);
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
