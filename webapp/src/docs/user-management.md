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
│  ├── Account: cryptographic identity, persisted in workspace folder │
│  ├── CoValues: synced via Jazz Cloud relay or direct WebRTC peers   │
│  └── Local persistence: SQLite at {workspace}/jazz.sqlite           │
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

> **Graph storage rationale:** Graph nodes/edges are always loaded and saved as a whole unit (no collaborative per-node concurrent editing). Storing the graph as a serialized JSON string in a single CoMap field is faster (atomic replace) and avoids per-entry CRDT overhead. Per Jazz's own performance guidance: use `z.string()`/`z.object()` over nested CoMaps for data that updates atomically.

---

## PBAC (Policy-Based Access Control) Layer

Jazz's built-in Group roles (`reader`/`writer`/`admin`) are coarse-grained — workspace-level only. A custom PBAC layer on top provides fine-grained control: **per user × per module × per action**, expressed as explicit allow/deny policy statements rather than pre-defined role buckets.

### Concepts

- **Action** — a string identifier `"{Module}:{verb}"` for every command that mutates data (wildcards supported: `"Composer:*"`)
- **Policy** — a named document containing one or more statements; each statement carries an `effect` ("allow" or "deny") and a list of actions it covers
- **Assignment** — maps a Jazz account ID to a policy within a workspace
- **Evaluation order** — explicit `deny` overrides `allow`; default effect is `deny`

### Built-in Policies (not deletable)

| Policy     | Statements                                                           |
| ---------- | -------------------------------------------------------------------- |
| `owner`  | Allow all actions (implicit for workspace creator)                   |
| `admin`  | Allow all actions including `Permissions:*`                         |
| `editor` | Allow all content actions (`Composer:*`, `Materials:*`, `Orders:*`) |
| `viewer` | Allow read-only implicit access; deny all mutation actions           |

Custom policies can be created with any combination of allow/deny statements targeting specific actions or wildcards.

### Action Catalog (by module)

```
Composer:createModel      Composer:updateModel    Composer:deleteModel
Composer:updateGraph      Composer:attachSvg
Materials:createMaterial  Materials:updateMaterial  Materials:deleteMaterial
Orders:createBudget       Orders:updateBudget       Orders:deleteBudget
Store:shareWorkspace      Store:acceptInvite
Permissions:createPolicy  Permissions:updatePolicy  Permissions:deletePolicy
Permissions:assignPolicy  Permissions:revokePolicy
```

---

## PBAC CoSchema — additions to `src/kernel/modules/Store/schema.ts`

```typescript
// A single allow/deny statement within a policy.
// statementsJson on PolicyCoMap is a JSON array of these objects (stored inline
// for atomic updates — avoids per-statement CRDT overhead).
interface PolicyStatement {
  effect: "allow" | "deny";
  actions: string[];   // e.g. ["Composer:*"] or ["Materials:createMaterial"]
}

export class PolicyCoMap extends CoMap {
  id = co.string;
  name = co.string;
  description = co.optional.string;
  statementsJson = co.string;  // JSON array of PolicyStatement objects
  isBuiltIn = co.boolean;      // built-in policies cannot be deleted
}

export class PoliciesMap extends CoMap.Record(PolicyCoMap) {}  // keyed by policyId

export class UserPolicyAssignment extends CoMap {
  accountId = co.string;   // Jazz Account public ID
  policyId = co.string;
}

export class UserPoliciesList extends CoList.Of(co.ref(UserPolicyAssignment)) {}

// WorkspaceCoMap gains two new fields:
export class WorkspaceCoMap extends CoMap {
  metadata = co.ref(WorkspaceMetadata);
  models = co.ref(ModelsMap);
  materials = co.ref(MaterialsList);
  budgets = co.ref(BudgetsList);
  policies = co.ref(PoliciesMap);           // NEW — all policies for this workspace
  userPolicies = co.ref(UserPoliciesList);  // NEW — account → policy assignments
}
```

---

## Permissions Module — `src/kernel/modules/Permissions/` (NEW KERNEL MODULE)

This is a new kernel module that loads after `Store` and before domain modules (Composer, Materials, Orders). It gates all command actions.

### `index.ts`

```typescript
interface IPermissionsModule extends IModule {
  name: "Permissions";
  depends_on: ["Store"];
  hooks: {
    usePermissions: () => PermissionsHook;
    useCurrentUserPolicy: () => PolicyCoMap | undefined;
  };
  components: {
    PolicyManager: React.FC;         // admin panel: CRUD policies
    UserPermissionsPanel: React.FC;  // admin panel: assign policies to members
  };
}
```

