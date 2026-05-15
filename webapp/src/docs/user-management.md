# Plan: Local-First Distributed Workspace System (Jazz.tools only)

## Context

Klippel's workspace system is entirely local today — JSON files in `~/klippel/envs/{ENV}/workspaces/` persisted via fs-extra through Electron IPC. Helia is scaffolded but unused (empty preload stub). The goal is to make workspaces **local-first** (always functional offline) and **distributed** (multi-device sync, optional sharing) using **Jazz.tools exclusively**.

Jazz handles the full data surface: structured CRDT data (CoMap/CoList), binary blobs (BinaryCoStream), identity (Account), and access control (Group). Dropping Helia eliminates a second P2P network and keeps the architecture to a single sync system.

---

## Architecture Overview

```
┌─────────────────────── Electron Renderer ──────────────────────────┐
│  React + Redux (in-memory read cache, hydrated from Jazz on load)   │
│  ↓ mutations forwarded to Jazz via Redux middleware                  │
│  ↕ window.electron.jazz  (context bridge IPC)                       │
└─────────────────────────────────────────────────────────────────────┘
                 ↕ IPC
┌─────────────────────── Electron Main ──────────────────────────────┐
│  Jazz Node (jazz-nodejs)                                            │
│  ├── Account: cryptographic identity, persisted in .jazz/           │
│  ├── CoValues: synced via Jazz Cloud relay or direct WebRTC peers   │
│  └── Local persistence: per-workspace SQLite (WAL) inside folder   │
└─────────────────────────────────────────────────────────────────────┘
                 ↕ Jazz sync (WebSocket to Jazz Cloud or direct P2P)
         Other devices with the same Account or Group membership
```

---

## Data Model

### What stays local-file (unchanged)

| Data                                       | Location                 | Reason                          |
| ------------------------------------------ | ------------------------ | ------------------------------- |
| Session UI state (viewport, layout, theme) | `.session/`            | Device-local, not collaborative |
| Window geometry                            | `.session/window.json` | Device-local                    |

### What moves to Jazz CoValues

| Data                      | Jazz type                                                 | Notes                                                                      |
| ------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Workspace list + metadata | `CoList<WorkspaceCoMap>`                                | Synced across devices                                                      |
| Model list per workspace  | `CoMap.Record(ModelCoMap)`                              | Keyed by model ID                                                          |
| Graph nodes + edges       | **`z.string()` JSON field** inside `ModelCoMap` | Atomic whole-graph update; avoids per-field CRDT overhead for large graphs |
| SVG file                  | `BinaryCoStream` ref inside `ModelCoMap`              | Jazz native blob sync                                                      |
| Description markdown      | `z.string()` field                                      | Small enough to store inline                                               |
| Materials catalog         | `CoList<MaterialCoMap>`                                 | Ordered, mergeable                                                         |
| Orders / Budgets          | `CoList<BudgetCoMap>`                                   | Ordered, mergeable                                                         |

> **Graph storage rationale:** Graph nodes/edges are loaded and saved as a whole unit. Storing the graph as a serialized JSON string in a single CoMap field is faster than per-node CRDTs and avoids per-entry CRDT overhead. Per Jazz's own performance guidance: use `z.string()`/`z.object()` over nested CoMaps for data that updates atomically.
>
> **Concurrent-write hazard:** atomic-string fields are last-writer-wins. Two peers editing the same model simultaneously will silently lose one set of changes. To prevent this:
>
> 1. Each `ModelCoMap` carries an `editLease = co.optional.ref(EditLease)` field holding `{ holderAccountId, acquiredAt, expiresAt }`. Opening a model in the editor attempts to acquire the lease (CAS via Cedar `Composer::acquireEditLease`); only the holder may write `graphJson` until the lease expires (default 60s, auto-renewed while the editor has focus, released on close/idle).
> 2. The receive-validator rejects `Composer::updateGraph` mutations whose author does not currently hold the lease — quarantined with reason `lease_violation`.
> 3. UI shows a read-only banner with the current holder when the lease is held by someone else.
>
> **History bloat:** Jazz keeps the full CRDT history of `graphJson` mutations. A snapshot-and-compact pass (admin-triggered, monthly) writes the latest snapshot to a fresh `ModelCoMap` and atomically swaps the reference in `ModelsMap`, then drops the old CoValue. Saves are debounced (1s idle) to bound history growth between compactions.

---

## Policy-Based Authorization (Cedar)

Jazz's built-in Group roles (`reader`/`writer`/`admin`) are coarse-grained — workspace-level only. Layering a procedural RBAC check inside the renderer would be trivially bypassable by any peer with Jazz write access (modified Electron build, direct preload calls, or CRDT mutations to a roles CoMap). The enforcement boundary in a local-first/distributed system **must be cryptographic, not procedural** — you cannot prevent a malicious peer from running code, you can only prevent honest peers from accepting its writes.

We use a **policy-as-data** model evaluated by [Cedar](https://www.cedarpolicy.com/) (`@cedar-policy/cedar-wasm`), with three stacked enforcement layers.

### Three enforcement layers

| Layer | What it stops | Mechanism |
| --- | --- | --- |
| **Jazz Group crypto** | Non-members reading; non-writers writing *anything* | Native Jazz keys; re-key on demote |
| **Cedar PDP (pre-mutate)** | Honest clients from issuing forbidden ops | Main-process middleware before `jazz.mutate` |
| **Cedar PDP (on-receive)** | Compromised/stale peers' writes from being projected | Receive-validator on every peer; violations are quarantined, not applied |

The same `pdp.evaluate(...)` pure function runs in all three sites (renderer `can()` hook, main-process middleware, on-receive validator). One implementation, three call sites → no decision drift.

### Source-of-truth rule

**`PolicyCoMap` is the single source of truth.** Jazz Groups (`workspace.readers`, `workspace.writers`, `workspace.admins`) are *derived* from the policy by admin clients — never edited directly through Jazz's Group UI. Whenever the policy changes membership or capability tiers, an admin client recomputes Jazz Group membership and re-keys as needed.

### Re-key on demote

Every permission downgrade or workspace eviction triggers Jazz Group key rotation:

1. Admin client computes new memberships from the updated policy.
2. Removes the demoted account from the relevant Jazz Group(s); Jazz rotates the Group key.
3. Bumps `PolicyCoMap.keyEpoch` and re-signs.
4. Every peer learns the new epoch; in-flight writes from the demoted peer signed against the old epoch are rejected by the receive-validator on every honest peer.
5. The demoted peer cannot decrypt new state in the rotated Group nor produce accepted writes.

**Cost:** O(remaining members) re-encryption per rotation. Policy edits batch through an "Apply changes" gesture in `PolicyEditor` so one rotation covers multiple demotions.

### Mutation envelope

All domain mutations are wrapped before reaching Jazz:

```ts
type AuthorizedMutation = {
  op: string;                    // Cedar action UID, e.g. "Composer::updateModel"
  payload: unknown;
  authz: {
    policyVersion: number;       // PolicyCoMap.version at decision time
    keyEpoch: number;            // PolicyCoMap.keyEpoch — stale epoch → reject
    principal: AccountId;        // signed by Jazz
    resource: EntityUid;         // e.g. "Model::abc"
    context: Record<string, unknown>;
    decisionId: string;          // ulid, links to audit trail
  };
};
```

### Receive-validator behavior

On every incoming mutation:

- `keyEpoch` stale → **quarantine** (`stale_key_epoch`)
- `policyVersion` newer than local policy → **defer** until policy syncs
- `pdp.evaluate(...)` returns Deny / NotApplicable → **quarantine** with reason
- Otherwise → project into working state

Quarantined writes still exist in the CRDT log (CRDTs are append-only — you cannot unsend) but are filtered from the projected Redux state by a selector. They are retained for audit and garbage-collected after 30 days; an admin client exports them to disk (`<workspace>/audit/quarantine-{epoch}.jsonl`) before GC.

### Cedar schema sketch — `src/kernel/modules/Authz/cedar/schema.ts`

```cedar
entity User in [Role];
entity Role;
entity Workspace;
entity Model in [Workspace];
entity Material in [Workspace];
entity Budget in [Workspace];

action "Composer::updateModel" appliesTo {
  principal: [User], resource: [Model],
  context: { workspaceFrozen: Bool, deviceTrusted: Bool }
};
// … one action per command in the Action Catalog
```

### Action Catalog (Cedar UIDs)

```
Composer::createModel       Composer::updateModel     Composer::deleteModel
Composer::updateGraph       Composer::attachSvg
Materials::createMaterial   Materials::updateMaterial Materials::deleteMaterial
Orders::createBudget        Orders::updateBudget      Orders::deleteBudget
Store::shareWorkspace       Store::acceptInvite
Authz::updatePolicy         Authz::rotateKeys         Authz::exportQuarantine
```

### Example Cedar policies

```cedar
// Owners always allowed
permit (principal, action, resource)
when { principal in Role::"owner" };

// Editors: content actions only, never policy
permit (principal, action, resource in Workspace)
when {
  principal in Role::"editor" &&
  action in [
    Action::"Composer::updateModel",
    Action::"Composer::updateGraph",
    Action::"Materials::createMaterial",
    Action::"Orders::createBudget"
    // …
  ]
};

// Workspace freeze: only admins may write while frozen
forbid (principal, action, resource)
when { context.workspaceFrozen == true }
unless { principal in Role::"admin" };

// Per-device policy: untrusted devices cannot mutate
forbid (principal, action, resource)
unless { context.deviceTrusted == true };
```

### Bootstrap

Workspace creation generates a default admin-signed policy from a Cedar policy bundle shipped in the repo. The creator's account is recorded as `ownerAccountId` on `WorkspaceCoMap` and is granted `Role::"owner"` in the initial entity store. Owner status is non-transferable except via an explicit admin-signed policy edit.

### PDP performance

Cedar-wasm decisions are sub-millisecond for typical policy sets, but the receive-validator runs on every incoming mutation. Two optimizations:

- **Authorizer cache** keyed by `(policyVersion, principal, action, resourceType)`, invalidated on policy bump.
- **Coarse short-circuit**: if a Cedar policy says "any writer-Group member can do X on any resource of type T", skip evaluation — the Jazz Group already enforced it cryptographically.

---

## Authz Module — `src/kernel/modules/Authz/` (NEW KERNEL MODULE)

Loads after `Store` and before domain modules. Hosts the PDP, the pre-mutate middleware, the rendering hook, and the admin UI. The on-receive validator lives in the main process (see Layer 1).

### Layout

```
Authz/
├── cedar/
│   ├── engine.ts          # wraps @cedar-policy/cedar-wasm
│   ├── entities.ts        # Klippel ↔ Cedar entity mapping
│   └── schema.ts          # Cedar schema for Klippel actions
├── pdp.ts                 # evaluate(policy, principal, action, resource, ctx) → Allow|Deny|NotApplicable
├── middleware.ts          # pre-mutate enforcement (real `next => action =>` middleware, NOT listener)
├── rekey.ts               # admin-only Jazz Group rotation
├── quarantine.ts          # selector + 30-day GC + export-to-disk
├── slice.ts               # Redux mirror of policy snapshot (UX only — never authoritative)
├── actions.ts
├── hooks/useAuthz.ts      # `can()` + `isAdmin` for renderer
└── components/
    ├── PolicyEditor.tsx          # admin: edit Cedar policy text + entity store
    ├── RoleAssignment.tsx        # admin: bind accounts ↔ Cedar roles
    └── QuarantineViewer.tsx      # admin: inspect/export rejected mutations
```

### `index.ts`

```typescript
interface IAuthzModule extends IModule {
  name: "Authz";
  depends_on: ["Store"];
  hooks: {
    useAuthz: () => { can: (action: string, resource?: EntityUid) => boolean; isAdmin: boolean };
  };
  components: {
    PolicyEditor: React.FC;
    RoleAssignment: React.FC;
    QuarantineViewer: React.FC;
  };
}
```

### `slice.ts`

```typescript
interface AuthzState {
  policyVersion: number;
  keyEpoch: number;
  cedarPolicies: string;           // mirrored for renderer UX checks
  entities: Record<string, EntitySnapshot>;
  myPrincipal: EntityUid | undefined;
  quarantineCount: number;         // for admin badge; full list lazy-loaded
}
```

This slice is **not authoritative** — it only powers `useAuthz().can()` for disabling buttons. The authoritative checks live in main-process middleware and the on-receive validator.

### `middleware.ts` — pre-mutate enforcement

A real Redux middleware (`next => action => ...`), not a listener. Listener middleware runs *after* reducers and cannot abort actions; that was a defect in earlier RBAC drafts. The shape:

```typescript
const authzMiddleware: Middleware = (store) => (next) => (action) => {
  const meta = action?.meta?.authz;
  if (!meta) return next(action);   // not an authorized op

  const state = store.getState();
  const decision = pdp.evaluate({
    policy: state.Authz,
    principal: state.Authz.myPrincipal,
    action: meta.cedarAction,
    resource: meta.resource,
    context: buildContext(state),
  });

  if (decision !== "Allow") {
    return next(authzDenied({ action: action.type, reason: decision, decisionId: ulid() }));
  }

  // Stamp the envelope so downstream IPC + receive-validator can re-verify
  return next({ ...action, meta: { ...action.meta, authz: { ...meta, ...stamp(state) } } });
};
```

Domain action creators are tagged with the Cedar action UID and a resource selector:

```typescript
export const updateModel = createAction(
  "Composer/updateModel",
  (payload: { modelId: string; …}) => ({
    payload,
    meta: { authz: { cedarAction: "Composer::updateModel", resource: `Model::${payload.modelId}` } }
  })
);
```

### `rekey.ts`

Admin-only. Triggered whenever a policy edit reduces a principal's effective capabilities or removes them from the workspace. Steps:

1. Diff old → new policy; compute principals whose Jazz Group membership shrinks.
2. For each affected Jazz Group, remove those principals (Jazz performs the key rotation).
3. Bump `PolicyCoMap.keyEpoch`, re-sign with admin key, publish.
4. Append a `RekeyEvent` to a small append-only CoList for audit.

Re-key is batched: the `PolicyEditor` accumulates changes and issues one rotation per "Apply" gesture.

### `quarantine.ts`

- Pure selector over Jazz state that hides quarantined mutations from projected slices.
- 30-day TTL: an admin client (the one with the freshest `keyEpoch` heartbeat) runs a daily compaction, **first** exporting expiring entries to `<workspaceDir>/audit/quarantine-{from}-{to}.jsonl` then marking them GC-eligible. Export-before-GC is non-negotiable; GC without successful export is a no-op.
- The exporter holds an admin-only file lock to prevent double-export across devices.

### `actions.ts`

```typescript
export const policyUpdated = createAction<{ version: number; cedarPolicies: string; entities: EntityMap }>("Authz/policyUpdated");
export const keyEpochBumped = createAction<{ epoch: number }>("Authz/keyEpochBumped");
export const authzDenied = createAction<{ action: string; reason: "Deny" | "NotApplicable" | "stale_key_epoch"; decisionId: string }>("Authz/authzDenied");
export const quarantineExported = createAction<{ path: string; count: number }>("Authz/quarantineExported");
```

### `hooks/useAuthz.ts`

```typescript
function useAuthz(): {
  can: (cedarAction: string, resource?: EntityUid) => boolean;
  isAdmin: boolean;
}
```

Used by components to disable buttons and hide admin controls. Decisions match the pre-mutate middleware exactly because both call the same `pdp.evaluate`.

### Admin components

- **`PolicyEditor`** — Cedar policy text editor (Monaco with Cedar syntax), entity store editor, "Apply" button that batches edits and triggers re-key when needed. Visible only when `useAuthz().can("Authz::updatePolicy")`.
- **`RoleAssignment`** — table of workspace members × Cedar roles. Changes update the entity store; the admin client recomputes Jazz Group membership.
- **`QuarantineViewer`** — paged list of recent quarantined mutations with reason, principal, action, resource, decision trace. "Export now" button for ad-hoc audit.

---

## CoSchema Definitions — `src/kernel/modules/Store/schema.ts` (NEW)

```typescript
import { co, CoMap, CoList, Account, BinaryCoStream } from "jazz-tools";

export class WorkspaceMetadata extends CoMap {
  name = co.string;
  createdAt = co.number;
  description = co.optional.string;
}

export class ModelCoMap extends CoMap {
  id = co.string;
  name = co.string;
  graphJson = co.string;          // serialized GraphState (nodes + edges JSON)
  descriptionMd = co.optional.string;
  svg = co.optional.ref(BinaryCoStream);
}

export class ModelsMap extends CoMap.Record(ModelCoMap) {}

export class MaterialCoMap extends CoMap {
  id = co.string;
  type = co.string;
  attributesJson = co.string;     // serialized attributes map
  compositionJson = co.string;    // serialized fiber composition
  schemaVersion = co.string;
}

export class MaterialsList extends CoList.Of(co.ref(MaterialCoMap)) {}

export class BudgetCoMap extends CoMap {
  id = co.string;
  label = co.string;
  viewportGroup = co.string;
}

export class BudgetsList extends CoList.Of(co.ref(BudgetCoMap)) {}

export class PolicyCoMap extends CoMap {
  version = co.number;
  keyEpoch = co.number;
  cedarSchema = co.string;          // Cedar schema JSON
  cedarPolicies = co.string;        // Cedar policy set (text)
  entitiesJson = co.string;         // serialized entity store (subjects, role memberships)
  adminSignature = co.string;       // ed25519 over (version, keyEpoch, hash(policies+entities))
  signedBy = co.string;             // admin AccountId producing the signature
}

export class QuarantineEntry extends CoMap {
  decisionId = co.string;
  receivedAt = co.number;
  reason = co.string;               // "Deny" | "NotApplicable" | "stale_key_epoch"
  principal = co.string;
  cedarAction = co.string;
  resource = co.string;
  envelopeJson = co.string;         // full AuthorizedMutation for replay/audit
}

export class QuarantineList extends CoList.Of(co.ref(QuarantineEntry)) {}

export class WorkspaceCoMap extends CoMap {
  metadata = co.ref(WorkspaceMetadata);
  ownerAccountId = co.string;       // non-transferable except via admin-signed policy edit
  models = co.ref(ModelsMap);
  materials = co.ref(MaterialsList);
  budgets = co.ref(BudgetsList);
  policy = co.ref(PolicyCoMap);     // owned by admins-only Jazz Group
  quarantine = co.ref(QuarantineList); // append-only audit
}

export class WorkspaceListEntry extends CoMap {
  name = co.string;
  coId = co.string;
  syncOptIn = co.boolean;           // device-local opt-in; gates multi-device sync per workspace
}

export class WorkspaceList extends CoList.Of(co.ref(WorkspaceListEntry)) {}

export class KlippelAccount extends Account {
  workspaces = co.ref(WorkspaceList);
}
```

> **Per-workspace sync opt-in:** `WorkspaceList` membership does not imply automatic content sync. Each device explicitly opts in per workspace (`syncOptIn` is device-local state, not part of the synced CoValue). This prevents fan-out where every device hydrates every workspace's models and SVGs unconditionally.

---

## Layer 1: Jazz Node — `electron/main/jazz.ts` (NEW)

### Persistence model: per-workspace SQLite

Each workspace owns its own SQLite database file inside the workspace folder. The Jazz node is opened **per workspace** when the user selects it, and closed on workspace switch. This isolates I/O, simplifies backup (zip the workspace folder), and keeps the audit trail co-located with the data it describes.

```
workspaces/{name}/
├── jazz.sqlite              # primary CRDT store (WAL mode)
├── jazz.sqlite-wal          # WAL file (auto-managed)
├── jazz.sqlite-shm          # shared-memory index (auto-managed)
├── .jazz-id                 # contains workspace coId; presence signals "migrated"
├── .migration.lock          # proper-lockfile during legacy migration
├── .db.lock                 # proper-lockfile while jazz.sqlite is open
├── audit/
│   └── quarantine-{from}-{to}.jsonl
└── Models.legacy/           # pre-migration files (one-release retention)
```

```typescript
import { createJazzNode } from "jazz-nodejs";
import { sqliteStorageAdapter } from "jazz-storage-sqlite";   // thin wrapper around better-sqlite3
import { KlippelAccount } from "../../src/kernel/modules/Store/schema";
import lockfile from "proper-lockfile";

export async function openWorkspaceJazzNode(workspaceDir: string) {
  // Single-writer guarantee: refuse to open if another instance holds the DB lock.
  await lockfile.lock(`${workspaceDir}/.db.lock`, { retries: 0, stale: 30_000 });

  const node = await createJazzNode({
    AccountSchema: KlippelAccount,
    storage: sqliteStorageAdapter({
      path: `${workspaceDir}/jazz.sqlite`,
      pragmas: {
        journal_mode: "WAL",            // multi-reader + single-writer concurrency
        synchronous: "NORMAL",          // WAL-safe, ~10x faster than FULL
        foreign_keys: "ON",
        busy_timeout: 5000,             // ms — covers brief WAL checkpoints
        mmap_size: 268435456,           // 256 MiB; tune per platform
        cache_size: -65536,             // 64 MiB page cache
      },
      // Pluggable cipher hook (see "Encryption at rest" below). Off by default.
      cipher: process.env.KLIPPEL_DB_CIPHER ? "sqlcipher" : undefined,
    }),
    sync: { server: "wss://cloud.jazz.tools" },  // opt-in per workspace; see Hardening
  });
  return { node, release: () => lockfile.unlock(`${workspaceDir}/.db.lock`) };
}
```

### Schema (managed by the adapter, documented here for clarity)

| Table | Purpose | Key indexes |
| --- | --- | --- |
| `covalues`         | One row per CoValue: `co_id`, `type`, `latest_snapshot_blob`, `header_json` | PK `co_id` |
| `mutations`        | Append-only CRDT log: `seq` (autoincrement), `co_id`, `author_account_id`, `signature`, `payload_blob`, `received_at`, `key_epoch`, `projected` (bool) | idx `(co_id, seq)`, idx `(received_at)` for GC |
| `quarantine`       | Subset view of `mutations` with `projected = 0` plus reason columns: `decision_id`, `reason`, `cedar_action`, `resource`, `expires_at` | idx `(expires_at)` |
| `policy_snapshots` | Materialized recent PolicyCoMap versions for fast bootstrap of the PDP: `version`, `key_epoch`, `cedar_policies`, `entities_json`, `signature`, `signed_by` | PK `version` |
| `subscriptions`    | Tracks live renderer subscriptions per coId for safe IPC cleanup | idx `co_id` |
| `meta`             | Key-value: `schema_version`, `workspace_co_id`, `owner_account_id`, last GC timestamps | PK `key` |

The adapter creates these tables on first open and runs idempotent migrations keyed by `meta.schema_version`. Mutation rows are immutable; `projected` flips from `0` → `1` only by the receive-validator after a successful Cedar decision, and the renderer's projected state reads only rows where `projected = 1`.

### Concurrency model

- **Single-writer per workspace:** the `.db.lock` file enforces that only one Electron main process at a time opens `jazz.sqlite`. WAL mode allows the in-process Jazz node to serve concurrent reads (subscriptions) while applying writes.
- **No cross-process sharing:** SQLite WAL across processes is sharp-edged on Windows network drives; the lock ensures we never depend on it.
- **Checkpointing:** PRAGMA `wal_autocheckpoint=1000` (default ~4 MiB of WAL) keeps `jazz.sqlite-wal` bounded. A manual `PRAGMA wal_checkpoint(TRUNCATE)` runs on graceful shutdown.

### Encryption at rest

Two options, both off by default:

1. **OS-level** (recommended for most users): rely on FileVault / BitLocker / LUKS. No code changes.
2. **SQLCipher** (for shared/cloud-synced folders): if `KLIPPEL_DB_CIPHER=sqlcipher` and the user has set a workspace passphrase, the adapter swaps `better-sqlite3` for `better-sqlite3-multiple-ciphers` and applies `PRAGMA key=...`. The passphrase is wrapped with the same argon2id flow as account-seed export.

Encryption choice is recorded in `meta.cipher` and cannot be changed without a full re-export.

### Backup, snapshot, and compaction

- **Backup:** `VACUUM INTO 'workspaces/{name}/jazz.backup.sqlite'` (atomic, online-safe). Triggered by a "Snapshot workspace" admin action.
- **Compaction (history pruning):** monthly admin job. For each `ModelCoMap`, write the current materialized snapshot into a fresh `co_id`, swap the reference in `ModelsMap` (a single CRDT mutation), then `DELETE FROM mutations WHERE co_id = old_id AND received_at < now()` followed by `VACUUM` if reclaimed space exceeds a threshold. Compaction emits a `CompactionEvent` for audit.
- **Quarantine GC:** the 30-day TTL runs as `DELETE FROM quarantine WHERE expires_at < now()` **after** successful export to `audit/`. Both operations are wrapped in a single transaction so a partial export never advances GC.

**IPC handlers to register (in `electron/main/jazz.ts`):**

| Handler                   | Type       | Purpose                                                            |
| ------------------------- | ---------- | ------------------------------------------------------------------ |
| `jazz-get-account-id`     | `handle`   | Returns account public ID                                          |
| `jazz-create-workspace`   | `handle`   | Creates WorkspaceCoMap + bootstrap PolicyCoMap, returns CoID       |
| `jazz-list-workspaces`    | `handle`   | Returns array of `{name, coId, syncOptIn}`                         |
| `jazz-load-workspace`     | `handle`   | Returns metadata snapshot; content streams lazily (see below)      |
| `jazz-load-model`         | `handle`   | Lazy-load a single model by `coId` (replaces eager workspace load) |
| `jazz-mutate`             | `handle`   | Accepts `AuthorizedMutation`; main-process PDP check then publish  |
| `jazz-create-invite`      | `handle`   | Creates **scoped, expiring, single-use** invite (see below)        |
| `jazz-revoke-invite`      | `handle`   | Adds invite to revocation CoList                                   |
| `jazz-accept-invite`      | `handle`   | Joins shared workspace via invite link                             |
| `jazz-export-account`     | `handle`   | Exports account seed **passphrase-wrapped** (argon2id + xchacha20) |
| `jazz-import-account`     | `handle`   | Imports passphrase-wrapped seed                                    |
| `jazz-subscribe`          | `on`       | Subscribe renderer to CoValue updates (per-`coId` channel)         |
| `jazz-unsubscribe`        | `on`       | Unsubscribe                                                        |

Jazz change callbacks → fire `jazz-update-{coId}` IPC events back to renderer.

### Receive-validator (authoritative enforcement)

In `electron/main/jazz.ts`, every incoming CRDT mutation passes through the Authz validator **before** Jazz projects it into the working state:

```ts
node.onIncomingMutation(async (coId, mutation: AuthorizedMutation) => {
  const policy = await loadPolicySnapshot(workspaceCoId);
  if (mutation.authz.keyEpoch !== policy.keyEpoch)       return quarantine(mutation, "stale_key_epoch");
  if (mutation.authz.policyVersion > policy.version)     return defer(mutation);          // policy not synced yet
  const decision = pdp.evaluate(policy, mutation);
  if (decision !== "Allow")                              return quarantine(mutation, decision);
  // else: allow projection
});
```

**Important property:** quarantined writes remain in the CRDT log (append-only, cannot be unsent) but are filtered from every honest peer's projected state. The renderer never sees them.

### IPC trust boundary

- `jazz-mutate` accepts an `AuthorizedMutation` envelope, **not** an arbitrary patch. The main process re-validates the envelope (signature, Cedar decision) before publishing. The renderer is treated as untrusted.
- Per-mutation rate limit and payload-size cap enforced in main process to prevent a compromised renderer from flooding the CRDT log.
- Allowed payload shapes per `op` are schema-validated in main process. The renderer cannot inject unrecognized fields.

### Invite security

`jazz-create-invite` returns a capability URL with these guarantees:

- **Single-use:** consuming the invite atomically marks it consumed in a workspace-local `InvitesMap` (CoMap keyed by invite ID).
- **Expiry:** default TTL 24h, configurable up to 7d. Past TTL → invite is rejected by `acceptInvite` even if not yet consumed.
- **Revocable:** an admin can append the invite ID to `revokedInvites`; peers reject acceptance.
- **Bound to role:** the invite encodes the target Cedar role; accepting only grants that role, never escalates.
- Invite links are never logged; the renderer copies to clipboard and clears after a short window.

### Account-seed handling

`jazz-export-account` always wraps the seed with a user-supplied passphrase (argon2id KDF → xchacha20-poly1305). The plaintext seed never crosses the IPC boundary or hits disk. Import is symmetric and rate-limited to mitigate offline guessing.

---

## Layer 2: Preload Bridge — `electron/preload/jazz.ts` (NEW)

```typescript
export const jazzApi = {
  getAccountId: () => ipcRenderer.invoke("jazz-get-account-id"),
  createWorkspace: (name: string) => ipcRenderer.invoke("jazz-create-workspace", name),
  listWorkspaces: () => ipcRenderer.invoke("jazz-list-workspaces"),
  loadWorkspace: (coId: string) => ipcRenderer.invoke("jazz-load-workspace", coId),
  mutate: (coId: string, patch: unknown) => ipcRenderer.invoke("jazz-mutate", { coId, patch }),
  shareWorkspace: (coId: string, role: "reader" | "editor") =>
    ipcRenderer.invoke("jazz-share-workspace", { coId, role }),
  acceptInvite: (inviteLink: string) => ipcRenderer.invoke("jazz-accept-invite", inviteLink),
  subscribe: (coId: string, listener: (data: unknown) => void) => {
    const channel = `jazz-update-${coId}`;
    ipcRenderer.on(channel, (_, data) => listener(data));
    ipcRenderer.send("jazz-subscribe", coId);
    return () => ipcRenderer.removeAllListeners(channel);
  },
};
```

Add `jazz: jazzApi` to the `api` object in `electron/preload/index.ts` and extend `IcpApi` in `electron/preload/typings.ts`.

---

## Layer 3: Store Module Changes

### `src/kernel/modules/Store/slice.ts` (MODIFY)

Extend `StoreState`:

```typescript
interface StoreState {
  sessionAutoSaveInterval: number | undefined;
  selectedWorkspace: string;
  workspaces: Array<{ name: string; coId: string }>;  // was: string[]
  syncStatus: "offline" | "syncing" | "synced";
  accountId: string | undefined;
}
```

### `src/kernel/modules/Store/middlewares.ts` (MODIFY)

- `createWorkspace` command → call `window.electron.jazz.createWorkspace(name)` → dispatch `workspaceCreated({ name, coId })`
- `selectWorkspace` command → call `window.electron.jazz.loadWorkspace(coId)` → hydrate Redux slices
- Subscribe to Jazz updates on workspace select → dispatch `workspaceUpdated(data)`
- Remove `storage.writeBlob` for workspace list (keep only for `.session/` UI state)

### `src/kernel/modules/Store/actions.ts` (ADD)

```typescript
export const shareWorkspace = createAction<{ workspace: string; role: "reader" | "editor" }>("Store/shareWorkspace");
export const acceptWorkspaceInvite = createAction<{ inviteLink: string }>("Store/acceptWorkspaceInvite");
export const syncStatusChanged = createAction<{ status: "offline" | "syncing" | "synced" }>("Store/syncStatusChanged");
```

---

## Layer 4: Domain Module Changes

### Composer module `middlewares.ts` (MODIFY)

- On **model save**: serialize `GraphState` → JSON string → `jazz.mutate(modelCoId, { graphJson: serialized })`
- On **SVG save**: create `BinaryCoStream` via Jazz, attach ref to `ModelCoMap.svg`
- On **model load**: `jazz.loadWorkspace(coId)` already hydrates models; parse `graphJson` back to `GraphState`
- Remove `storage.writeBlob` calls for `graph.json`, `model.json`, `.svg` files

### Materials module `middlewares.ts` (MODIFY)

- On material create/update: `jazz.mutate(workspaceCoId, { materials: [...] })`
- On load: hydrate from Jazz workspace snapshot

---

## Layer 5: New UI Components

### `WorkspaceShare.tsx` (NEW — in `src/kernel/modules/Store/components/`)

- Shows current workspace CoID as sharable invite link
- Role selector (reader / editor)
- "Copy invite link" button
- Rendered inside SettingsPanel accordion

### `SyncStatusIndicator.tsx` (NEW — in SystemTray area)

- Reads `Store.syncStatus` from Redux
- Shows offline / syncing / synced pill

### `AccountSettings.tsx` (NEW — in `src/kernel/modules/Store/components/`)

- Shows account ID (truncated public key)
- Export/import account seed for pairing devices

---

## Main Process Init Changes — `electron/main/index.ts` (MODIFY)

```typescript
// After: const homePath = ...
// No global Jazz node at boot. The node is opened per workspace on selection:
ipcMain.handle("jazz-open-workspace", async (_, workspaceDir: string) => {
  if (activeWorkspace) await activeWorkspace.release();
  activeWorkspace = await openWorkspaceJazzNode(workspaceDir);
  initJazzHooks(activeWorkspace.node, mainWindow);
});
app.on("before-quit", async () => { await activeWorkspace?.release(); });

// Remove: const heliaNode = await initHeliaNode(workspace)
// Remove: initHeliaHooks(heliaNode)
// Keep: existing scheduler, storage hooks
```

Opening the Workspace Picker UI does **not** open any Jazz node — only the list of `{ name, coId, syncOptIn }` entries is read from a small index file at `~/klippel/envs/{ENV}/workspaces.index.json` (maintained as workspaces are created/renamed). Jazz is initialized only after the user picks a workspace.

The Helia files (`electron/main/ipfs.ts`, `electron/preload/ipfs.ts`) can be left dormant or deleted — they have no active callers.

---

## Migration Strategy (Legacy Workspaces)

On first launch after the upgrade, for each existing local workspace:

1. Acquire an exclusive `proper-lockfile` lock on `workspaces/{name}/.migration.lock`. If the lock is already held (another Electron instance), abort and surface a clear error — never run concurrent migrations.
2. Inside the lock: re-check for `.jazz-id` (in case a parallel instance just finished). If present, release and skip.
3. Read existing `workspaces/{name}/Models/` from disk.
4. Create a Jazz `WorkspaceCoMap` plus a bootstrap `PolicyCoMap` (owner = current account, default policy bundle) and populate from local files.
5. Atomically write `.jazz-id` containing the returned `coId` **before** releasing the lock. If any step fails, the lock release is followed by a cleanup of the partially created CoValues.
6. Treat local files as read-only fallback only until step 5 succeeds; after that the local files are renamed to `Models.legacy/` (kept for one release cycle, then removed by an explicit user opt-in cleanup).

This is incremental — old workspaces continue to work; each migrates once on first open. Two Electron instances opening the same workspace cannot create duplicate CoValues.

---

## Safety & Scalability Hardening (cross-cutting requirements)

These are non-negotiable requirements for the implementation. Each addresses a specific failure mode identified in design review.

### Content trust — never trust peer-supplied bytes

- **SVG sanitization:** every `BinaryCoStream` SVG is run through DOMPurify (with `USE_PROFILES: { svg: true, svgFilters: true }`) and rendered via `<img src=blob:...>` or inline `<svg>` only after sanitization. Never inject untrusted SVG via `dangerouslySetInnerHTML` without sanitization. Electron renderer must have `contextIsolation: true` and `nodeIntegration: false`.
- **Graph JSON validation:** `graphJson` and `attributesJson` are parsed with a guarded reviver that rejects `__proto__`, `constructor`, and `prototype` keys. Parsed structures are validated against a Zod schema before hydrating Redux. Depth and node-count limits are enforced (max 10k nodes, 50k edges, depth 32) — exceeding them quarantines the mutation.
- **Mutation payload size:** main-process cap of 16 MiB per mutation; oversized envelopes are rejected at `jazz-mutate` and never published.

### Hydration & sync scaling

- **Lazy load:** `jazz-load-workspace` returns metadata only (`WorkspaceMetadata`, materials list summary, model list summary). Models, SVGs, and graph JSON are loaded on demand via `jazz-load-model`. Renderer must not eagerly hydrate every CoValue.
- **Per-workspace sync opt-in:** Jazz's per-workspace sync is bounded by the device-local `syncOptIn` flag. Workspaces a device has never opted into are listed but not pulled.
- **Subscription lifecycle:** every `subscribe` call returns an unsubscribe function. Renderer must call it on component unmount and on app teardown. Main process tracks live subscriptions per `coId` and removes IPC listeners when the renderer disconnects to prevent leaks.
- **No Redux double-store:** Authz, Materials, and Orders slices store *projections*, not copies, of CoValue data. Selectors read directly from the Jazz snapshot cache where possible. Slices serve UX state (loading, errors, selection) and small derived values.

### Performance budgets

- Cedar PDP decision (cached): < 1 ms; uncached: < 5 ms.
- Receive-validator end-to-end: < 10 ms per mutation at p95.
- `jazz-load-workspace` (metadata only): < 200 ms on a workspace with 500 models.
- Per-mutation rate limit (main process): 200/s per workspace; sustained excess triggers a temporary back-pressure dispatch back to the renderer.

### Third-party relay

- The Jazz Cloud relay (`wss://cloud.jazz.tools`) is **opt-in** per workspace. Workspaces default to direct-peer-only sync. Enabling the relay requires explicit acknowledgement of the data-handling implications (UX dialog with the relay's privacy policy link).
- Outbound payloads are E2E-encrypted by Jazz; the relay sees ciphertext only. Document this expectation in user-facing copy.
- Workspace owner may set `disallowRelay = true` in `WorkspaceMetadata`; peers honoring the policy refuse to upload to the relay.

### Renderer security baseline

- `contextIsolation: true`, `sandbox: true` for the renderer process.
- Content-Security-Policy meta tag: `default-src 'self'; img-src 'self' blob: data:; connect-src 'self' wss://cloud.jazz.tools;` (relax `connect-src` only when relay is enabled).
- DevTools access in production is gated by an environment flag.

---

## File Change Summary

| File                                                                   | Change                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `electron/main/jazz.ts`                                              | NEW — per-workspace Jazz node open/close + all IPC handlers                        |
| `electron/main/jazz-storage-sqlite.ts`                               | NEW — `better-sqlite3` storage adapter for the Jazz node (WAL, pragmas, schema)    |
| `electron/main/index.ts`                                             | MODIFY — wire `jazz-open-workspace`, release on quit; remove Helia init            |
| `~/klippel/envs/{ENV}/workspaces.index.json`                         | NEW — lightweight workspace index `{ name, coId, syncOptIn }[]` for the picker     |
| `electron/preload/jazz.ts`                                           | NEW — Jazz IPC bridge                                                              |
| `electron/preload/index.ts`                                          | MODIFY — expose `jazz` in contextBridge                                          |
| `electron/preload/typings.ts`                                        | MODIFY — add JazzAPI type                                                          |
| `electron/main/ipfs.ts`                                              | DORMANT (no callers, leave or delete)                                               |
| `electron/preload/ipfs.ts`                                           | DORMANT (was already empty)                                                         |
| `src/kernel/modules/Store/schema.ts`                                 | NEW — CoSchema definitions (includes RBAC types)                                   |
| `src/kernel/modules/Store/slice.ts`                                  | MODIFY — add coId, syncStatus, accountId                                           |
| `src/kernel/modules/Store/middlewares.ts`                            | MODIFY — Jazz mutations replace JSON file writes for workspace data                |
| `src/kernel/modules/Store/actions.ts`                                | MODIFY — add share/invite/syncStatus actions                                       |
| `src/kernel/modules/Store/components/WorkspaceShare.tsx`             | NEW                                                                                 |
| `src/kernel/modules/Store/components/AccountSettings.tsx`            | NEW                                                                                 |
| `src/kernel/modules/Authz/index.ts`                                  | NEW — kernel module definition                                                     |
| `src/kernel/modules/Authz/cedar/{engine,entities,schema}.ts`         | NEW — Cedar wasm wrapper + Klippel↔Cedar mapping + schema                          |
| `src/kernel/modules/Authz/pdp.ts`                                    | NEW — pure `evaluate(...)` used by all three enforcement sites                     |
| `src/kernel/modules/Authz/middleware.ts`                             | NEW — real Redux middleware (`next => action =>`) for pre-mutate gating            |
| `src/kernel/modules/Authz/rekey.ts`                                  | NEW — admin-only Jazz Group rotation on demote                                     |
| `src/kernel/modules/Authz/quarantine.ts`                             | NEW — selector + 30-day TTL + export-to-disk (export-before-GC)                    |
| `src/kernel/modules/Authz/slice.ts`                                  | NEW — non-authoritative policy mirror for UX                                       |
| `src/kernel/modules/Authz/actions.ts`                                | NEW — policyUpdated, keyEpochBumped, authzDenied, quarantineExported               |
| `src/kernel/modules/Authz/hooks/useAuthz.ts`                         | NEW — `can(action, resource?)` + `isAdmin`                                         |
| `src/kernel/modules/Authz/components/PolicyEditor.tsx`               | NEW — Cedar policy + entity store editor                                           |
| `src/kernel/modules/Authz/components/RoleAssignment.tsx`             | NEW — bind accounts ↔ Cedar roles                                                  |
| `src/kernel/modules/Authz/components/QuarantineViewer.tsx`           | NEW — admin audit UI                                                               |
| `electron/main/authz-validator.ts`                                   | NEW — receive-validator hooked into Jazz `onIncomingMutation`                      |
| `electron/main/authz-rekey.ts`                                       | NEW — Jazz Group key rotation orchestration                                        |
| `src/system/modules/Composer/actions.ts`                             | MODIFY — tag commands with `meta.authz.{cedarAction, resource}`                    |
| `src/system/modules/Composer/middlewares.ts`                         | MODIFY — graph/SVG save/load via Jazz; respect edit-lease; SVG sanitization        |
| `src/system/modules/Materials/actions.ts`                            | MODIFY — tag commands with `meta.authz.{cedarAction, resource}`                    |
| `src/system/modules/Materials/middlewares.ts`                        | MODIFY — materials via Jazz; payload schema validation                             |
| `src/system/modules/Orders/actions.ts`                               | MODIFY — tag commands with `meta.authz.{cedarAction, resource}`                    |

## Dependencies to Add

```json
{
  "jazz-tools": "^0.x",
  "jazz-nodejs": "^0.x",
  "better-sqlite3": "^11.x",
  "better-sqlite3-multiple-ciphers": "^11.x",
  "@cedar-policy/cedar-wasm": "^4.x",
  "dompurify": "^3.x",
  "proper-lockfile": "^4.x",
  "zod": "^3.x",
  "@noble/hashes": "^1.x",
  "@noble/ciphers": "^1.x"
}
```

- `better-sqlite3` is the synchronous SQLite binding used by the Jazz storage adapter; runs in the Electron main process only.
- `better-sqlite3-multiple-ciphers` is loaded lazily only when SQLCipher mode is enabled.
- `@noble/hashes` + `@noble/ciphers` cover argon2id + xchacha20-poly1305 for account-seed and (optional) DB-passphrase wrapping.
- Helia packages remain in package.json but become unused.

Both native modules must be rebuilt against Electron's ABI (`electron-rebuild` in the postinstall step).

---

## Implementation Roadmap

Nine sequential phases, each independently shippable behind a feature flag, each gated by a dedicated e2e test under `webapp/tests/`. Phases must land in order — each builds load-bearing infrastructure for the next. Verification-plan test numbers (`V#`) below reference the checklist in the following section.

Feature flag convention: `KLIPPEL_FLAG_<PHASE>=on` toggles the new path; the old JSON-file path stays live until the phase's exit criteria are met on `unstable`. The flag is removed in the final cutover phase.

### Phase 1 — SQLite-backed Jazz Node foundation

**Goal:** stand up the Jazz node with per-workspace SQLite persistence. No schema migration of existing data yet — only "new workspace" path uses Jazz.

**Deliverables:**
- `electron/main/jazz.ts` — `openWorkspaceJazzNode` + `.db.lock`
- `electron/main/jazz-storage-sqlite.ts` — `better-sqlite3` adapter, schema, pragmas
- `electron/preload/jazz.ts`, `electron/preload/typings.ts`
- `~/klippel/envs/{ENV}/workspaces.index.json` writer/reader
- IPC handlers: `jazz-open-workspace`, `jazz-get-account-id`, `jazz-create-workspace`, `jazz-list-workspaces`
- `KlippelAccount`, `WorkspaceMetadata`, `WorkspaceCoMap` (minimal) in `Store/schema.ts`

**Exit criteria:**
- New workspace creates `jazz.sqlite` with `journal_mode=WAL`, `.jazz-id`, and an index entry.
- Single-writer lock rejects a second instance with a clear error.
- WAL truncates to ≤ 0 bytes on graceful shutdown.

**e2e test:** `tests/jazz-foundation.e2e.test.ts`
1. Launch app → create workspace "p1" → assert `workspaces/p1/jazz.sqlite` exists and `PRAGMA journal_mode` returns `wal`.
2. Quit; reopen; pick workspace; assert metadata loads from SQLite (delete the old `.session/workspace.json` first to prove it).
3. While first instance is open, spawn a second Electron headless pointed at the same workspace; assert lock error and original instance unaffected.
4. Quit gracefully; assert `jazz.sqlite-wal` is truncated.

Covers V1, V22, V23.

---

### Phase 2 — Models migration onto Jazz CoValues

**Goal:** move model storage (graph, SVG, description) from disk JSON to `ModelCoMap` / `BinaryCoStream`. Legacy migration with `.migration.lock`. Edit lease for `graphJson`.

**Depends on:** Phase 1.

**Deliverables:**
- `ModelCoMap`, `ModelsMap`, `EditLease` in `Store/schema.ts`
- `Store/middlewares.ts` — replace `storage.writeBlob` for models with `jazz-mutate`
- `Composer/middlewares.ts` — graph/SVG via Jazz, lease acquire/renew/release
- Legacy migration routine with `proper-lockfile`
- IPC: `jazz-load-model`, `jazz-mutate` (with `AuthorizedMutation` envelope shape, but unverified — auth fields ignored this phase)

**Exit criteria:**
- New and migrated workspaces store models in `jazz.sqlite`; no model writes hit `Models/*.json`.
- Two devices opening the same model show a read-only banner on the non-holder.
- Migration is idempotent and lock-protected.

**e2e test:** `tests/models-jazz.e2e.test.ts`
1. Create workspace; add a 50-node graph; attach an SVG; assert `Models/*.json` is absent and `covalues` table has the model.
2. Quit, edit the SQLite file's `mutations` count, reopen; assert the model rehydrates with all nodes.
3. Seed a legacy workspace fixture under `tests/fixtures/legacy-workspace/`; open it; assert `.jazz-id` appears, `Models.legacy/` is created, and content survives.
4. Hold lease on instance A; from instance B, attempt to dispatch `Composer/updateGraph`; assert it is rejected client-side and UI shows the holder banner.
5. Open the same legacy workspace from two instances concurrently; assert exactly one migrates, the other errors cleanly.

Covers V6, V17, V18.

---

### Phase 3 — Materials, Budgets, lazy hydration

**Goal:** complete the data-model move and stop eager hydration. `jazz-load-workspace` returns metadata only; content streams on demand.

**Depends on:** Phase 2.

**Deliverables:**
- `MaterialCoMap`, `MaterialsList`, `BudgetCoMap`, `BudgetsList` in schema
- `Materials/middlewares.ts`, `Orders/middlewares.ts` — Jazz-backed
- Lazy-load IPC (`jazz-load-model` already exists; add `jazz-load-material`)
- Subscription lifecycle: per-`coId` channel + main-process listener tracking
- Per-workspace `syncOptIn` flag in `workspaces.index.json`

**Exit criteria:**
- Cold open on a workspace with 500 models hits the < 200 ms metadata budget.
- Subscriptions are cleaned up on component unmount (verified by listener count metric).
- Opening a workspace without `syncOptIn` does not initiate Jazz Cloud handshake.

**e2e test:** `tests/lazy-hydrate.e2e.test.ts`
1. Seed a workspace with 500 placeholder models (via direct SQLite seeder); reopen; measure metadata-load time and listener count; assert budgets.
2. Open one model; assert only that model's `coId` is subscribed; close the panel; assert listener removed.
3. Add 20 materials, restart; assert lazy load + count matches.
4. Toggle `syncOptIn=false`; assert no outbound websocket to `cloud.jazz.tools` (intercepted via test proxy).

Covers V2, V20.

---

### Phase 4 — Account identity & multi-device sync

**Goal:** make Klippel a true local-first multi-device app. Passphrase-wrapped account seed export/import. Direct-peer sync (relay still off by default).

**Depends on:** Phase 3.

**Deliverables:**
- `jazz-export-account`, `jazz-import-account` IPC with argon2id + xchacha20-poly1305
- `AccountSettings.tsx`, `SyncStatusIndicator.tsx`
- `WorkspaceMetadata.disallowRelay` field
- Per-workspace relay opt-in dialog

**Exit criteria:**
- Exported blob contains no plaintext seed bytes (binary inspection).
- Wrong-passphrase imports are rate-limited.
- Two devices with the same imported account sync a model end-to-end peer-to-peer.

**e2e test:** `tests/multi-device-sync.e2e.test.ts`
1. Instance A: create workspace + model; export account with passphrase "P"; assert exported file passes a "no plaintext key" entropy/string check.
2. Instance B (clean home dir): import with "P"; open the same workspace coId; assert model materializes within 5 s.
3. Instance A: edit graph node; assert change appears on B within 2 s.
4. Set `disallowRelay=true`; assert no outbound traffic to `cloud.jazz.tools` while sync still works on a LAN-localhost pair.
5. Attempt import with wrong passphrase 10×; assert exponential backoff.

Covers V3, V16, V21.

---

### Phase 5 — Authz PDP & UX gating (non-authoritative)

**Goal:** ship Cedar PDP, `useAuthz().can()`, `PolicyEditor`, and pre-mutate middleware. **Not yet** cryptographically enforced — bypassable by a tampered renderer, but caught by UX checks. Bootstrap policy created on workspace create.

**Depends on:** Phase 4.

**Deliverables:**
- `Authz/` module: `cedar/`, `pdp.ts`, `middleware.ts`, `slice.ts`, `actions.ts`, `hooks/useAuthz.ts`
- `PolicyEditor.tsx`, `RoleAssignment.tsx`
- `PolicyCoMap` + `ownerAccountId` on `WorkspaceCoMap`
- Bootstrap policy bundle in repo (`Authz/bootstrap/default-policy.cedar`)
- Domain action tags: `meta.authz.{cedarAction, resource}`

**Exit criteria:**
- Viewer cannot dispatch mutation actions; UI buttons disabled.
- Policy edits on A propagate to B's PDP without restart.
- PDP cache hit rate > 80 % on a typical editing session.

**e2e test:** `tests/authz-pdp.e2e.test.ts`
1. Create workspace as Owner; open `PolicyEditor`; assert default Cedar policies present and signed.
2. Assign a second account as `viewer`; on its device, assert `Composer::createModel` button is disabled and dispatching the action via Redux DevTools emits `authzDenied`, no Jazz mutation issued.
3. Promote to `editor`; assert the same dispatch succeeds without restart.
4. Edit policy to add custom role "CostAnalyst" with only `Materials::*` and `Orders::*`; apply; assert the second device's `useAuthz().can("Composer::createModel")` flips to false within 2 s.

Covers V9, V10, V13.

---

### Phase 6 — Cryptographic enforcement (the security-critical phase)

**Goal:** make Authz authoritative. Mutation envelope, receive-validator on `onIncomingMutation`, `quarantine` table, `keyEpoch` field, `QuarantineViewer`. From this phase on, RBAC bypass is not possible from a tampered renderer.

**Depends on:** Phase 5.

**Deliverables:**
- `electron/main/authz-validator.ts` hooked to `node.onIncomingMutation`
- `AuthorizedMutation` envelope stamping in `Authz/middleware.ts`
- `quarantine` table reads/writes; `quarantineCount` slice field
- `QuarantineViewer.tsx`
- Mutation payload-size cap + per-mutation rate limit in `jazz-mutate`

**Exit criteria:**
- A "rogue client" test harness (renderer build that bypasses pre-mutate middleware) cannot get a write projected by any honest peer.
- Receive-validator p95 latency < 10 ms per mutation under load.
- Stale `policyVersion` defers; stale `keyEpoch` quarantines.

**e2e test:** `tests/authz-validator.e2e.test.ts`
1. Build `tests/harness/rogue-renderer.ts` that calls `window.electron.jazz.mutate(...)` directly with a `Composer::updateModel` envelope as a `viewer` (skipping the Authz middleware).
2. Start two honest instances + the rogue; rogue submits the mutation.
3. Assert: rogue's SQLite has the mutation row with `projected=0`; both honest peers also have `projected=0` after sync; `Composer/updateModel` is **not** dispatched on any honest peer; `quarantine` row records reason `Deny`.
4. Inject 1000 valid mutations through the rate limiter; assert no envelope-size violation slips through and back-pressure dispatch fires past the cap.

Covers V11, V14 (TTL exercised in Phase 9).

---

### Phase 7 — Re-key on demote

**Goal:** demotions cryptographically evict the demoted peer. Bumps `keyEpoch`, rotates Jazz Group keys, neutralizes in-flight offline writes.

**Depends on:** Phase 6.

**Deliverables:**
- `electron/main/authz-rekey.ts` orchestration
- `Authz/rekey.ts` admin-side trigger from `PolicyEditor` "Apply"
- `RekeyEvent` append-only audit CoList
- `stale_key_epoch` quarantine path (the validator branch is from Phase 6; this wires the rotation that produces stale epochs)

**Exit criteria:**
- Demoting an editor to viewer rotates the writers Group key; their pending offline mutations are quarantined on next sync.
- Re-key cost scales O(remaining members); a 10-member workspace re-keys in < 2 s.

**e2e test:** `tests/authz-rekey.e2e.test.ts`
1. Instance A (admin), B (editor), C (editor). Take B offline. B issues 3 graph mutations locally (queued).
2. A demotes B to viewer via `PolicyEditor` → "Apply". Assert `keyEpoch` bumps in A's PolicyCoMap and B is removed from the writers Group.
3. C observes new `keyEpoch` and updated policy.
4. Bring B online. Assert: B's 3 queued mutations replicate to A and C but are quarantined with reason `stale_key_epoch`; projected state on A/C is unchanged; B's local UI flips to read-only and shows the demotion.
5. Promote B back to editor on A; new `keyEpoch`; assert B can now write again, but the previously quarantined mutations stay quarantined (no auto-replay).

Covers V12.

---

### Phase 8 — Sharing & invites

**Goal:** ship workspace sharing with single-use, expiring, role-bound, revocable invites — safe to share over insecure channels.

**Depends on:** Phase 7 (re-key must be in place so revocations are meaningful).

**Deliverables:**
- `WorkspaceShare.tsx`
- `jazz-create-invite` / `jazz-revoke-invite` / `jazz-accept-invite` IPC
- `InvitesMap` (CoMap, admins-write) for single-use tracking
- `revokedInvites` CoList
- Acceptance flow that grants the Cedar role baked into the invite and joins the relevant Jazz Group

**Exit criteria:**
- A second acceptance of the same invite is rejected.
- An invite past TTL is rejected.
- A revoked invite is rejected on every peer within sync horizon.
- An invite for `viewer` cannot escalate the joiner beyond viewer.

**e2e test:** `tests/sharing-invites.e2e.test.ts`
1. A creates a 1-hour `viewer` invite; B accepts; assert B joined as viewer.
2. C tries to accept the same invite; assert rejection (`single_use`).
3. A creates another invite with 60-second TTL; wait 61 s; C attempts accept; assert rejection (`expired`).
4. A creates an invite; A revokes before use; D attempts accept; assert rejection (`revoked`).
5. Tamper an `viewer` invite token to claim `editor` role; assert acceptance fails (signature mismatch).

Covers V15.

---

### Phase 9 — Content hardening, audit ops, cutover

**Goal:** harden untrusted content paths, ship audit/compaction operations, remove Helia, retire the flag.

**Depends on:** Phase 8.

**Deliverables:**
- SVG sanitization via DOMPurify in renderer load path
- Zod schemas for `graphJson` / `attributesJson` + prototype-pollution-safe reviver
- Quarantine 30-day GC + export-before-GC + `quarantineExported` action
- Admin "Snapshot workspace" (`VACUUM INTO`) and compaction job
- CSP meta tag, `contextIsolation: true`, `sandbox: true` enforced
- Optional SQLCipher path behind `KLIPPEL_DB_CIPHER`
- Delete `electron/main/ipfs.ts`, `electron/preload/ipfs.ts`, Helia deps
- Remove `KLIPPEL_FLAG_*` flags

**Exit criteria:**
- Crafted SVG with `<script>` and `onload=` renders inert.
- Crafted `graphJson` with `__proto__` is rejected; no global pollution.
- A 30-day TTL boundary triggers export to `audit/quarantine-*.jsonl` **before** any GC delete; failed export aborts the transaction.
- Renderer cannot reach Node APIs (verified via probe page).
- All Helia code paths removed.

**e2e test:** `tests/hardening-and-ops.e2e.test.ts`
1. Attach `tests/fixtures/malicious.svg` (with `<script>alert(1)` and `onload="…"`); render in the model; assert no script execution and inert DOM.
2. Inject a mutation whose `graphJson` contains `{"__proto__":{"polluted":true}}`; assert quarantined and `({}).polluted === undefined`.
3. Push a payload > 16 MiB; assert rejection at `jazz-mutate`.
4. Backdate quarantine rows past 30 days; trigger compaction; assert `audit/quarantine-*.jsonl` exists with the expected entries **before** the `DELETE` runs (verified via fault-injection: deliberately fail the export and confirm DB rows still present).
5. Trigger "Snapshot workspace"; open `jazz.backup.sqlite` standalone; assert latest state present.
6. Run compaction on a heavily edited model; assert history rows pruned and `VACUUM` reclaims space; `CompactionEvent` audit recorded.
7. Probe page in renderer: `typeof require` → undefined; CSP blocks an inline `<script>`.
8. `grep -r "helia" electron/ src/` returns nothing.
9. (Optional) Enable `KLIPPEL_DB_CIPHER=sqlcipher`; assert `jazz.sqlite` magic header is not the standard SQLite header; wrong passphrase rate-limits.

Covers V4, V5, V7, V8, V14, V19, V24, V25, V26.

---

### Cross-phase CI requirements

- Every phase's e2e test file is added to the CI matrix when the feature flag flips on.
- Performance budgets in "Safety & Scalability Hardening" are asserted in the relevant phase's e2e (Phases 3, 6).
- The "rogue renderer" harness from Phase 6 is **kept in the repo and run on every CI build from Phase 6 onward** — it is the regression gate for the entire Authz subsystem.

---

## Phase E2E Test Specifications

Each spec follows the project's e2e convention: Puppeteer-core attaches to a dev Electron instance over CDP (`KLIPPEL_CDP_PORT`, default `9222`), drives the app through MCP tools or component drivers (never re-implementing form flows), and resets/cleans the workspace through the shared helpers. Specs below list new helpers, fixtures, setup, and per-scenario Given/When/Then. They are intentionally scaffold-ready — every `Then` clause is a concrete assertion against the DOM, the SQLite file, the IPC bridge, or a test proxy.

### Shared additions

Lives once for all phases:

| Helper | Path | Purpose |
| --- | --- | --- |
| `openSqliteRO(workspaceDir)` | `tests/helpers/sqlite.ts` | Opens `jazz.sqlite` in read-only mode via `better-sqlite3` so a test can assert table state without contending with the running app |
| `waitForPragma(db, name, value)` | `tests/helpers/sqlite.ts` | Polls `PRAGMA <name>` until it matches |
| `spawnRogueRenderer(opts)` | `tests/harness/rogueRenderer.ts` | Built once, used Phase 6+; launches a renderer build with Authz middleware stripped |
| `withJazzCloudProxy(handler)` | `tests/helpers/relayProxy.ts` | MITM-style proxy that captures any outbound traffic destined to `cloud.jazz.tools` for absence/presence assertions |
| `pairAccount(passphrase)` | `tests/helpers/account.ts` | Exports current account via `jazz-export-account`, returns the wrapped blob |
| `acquireDevice(name)` | `tests/helpers/multiDevice.ts` | Launches a second sandboxed Electron with `KLIPPEL_HOME=<tmp>` and an isolated CDP port; returns `{ page, home, close }` |

All specs assume `resetWorkspace()` runs in `beforeEach`. CDP timeouts default to 10 s; long-running scenarios override per-step.

---

### Phase 1 — `tests/jazz-foundation.e2e.test.ts`

**Required helpers:** `openSqliteRO`, `waitForPragma`.

**Fixtures:** none.

**Setup:**
- Launch primary Electron on `KLIPPEL_CDP_PORT=9222`, `KLIPPEL_HOME=<tmp1>`, `KLIPPEL_FLAG_PHASE1=on`.
- `resetWorkspace(page)` to start from an empty `KLIPPEL_HOME`.

#### 1.1 — Workspace creation writes a WAL-mode SQLite

- **Given** no workspaces exist (`workspaces.index.json` absent or empty).
- **When** the test drives `createWorkspaceTool.execute({ name: "p1" })`.
- **Then** `<tmp1>/workspaces/p1/jazz.sqlite` exists; `openSqliteRO` opens it; `PRAGMA journal_mode` returns `"wal"`; `meta.workspace_co_id` is a non-empty string; `workspaces.index.json` contains `{ name: "p1", coId: <that id>, syncOptIn: true }`.

#### 1.2 — Reopen hydrates from SQLite, not `.session`

- **Given** scenario 1.1 completed; app quit gracefully.
- **When** the renderer's `.session/workspace.json` is deleted on disk, then the app is relaunched and `openWorkspaceTool.execute({ name: "p1" })` runs.
- **Then** the workspace metadata panel displays `"p1"` within 2 s; no errors in the renderer console; `jazz-load-workspace` IPC was invoked exactly once (assert via main-process IPC spy installed by a test preload).

#### 1.3 — Single-writer lock rejects a second instance

- **Given** primary instance has workspace "p1" open.
- **When** `acquireDevice("secondary")` launches with `KLIPPEL_HOME=<tmp1>` (same dir) and the test drives `openWorkspaceTool.execute({ name: "p1" })` on it.
- **Then** the secondary's IPC rejects with an error message matching `/lock|in use/i`; primary's CDP still responds; primary's `jazz.sqlite` is unmodified (`mtime` unchanged after a 3 s window).

#### 1.4 — Graceful shutdown truncates the WAL

- **Given** workspace "p1" open with at least 100 metadata mutations queued (drive a loop of `renameWorkspaceTool` to force writes).
- **When** the test sends `app.quit` over CDP and waits for process exit.
- **Then** within 5 s of exit, `stat workspaces/p1/jazz.sqlite-wal` reports size ≤ 0; `openSqliteRO` reopens cleanly and `meta` rows reflect the final rename.

---

### Phase 2 — `tests/models-jazz.e2e.test.ts`

**Required helpers:** `openSqliteRO`. **Builds on:** Phase 1 helpers.

**Fixtures:**
- `tests/fixtures/legacy-workspace/` — a frozen pre-Phase-1 workspace tree containing `Models/abc/graph.json`, `model.json`, `description.md`, `variation.svg`. Checked into the repo as the canonical migration input.

**Setup:** Phase 1 setup + `KLIPPEL_FLAG_PHASE2=on`.

#### 2.1 — Model writes land in SQLite, never in `Models/*.json`

- **Given** an empty workspace "p2".
- **When** `createModelTool` + 50× `addElectiveTool` + `uploadVariationSVGTool({ svg: small-fixture })` run.
- **Then** `workspaces/p2/Models/` does not exist; `covalues` table has ≥ 1 row of type `ModelCoMap`; `mutations` row count ≥ 50; the SVG appears as a `BinaryCoStream` referenced from the model row; renderer renders the SVG in the variation panel.

#### 2.2 — Re-hydration is lossless

- **Given** scenario 2.1 completed; quit.
- **When** the test programmatically appends a no-op row to `mutations` then relaunches and opens "p2".
- **Then** the graph reloads with exactly 50 nodes; the SVG renders byte-identical to the input fixture (`Buffer.equals` on the read blob).

#### 2.3 — Legacy migration is atomic and lock-protected

- **Given** `cp -r tests/fixtures/legacy-workspace <tmp>/workspaces/legacy`; no `.jazz-id` present.
- **When** the test opens "legacy".
- **Then** within 30 s: `.jazz-id` exists with a non-empty `coId`; `Models.legacy/` exists and contains the original files; `jazz.sqlite` has model rows matching the legacy content; `meta.schema_version` ≥ `1`.

#### 2.4 — Concurrent migration: exactly one winner

- **Given** a fresh `legacy` fixture copy with no `.jazz-id`.
- **When** the primary opens it while `acquireDevice("secondary")` opens it concurrently (within 100 ms).
- **Then** exactly one device reports "migration complete"; the other reports an error referencing `.migration.lock`; only one `WorkspaceCoMap` exists in `covalues` (`SELECT COUNT(*) FROM covalues WHERE type='WorkspaceCoMap'` = 1).

#### 2.5 — Edit lease blocks the non-holder

- **Given** two devices `A` and `B` opened on the same workspace, model `m1` open in `A`'s editor.
- **When** `B` drives `updateGraphTool.execute({ modelId: "m1", patch })`.
- **Then** `B`'s IPC returns rejection `{ reason: "lease_held_by", holder: A.accountId }`; `B`'s UI shows the read-only banner; `A`'s `jazz.sqlite` has no new mutation row for that patch within 2 s.

---

### Phase 3 — `tests/lazy-hydrate.e2e.test.ts`

**Required helpers:** `withJazzCloudProxy`, `openSqliteRO`, plus `seedWorkspace(db, { models: N })` that inserts directly into `covalues` to skip UI driving.

**Fixtures:** none (seeded programmatically).

**Setup:** Phases 1–2 flags on + `KLIPPEL_FLAG_PHASE3=on`.

#### 3.1 — Cold open meets the metadata budget

- **Given** `seedWorkspace(db, { models: 500 })` against a closed workspace dir.
- **When** the app opens that workspace and the test records the elapsed time from `jazz-open-workspace` IPC issued to `workspaceMetadataReady` action dispatched.
- **Then** elapsed ≤ 200 ms (p95 over 10 runs); zero `jazz-load-model` IPC calls were issued during open.

#### 3.2 — Subscription lifecycle is balanced

- **Given** workspace open, model list visible.
- **When** the test drives `openModelTool({ id: "m17" })`, then closes the model.
- **Then** during open, exactly one new entry appears in the main-process `subscriptions` map keyed by `m17`'s `coId`; after close, that entry is removed within 1 s; `ipcRenderer.listenerCount("jazz-update-<m17>")` returns 0.

#### 3.3 — `syncOptIn=false` suppresses cloud relay

- **Given** workspace "p3" exists with `syncOptIn: false` in `workspaces.index.json`.
- **When** `withJazzCloudProxy(captureAll)` wraps the test; app opens "p3"; user edits one model.
- **Then** the proxy records **zero** connections to `cloud.jazz.tools`; local SQLite still records mutations.

#### 3.4 — Materials/Budgets behave identically to Models

- **Given** an empty workspace.
- **When** 20× `addMaterialTool` + 5× `createBudgetTool` run; quit; relaunch.
- **Then** materials and budgets re-hydrate lazily on first display (assert via IPC spy); no `Materials.json` / `Budgets.json` on disk.

---

### Phase 4 — `tests/multi-device-sync.e2e.test.ts`

**Required helpers:** `pairAccount`, `acquireDevice`, `withJazzCloudProxy`.

**Fixtures:**
- `tests/helpers/entropy.ts::assertNoPlaintextKey(buf, knownSeedHexes)` — fails if any 32-byte window of `buf` matches `knownSeedHexes` or has Shannon entropy below 7.5 bits/byte over its first 64 bytes (heuristic but sufficient).

**Setup:** Phases 1–3 flags + `KLIPPEL_FLAG_PHASE4=on`. Two Electron instances `A`, `B` with isolated `KLIPPEL_HOME`.

#### 4.1 — Account export is passphrase-wrapped, never plaintext

- **Given** instance `A` has an account whose internal seed is captured via a test-only main-process introspection IPC (`__test_dumpAccountSeed`, gated by `NODE_ENV=test`).
- **When** the test drives `exportAccountTool.execute({ passphrase: "correct horse battery staple" })`.
- **Then** the returned blob passes `assertNoPlaintextKey(blob, [knownSeed])`; the file's first 4 bytes match the documented envelope magic; argon2 salt is unique across two consecutive exports.

#### 4.2 — Cross-device import + workspace sync

- **Given** `A` has workspace "p4" with one model; `pairAccount("…")` produced blob `B0`.
- **When** instance `B` (fresh `KLIPPEL_HOME`) imports `B0` with the correct passphrase; the test triggers `joinWorkspaceTool.execute({ coId: <A's p4 coId> })`.
- **Then** `B`'s model panel shows the model within 5 s; `B`'s `jazz.sqlite` contains the same `WorkspaceCoMap` `co_id`; an edit on `A` (`updateGraph`) appears on `B`'s rendered graph within 2 s.

#### 4.3 — `disallowRelay=true` enforces direct-peer-only

- **Given** scenario 4.2 reached; `A` toggles `disallowRelay=true` via `WorkspaceShare`.
- **When** `withJazzCloudProxy(captureAll)` is enabled; both devices edit; the test asserts a LAN-localhost direct WebRTC pair is established (via Jazz's `peerState` IPC introspection).
- **Then** zero connections to `cloud.jazz.tools`; sync still completes; round-trip latency `A → B` ≤ 2 s.

#### 4.4 — Wrong-passphrase import is rate-limited

- **Given** blob `B0` from 4.1.
- **When** the test issues 10 consecutive imports with wrong passphrase, recording the delay between IPC reply timestamps.
- **Then** delays follow an exponential curve (≥ 2× growth per attempt after the third); after the 10th, the IPC returns `{ error: "rate_limited", retryAfterMs: > 60000 }`.

---

### Phase 5 — `tests/authz-pdp.e2e.test.ts`

**Required helpers:** `acquireDevice`, `dispatchRaw(page, action)` (sends a raw action through Redux DevTools backend for testing middleware behavior without UI).

**Fixtures:**
- `tests/fixtures/policies/cost-analyst.cedar` — a Cedar policy snippet adding the `CostAnalyst` role.

**Setup:** Phases 1–4 flags + `KLIPPEL_FLAG_PHASE5=on`. Two devices `A` (owner) and `B` (joined viewer via Phase 4 sharing).

#### 5.1 — Bootstrap policy is admin-signed

- **Given** `A` creates a fresh workspace.
- **When** the test reads `PolicyCoMap` via `openSqliteRO` (`policy_snapshots` table).
- **Then** `version = 1`, `signed_by = A.accountId`, signature verifies against `A`'s public key, default policies match the shipped bundle byte-for-byte.

#### 5.2 — Viewer UI is disabled

- **Given** `B` has joined as `viewer`.
- **When** `B`'s renderer renders the Composer ribbon.
- **Then** the `createModel` button has `aria-disabled="true"`; tooltip text matches `/Permission required: Composer::createModel/`.

#### 5.3 — Pre-mutate middleware blocks dispatched actions

- **Given** the same setup.
- **When** the test calls `dispatchRaw(B.page, { type: "Composer/createModel", payload: { name: "x" }, meta: { authz: { cedarAction: "Composer::createModel" } } })`.
- **Then** Redux action log shows `Authz/authzDenied` with `reason: "Deny"`; **no** `jazz-mutate` IPC was issued (assert via spy); `B`'s `jazz.sqlite` has no new `mutations` row.

#### 5.4 — Promotion takes effect without restart

- **Given** scenarios 5.1–5.3 reached.
- **When** `A` opens `PolicyEditor`, promotes `B` to `editor`, applies.
- **Then** within 2 s `B`'s `useAuthz().can("Composer::createModel")` returns `true` (assert via a debug-only renderer probe); the `createModel` button enables; `dispatchRaw` of the same action now succeeds and produces a `mutations` row on both devices.

#### 5.5 — Custom role propagates

- **Given** `A` pastes `cost-analyst.cedar` into `PolicyEditor` and assigns `B` to `CostAnalyst`.
- **When** apply is invoked.
- **Then** within 2 s, `B`'s `can("Materials::createMaterial")` is `true`, `can("Composer::createModel")` is `false`; PDP cache hit-rate over the next 100 calls ≥ 80 % (assert via `__test_pdpStats` IPC).

---

### Phase 6 — `tests/authz-validator.e2e.test.ts`

**Required helpers:** `spawnRogueRenderer`, `acquireDevice`.

**Fixtures:**
- `tests/harness/rogue-renderer.ts` — a renderer entry that imports `window.electron.jazz` directly and exposes a `window.__rogue.submit(envelope)` global. The Authz middleware is removed at build time via a Webpack `IgnorePlugin` keyed on `__ROGUE__=1`.

**Setup:** Phases 1–5 flags + `KLIPPEL_FLAG_PHASE6=on`. Three instances: `A` (admin/honest), `B` (editor/honest), `R` (rogue, joined as `viewer`).

#### 6.1 — Rogue write is quarantined on every honest peer

- **Given** the three instances paired and synced. `R` knows the target model `m1`'s `coId`.
- **When** the test calls `R.page.evaluate(() => window.__rogue.submit({ op: "Composer::updateModel", payload: { name: "PWNED" }, authz: { policyVersion: 1, keyEpoch: 1, principal: R.accountId, resource: "Model::m1", context: {}, decisionId: "test-rogue-1" } }))`.
- **Then**: within 5 s — on `A` and `B`, `mutations.projected = 0` for the row with `decisionId = "test-rogue-1"`; `quarantine` row exists with `reason = "Deny"`; no `Composer/updateModel` action dispatched in either honest Redux store; model `m1`'s name remains its pre-test value; `R`'s local SQLite *also* has `projected = 0` (the rogue's own validator catches itself for free).

#### 6.2 — Size cap rejects oversized envelopes

- **Given** rogue setup as above.
- **When** `R` submits an envelope with a 17 MiB `payload.graphJson` string.
- **Then** the `jazz-mutate` IPC rejects synchronously with `{ error: "payload_too_large", limit: 16777216 }`; no row appears in any `mutations` table.

#### 6.3 — Rate limit triggers back-pressure

- **Given** `B` (honest editor).
- **When** the test fires 300 valid `updateGraph` mutations within 1 s.
- **Then** the first ≤ 200 succeed within the window; subsequent calls receive `{ error: "rate_limited", retryAfterMs }`; the renderer dispatches a `Authz/backPressure` action; no mutation is lost (replay after `retryAfterMs` succeeds).

#### 6.4 — Receive-validator latency budget

- **Given** a freshly opened workspace.
- **When** a synthetic load of 1000 incoming mutations is replayed against the validator (via a test-only `__test_replayMutations` IPC).
- **Then** p95 wall-clock per mutation, measured inside the validator, ≤ 10 ms; p99 ≤ 25 ms.

---

### Phase 7 — `tests/authz-rekey.e2e.test.ts`

**Required helpers:** `acquireDevice`, plus `forceOffline(device)` / `forceOnline(device)` that toggle the Jazz node's transport.

**Fixtures:** none.

**Setup:** Phases 1–6 + `KLIPPEL_FLAG_PHASE7=on`. Three honest instances `A` (admin), `B` (editor), `C` (editor).

#### 7.1 — Demotion bumps `keyEpoch` and rotates the writers group

- **Given** all three online, current `keyEpoch = 1`, `B` is in the writers Jazz Group.
- **When** `A` demotes `B` to `viewer` via `PolicyEditor` → Apply.
- **Then** within 2 s on `A` and `C`: `policy_snapshots.key_epoch = 2`; `B`'s accountId is no longer in the writers Group (verified via `__test_dumpGroupMembers` IPC); a `RekeyEvent` row exists in the audit CoList.

#### 7.2 — Offline-queued writes from demoted peer are neutralized

- **Given** scenario set up but `B` is forced offline **before** the demotion.
- **When** `B` (offline) issues three `Composer::updateGraph` mutations locally (they enter `B`'s local `mutations` table with `keyEpoch = 1`, queued for replication). Then `A` performs the demotion (7.1) while `B` is still offline. Then `forceOnline(B)`.
- **Then** within 10 s: on `A` and `C`, the three mutations replicate into `mutations` but with `projected = 0` and `quarantine.reason = "stale_key_epoch"`; the projected graph state on `A` and `C` is unchanged; `B`'s UI flips to read-only with a "your access was revoked" notice; `B`'s local projected state on those rows also flips to `projected = 0` once policy syncs.

#### 7.3 — Re-promotion does not auto-replay quarantined mutations

- **Given** scenario 7.2 reached.
- **When** `A` promotes `B` back to `editor` (`keyEpoch = 3`).
- **Then** `B` can issue new writes successfully; the previously quarantined three mutations remain `projected = 0` (no replay); a user-visible audit entry shows them as "rejected during demotion".

#### 7.4 — Re-key cost is bounded

- **Given** a workspace with 10 members.
- **When** `A` performs one demotion.
- **Then** the elapsed wall time from `Apply` click to `keyEpoch` propagation on the slowest peer ≤ 2 s.

---

### Phase 8 — `tests/sharing-invites.e2e.test.ts`

**Required helpers:** `acquireDevice`.

**Fixtures:**
- `tests/fixtures/tampered-invite.json` — a viewer invite whose `role` field has been edited to `"editor"`; the signature is now invalid.

**Setup:** Phases 1–7 + `KLIPPEL_FLAG_PHASE8=on`. `A` admin, `B`/`C`/`D` clean accounts.

#### 8.1 — Single-use enforcement

- **Given** `A` creates a `viewer` invite via `WorkspaceShare`.
- **When** `B` accepts; then `C` attempts to accept the same invite token.
- **Then** `B`'s join succeeds and grants `viewer`; `C`'s `jazz-accept-invite` rejects with `{ error: "single_use_consumed" }`; the `InvitesMap` entry has `consumedBy = B.accountId`.

#### 8.2 — Expiry enforcement

- **Given** `A` creates an invite with TTL 60 s; the test wall-clock advances 65 s (via the renderer's `__test_advanceClock` for the Jazz node only, with real wall-clock unchanged so peer transports do not break).
- **When** `D` attempts to accept.
- **Then** rejection `{ error: "expired" }`; no group membership change.

#### 8.3 — Revocation propagates

- **Given** `A` creates an invite, then revokes it via `WorkspaceShare`. The revocation appends to `revokedInvites`.
- **When** the revocation has propagated to all peers (≥ 1 round-trip), `D` attempts to accept on a device synced to `A`.
- **Then** rejection `{ error: "revoked" }`; `D` is not in any workspace group.

#### 8.4 — Tampered invite fails signature check

- **Given** `tampered-invite.json`.
- **When** `D` loads it and triggers accept.
- **Then** rejection `{ error: "signature_invalid" }`; no Jazz Group membership; the rejection is recorded in `D`'s local `quarantine` table for audit even though no mutation was issued.

#### 8.5 — Role escalation impossible

- **Given** `A` creates a strict `viewer` invite.
- **When** `B` accepts and immediately attempts `Composer::createModel`.
- **Then** middleware + validator both reject (regression check on Phase 5 + 6).

---

### Phase 9 — `tests/hardening-and-ops.e2e.test.ts`

**Required helpers:** `openSqliteRO`, plus `injectMutation(db, row)` that writes a raw row to the SQLite log to simulate adversarial input that bypassed the validator.

**Fixtures:**
- `tests/fixtures/malicious.svg` — contains `<script>window.__pwned = true;</script>`, `<image onload="window.__pwned = true">`, and a `xlink:href="javascript:..."` link.
- `tests/fixtures/prototype-polluting-graph.json` — `{"__proto__":{"polluted":true},"nodes":[]}`.
- `tests/fixtures/oversize-graph.json` — generated at runtime, 17 MiB.

**Setup:** Phases 1–8 + `KLIPPEL_FLAG_PHASE9=on`. Single instance unless noted.

#### 9.1 — Malicious SVG is rendered inert

- **Given** a model with no SVG.
- **When** `uploadVariationSVGTool.execute({ file: "tests/fixtures/malicious.svg" })`.
- **Then** within 2 s the variation panel renders; `page.evaluate(() => (window as any).__pwned)` returns `undefined`; the rendered DOM contains no `<script>` and no `on*` attributes (`document.querySelectorAll('script').length === 0` and a regex sweep over `outerHTML`).

#### 9.2 — Prototype pollution is rejected

- **Given** a model `m1`.
- **When** `injectMutation` writes a raw `updateGraph` row whose `payload.graphJson` is the fixture's contents.
- **Then** receive-validator quarantines with `reason = "schema_violation"`; `page.evaluate(() => ({} as any).polluted)` returns `undefined`; no global is polluted.

#### 9.3 — Oversize payload rejected at the boundary

- **Given** the 17 MiB fixture.
- **When** the renderer attempts `jazz-mutate` with the payload.
- **Then** IPC rejects with `{ error: "payload_too_large" }`; the renderer never gets to call the receive-validator (regression check on Phase 6.2 still passing).

#### 9.4 — Quarantine TTL: export precedes GC, and a failed export aborts GC

- **Given** seeded `quarantine` rows with `expires_at = now() - 1`. Two sub-scenarios:
  - **9.4a (happy path):** allow export to succeed.
  - **9.4b (fault-injected):** stub the FS write to throw on the second call.
- **When** the admin invokes "Run audit GC".
- **Then 9.4a:** `audit/quarantine-*.jsonl` is created and contains the expired rows in JSONL form before any `DELETE` runs (verified via FS-event hook); after, `quarantine` rows for those `decisionId`s are gone.
- **Then 9.4b:** no audit file is partially left behind (either fully written or absent); the GC transaction rolls back; `quarantine` rows still present; an `Authz/quarantineExportFailed` action is dispatched.

#### 9.5 — Backup snapshot is standalone

- **Given** workspace "p9" with content.
- **When** admin triggers "Snapshot workspace".
- **Then** `workspaces/p9/jazz.backup.sqlite` exists; `openSqliteRO` opens it; row counts in `covalues` and `mutations` match the live DB at the snapshot instant; opening it in a fresh app instance (with a synthetic redirect) renders the same content.

#### 9.6 — Compaction reclaims space and audits

- **Given** a model with > 1000 historical `mutations` rows for the same `co_id`.
- **When** admin compaction runs.
- **Then** the old `co_id`'s `mutations` rows are gone; a fresh `co_id` carries the materialized snapshot; `ModelsMap` reference was atomically swapped (assert via single mutation row of type `ModelsMap` patch); file size after `VACUUM` ≤ 60 % of pre-compaction; a `CompactionEvent` audit row exists.

#### 9.7 — Renderer cannot reach Node

- **Given** the app open.
- **When** `page.evaluate(() => typeof (window as any).require)`.
- **Then** returns `"undefined"`; a probe attempt to inject an inline `<script>nope()</script>` into the document body is blocked by CSP (CSP violation event captured).

#### 9.8 — Helia is gone

- **When** the test runs `grep -r "helia\|ipfs" webapp/electron/ webapp/src/ --include='*.ts' --exclude-dir=docs` from a CI step.
- **Then** zero matches; no Helia packages in `package.json` dependencies.

#### 9.9 — (Optional) SQLCipher mode

- **Given** `KLIPPEL_DB_CIPHER=sqlcipher` and a workspace passphrase set.
- **When** the app creates workspace "p9c".
- **Then** the first 16 bytes of `jazz.sqlite` are not `"SQLite format 3\0"`; opening with `better-sqlite3` (no cipher) fails; opening with the correct key succeeds; 10 wrong-passphrase opens trigger rate-limiting matching the curve from 4.4.

---

### Spec maintenance rules

- Every new domain action added to the catalog requires extending the relevant phase's pre-mutate + validator scenarios (Phases 5 and 6) — these specs are the contract.
- The rogue-renderer harness (`tests/harness/rogue-renderer.ts`) is forbidden from importing anything that would auto-register Authz middleware. CI enforces this via an import-boundary lint rule.
- Performance budgets in scenarios 3.1, 6.4, and 7.4 are tracked over time in `tests/perf-budgets.json` and regressions of > 20 % fail CI.

---

## Verification Plan

1. **Offline first:** Start with no network. Create workspace, add model, add materials. Quit and reopen. Confirm everything reloads from `workspaces/{name}/jazz.sqlite`. Verify the file exists with `journal_mode=WAL` and that `.db.lock` is released after quit.
2. **Single-device round-trip:** Verify workspace list, graph, and materials reload from Jazz CoValues (not `.session/` JSON files) on relaunch.
3. **Multi-device sync:** Copy account seed to second machine. Create a model on machine A. Confirm it appears on machine B after both go online.
4. **Sharing:** Generate invite link from machine A. Accept on machine B with a different account. Verify reader can view, editor can modify.
5. **Legacy migration:** Open an old local workspace (no `.jazz-id` file). Verify auto-migration creates Jazz CoValues and writes `.jazz-id`. Subsequent opens skip migration.
6. **Graph fidelity:** Save a complex graph (50+ nodes, 100+ edges). Reload. Verify round-trip through `graphJson` serialization is lossless.
7. **SVG via BinaryCoStream:** Attach an SVG to a model. Confirm it syncs to second device and renders correctly.
8. **Existing session state unaffected:** Layout, viewport positions, and theme still persist to `.session/` files as before.
9. **Authz — policy CRUD:** As admin, edit Cedar policy to add a "Cost Analyst" role with only `Materials::*` and `Orders::*` actions. Apply. Verify policy version increments and admin signature validates on a second device.
10. **Authz — pre-mutate enforcement:** Assign a member the `viewer` role. Confirm they cannot dispatch `createModel` — middleware emits `authzDenied`, no mutation reaches Jazz, UI disables the create button via `useAuthz().can()`.
11. **Authz — receive-validator enforcement (the security-critical test):** Build a tampered renderer that bypasses pre-mutate middleware and calls `jazz.mutate` directly with a `Composer::updateModel` envelope as a `viewer`. Confirm an honest peer's receive-validator quarantines the mutation with reason `"Deny"` and the projected state is unchanged. The mutation must NOT appear in any honest peer's Redux state.
12. **Authz — re-key on demote:** Demote an `editor` to `viewer` on machine A. Confirm `keyEpoch` bumps, machine A re-keys the writers Jazz Group, and any in-flight write from the (now-offline) ex-editor signed with the old `keyEpoch` is quarantined with `stale_key_epoch` when machine B receives it.
13. **Authz — policy sync:** Update Cedar policy on machine A. Confirm machine B's PDP picks up the change without restart; UI updates `can()` decisions live.
14. **Quarantine lifecycle:** Generate quarantined mutations. Wait until TTL boundary (test with shortened TTL). Confirm: admin export writes `audit/quarantine-*.jsonl` to disk first, only then GC marks entries eligible; export failure aborts GC.
15. **Invite security:** Create an invite. Consume it on another device. Confirm a second acceptance is rejected (single-use). Create another invite with 1-hour TTL; wait past it; confirm rejection. Revoke a third invite; confirm rejection.
16. **Account-seed wrapping:** Export account with passphrase. Confirm exported blob contains no plaintext key material. Import with wrong passphrase rate-limits after N attempts.
17. **Concurrent edit lease:** Two devices open the same model. Confirm only the lease-holder can write `graphJson`; the other is read-only. Lease expiry releases the lock.
18. **Migration race:** Open the same legacy workspace from two Electron instances simultaneously. Confirm one completes migration, the other aborts with a clear error, and no duplicate `WorkspaceCoMap` is created.
19. **SVG sanitization:** Attach a crafted SVG containing `<script>` and `onload=` handlers. Confirm DOMPurify strips them before render.
20. **Lazy load + sync opt-in:** Workspace list with 50 entries. Confirm only the opted-in workspaces fetch content. Confirm individual models load on demand via `jazz-load-model`.
21. **Relay opt-out:** Set `disallowRelay = true` on a workspace. Confirm no payloads are sent to `wss://cloud.jazz.tools`; sync still works peer-to-peer.
22. **SQLite single-writer:** Launch a second Electron instance pointing at the same workspace. Confirm `.db.lock` rejects the open with a clear error; the first instance is unaffected.
23. **WAL checkpoint on quit:** Make many writes, then quit. Confirm `jazz.sqlite-wal` is truncated and `jazz.sqlite` contains all data on reopen.
24. **Backup snapshot:** Trigger "Snapshot workspace"; confirm `jazz.backup.sqlite` is produced via `VACUUM INTO`, opens standalone, and contains the latest state.
25. **Compaction:** After heavy graph editing, run admin compaction. Confirm history rows for replaced model `co_id`s are deleted, `VACUUM` shrinks the file, and the audit `CompactionEvent` is recorded.
26. **SQLCipher mode (optional):** Enable `KLIPPEL_DB_CIPHER=sqlcipher` with a passphrase. Confirm the file is unreadable without the key and that wrong-passphrase attempts are rate-limited.