### `slice.ts`

```typescript
interface PolicyStatement {
  effect: "allow" | "deny";
  actions: string[];
}

interface PermissionsState {
  policies: Record<string, { id: string; name: string; statements: PolicyStatement[]; isBuiltIn: boolean }>;
  userPolicies: Array<{ accountId: string; policyId: string }>;
  currentUserPolicyId: string | undefined;
}
```

### `middlewares.ts`

Two responsibilities:

1. **Sync**: on workspace load, hydrate `PermissionsState` from Jazz `WorkspaceCoMap.policies` and `.userPolicies`
2. **Enforcement**: intercept all command actions tagged with `meta.requiredPermission`. Evaluate the current user's policy statements (deny overrides allow, default deny) and block + dispatch `permissionDenied` if not allowed:

```typescript
function evaluate(statements: PolicyStatement[], action: string): boolean {
  const matches = (pattern: string) =>
    pattern === action ||
    (pattern.endsWith(":*") && action.startsWith(pattern.slice(0, -1)));

  // Explicit deny wins regardless of allow statements
  if (statements.some(s => s.effect === "deny" && s.actions.some(matches))) return false;
  return statements.some(s => s.effect === "allow" && s.actions.some(matches));
}

middlewares.startListening({
  predicate: (action) => action?.meta?.requiredPermission !== undefined,
  effect: async (action, { getState, dispatch }) => {
    const permission = action.meta.requiredPermission as string;
    const { Permissions } = getState();
    const policy = Permissions.policies[Permissions.currentUserPolicyId];
    if (!policy || !evaluate(policy.statements, permission)) {
      dispatch(permissionDenied({ action: action.type, required: permission }));
    }
  }
});
```

Each command action in domain modules gets a `meta.requiredPermission` tag:

```typescript
export const createModel = createAction(
  "Composer/createModel",
  (payload) => ({ payload, meta: { requiredPermission: "Composer:createModel" } })
);
```

### `hooks/usePermissions.ts`

```typescript
function usePermissions(): {
  can: (action: string) => boolean;
  isAdmin: boolean;
}
```

Used in components to conditionally render admin controls or disable buttons.

### `components/PolicyManager.tsx`

- Table listing all policies (name, description, statement rows per action with allow/deny toggle)
- Actions grouped by module (Composer, Materials, Orders, Store, Permissions)
- "New Policy" button → inline row creation with empty statement list
- Edit policy name/description inline
- Add/remove statements per policy (effect + actions)
- Delete policy button (disabled for built-in policies)
- Changes dispatch `createPolicy` / `updatePolicy` / `deletePolicy` commands
- Only visible to users with `Permissions:createPolicy` permission

### `components/UserPermissionsPanel.tsx`

- Lists all workspace members (from Jazz Group membership)
- Shows each member's current policy (dropdown to change)
- Dispatches `assignPolicy` / `revokePolicy` commands
- Only visible to users with `Permissions:assignPolicy` permission

### New actions in `actions.ts`

```typescript
export const createPolicy = createAction<{ name: string; statements: PolicyStatement[] }>("Permissions/createPolicy");
export const updatePolicy = createAction<{ policyId: string; name?: string; description?: string; statements?: PolicyStatement[] }>("Permissions/updatePolicy");
export const deletePolicy = createAction<{ policyId: string }>("Permissions/deletePolicy");
export const assignPolicy = createAction<{ accountId: string; policyId: string }>("Permissions/assignPolicy");
export const revokePolicy = createAction<{ accountId: string }>("Permissions/revokePolicy");
export const permissionDenied = createAction<{ action: string; required: string }>("Permissions/permissionDenied");
```

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

export class WorkspaceCoMap extends CoMap {
  metadata = co.ref(WorkspaceMetadata);
  models = co.ref(ModelsMap);
  materials = co.ref(MaterialsList);
  budgets = co.ref(BudgetsList);
}

export class WorkspaceList extends CoList.Of(co.ref(WorkspaceCoMap)) {}

export class KlippelAccount extends Account {
  workspaces = co.ref(WorkspaceList);
}
```

---

## Layer 1: Jazz Node — `electron/main/jazz.ts` (NEW)

```typescript
import { createJazzNode } from "jazz-nodejs";
import { KlippelAccount } from "../../src/kernel/modules/Store/schema";

export async function initJazzNode(workspacePath: string) {
  const node = await createJazzNode({
    AccountSchema: KlippelAccount,
    storage: { type: "sqlite", path: `${workspacePath}/jazz.sqlite` },
    sync: { server: "wss://cloud.jazz.tools" },  // optional, configurable
  });
  return node;
}
```

Jazz data — CoValues and the account identity — lives in `jazz.sqlite` inside the active workspace folder, co-located with other workspace files.

**IPC handlers to register (in `electron/main/jazz.ts`):**

| Handler                   | Type       | Purpose                                  |
| ------------------------- | ---------- | ---------------------------------------- |
| `jazz-get-account-id`   | `handle` | Returns account public ID                |
| `jazz-create-workspace` | `handle` | Creates WorkspaceCoMap, returns CoID     |
| `jazz-list-workspaces`  | `handle` | Returns array of `{name, coId}`        |
| `jazz-load-workspace`   | `handle` | Returns full workspace CoValue snapshot  |
| `jazz-mutate`           | `handle` | Apply a mutation patch to a CoValue      |
| `jazz-share-workspace`  | `handle` | Creates invite link (defaultPolicy name) |
| `jazz-accept-invite`    | `handle` | Joins shared workspace via invite link   |
| `jazz-subscribe`        | `on`     | Subscribe renderer to CoValue updates    |
| `jazz-unsubscribe`      | `on`     | Unsubscribe                              |

Jazz change callbacks → fire `jazz-update-{coId}` IPC events back to renderer.

---

## Layer 2: Preload Bridge — `electron/preload/jazz.ts` (NEW)

```typescript
export const jazzApi = {
  getAccountId: () => ipcRenderer.invoke("jazz-get-account-id"),
  createWorkspace: (name: string) => ipcRenderer.invoke("jazz-create-workspace", name),
  listWorkspaces: () => ipcRenderer.invoke("jazz-list-workspaces"),
  loadWorkspace: (coId: string) => ipcRenderer.invoke("jazz-load-workspace", coId),
  mutate: (coId: string, patch: unknown) => ipcRenderer.invoke("jazz-mutate", { coId, patch }),
  shareWorkspace: (coId: string, defaultPolicy: string) =>
    ipcRenderer.invoke("jazz-share-workspace", { coId, defaultPolicy }),
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
export const shareWorkspace = createAction<{ workspace: string; defaultPolicy: string }>("Store/shareWorkspace");
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
- Default policy selector (built-in or custom policies)
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
// After: const workspacePath = ...
const jazzNode = await initJazzNode(workspacePath);   // NEW — before window creation
initJazzHooks(jazzNode, mainWindow);                  // NEW

// Remove: const heliaNode = await initHeliaNode(workspace)
// Remove: initHeliaHooks(heliaNode)
// Keep: existing scheduler, storage hooks
```

The Helia files (`electron/main/ipfs.ts`, `electron/preload/ipfs.ts`) can be left dormant or deleted — they have no active callers.

---

## Migration Strategy (Legacy Workspaces)

On first launch after the upgrade, for each existing local workspace:

1. Read existing `workspaces/{name}/Models/` from disk
2. Create a Jazz `WorkspaceCoMap` and populate it from the local files
3. Write the returned `coId` to a local manifest file (`workspaces/{name}/.jazz-id`) so future launches skip migration
4. Continue using local files as read-only fallback during migration

This is incremental — old workspaces continue to work; each migrates once on first open.

---

## File Change Summary

| File                                                                      | Change                                                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `electron/main/jazz.ts`                                                 | NEW — Jazz node init (SQLite storage) + all IPC handlers                               |
| `electron/main/index.ts`                                                | MODIFY — call initJazzNode, remove Helia init                                          |
| `electron/preload/jazz.ts`                                              | NEW — Jazz IPC bridge                                                                  |
| `electron/preload/index.ts`                                             | MODIFY — expose `jazz` in contextBridge                                              |
| `electron/preload/typings.ts`                                           | MODIFY — add JazzAPI type                                                              |
| `electron/main/ipfs.ts`                                                 | DORMANT (no callers, leave or delete)                                                   |
| `electron/preload/ipfs.ts`                                              | DORMANT (was already empty)                                                             |
| `src/kernel/modules/Store/schema.ts`                                    | NEW — CoSchema definitions (includes PBAC types)                                       |
| `src/kernel/modules/Store/slice.ts`                                     | MODIFY — add coId, syncStatus, accountId                                               |
| `src/kernel/modules/Store/middlewares.ts`                               | MODIFY — Jazz mutations replace JSON file writes for workspace data                    |
| `src/kernel/modules/Store/actions.ts`                                   | MODIFY — add share/invite/syncStatus actions                                           |
| `src/kernel/modules/Store/components/WorkspaceShare.tsx`                | NEW                                                                                     |
| `src/kernel/modules/Store/components/AccountSettings.tsx`               | NEW                                                                                     |
| `src/kernel/modules/Permissions/index.ts`                               | NEW — kernel module definition                                                         |
| `src/kernel/modules/Permissions/slice.ts`                               | NEW — policies, userPolicies, currentUserPolicyId state                                |
| `src/kernel/modules/Permissions/middlewares.ts`                         | NEW — policy evaluation (deny overrides allow, default deny) + Jazz sync               |
| `src/kernel/modules/Permissions/actions.ts`                             | NEW — createPolicy, updatePolicy, deletePolicy, assignPolicy, revokePolicy, permissionDenied |
| `src/kernel/modules/Permissions/hooks/usePermissions.ts`                | NEW — `can(action)` hook using policy evaluation                                     |
| `src/kernel/modules/Permissions/components/PolicyManager.tsx`           | NEW — CRUD UI for policies and their statements                                        |
| `src/kernel/modules/Permissions/components/UserPermissionsPanel.tsx`    | NEW — assign policies to members                                                       |
| `src/system/modules/Composer/actions.ts`                                | MODIFY — tag commands with `meta.requiredPermission`                                 |
| `src/system/modules/Composer/middlewares.ts`                            | MODIFY — graph/SVG save/load via Jazz                                                  |
| `src/system/modules/Materials/actions.ts`                               | MODIFY — tag commands with `meta.requiredPermission`                                 |
| `src/system/modules/Materials/middlewares.ts`                           | MODIFY — materials via Jazz                                                            |
| `src/system/modules/Orders/actions.ts`                                  | MODIFY — tag commands with `meta.requiredPermission`                                 |

## Dependencies to Add

```json
{
  "jazz-tools": "^0.x",
  "jazz-nodejs": "^0.x"
}
```

No other new dependencies. Helia packages remain in package.json but become unused.

---

## Verification Plan

1. **Offline first:** Start with no network. Create workspace, add model, add materials. Quit and reopen. Confirm everything reloads from Jazz local SQLite.
2. **Single-device round-trip:** Verify workspace list, graph, and materials reload from Jazz CoValues (not `.session/` JSON files) on relaunch.
3. **Multi-device sync:** Copy account seed to second machine. Create a model on machine A. Confirm it appears on machine B after both go online.
4. **Sharing:** Generate invite link from machine A. Accept on machine B with a different account. Verify the default policy is applied on join.
5. **Legacy migration:** Open an old local workspace (no `.jazz-id` file). Verify auto-migration creates Jazz CoValues and writes `.jazz-id`. Subsequent opens skip migration.
6. **Graph fidelity:** Save a complex graph (50+ nodes, 100+ edges). Reload. Verify round-trip through `graphJson` serialization is lossless.
7. **SVG via BinaryCoStream:** Attach an SVG to a model. Confirm it syncs to second device and renders correctly.
8. **Existing session state unaffected:** Layout, viewport positions, and theme still persist to `.session/` files as before.
9. **PBAC — policy CRUD:** As admin, create a custom policy "Cost Analyst" with allow statements for `Materials:*` and `Orders:*`. Update its name. Delete it. Verify built-in policies cannot be deleted.
10. **PBAC — deny override:** Create a policy with `allow: ["Composer:*"]` and `deny: ["Composer:deleteModel"]`. Assign to a member. Confirm they can create and update models but cannot delete one.
11. **PBAC — enforcement:** Assign a member the `viewer` policy. Confirm they cannot create a model (`Composer:createModel` blocked), receive `permissionDenied` in Redux, and the UI disables the create button via `usePermissions().can()`.
12. **PBAC — assign/revoke:** Assign a member from `viewer` to `editor`. Confirm they can now save graph changes. Revoke back to `viewer`. Confirm access is revoked.
13. **PBAC — sync:** Update a policy's statements on machine A (admin). Confirm the updated policy syncs to machine B (member) without restart.
14. **SQLite co-location:** Confirm `jazz.sqlite` is created inside the workspace folder on first launch and that switching workspaces loads data from the correct SQLite file.
