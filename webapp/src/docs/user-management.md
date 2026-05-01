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
│  └── Local persistence: LevelDB under .jazz/db                     │
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

## RBAC (Role-Based Access Control) Layer

Jazz's built-in Group roles (`reader`/`writer`/`admin`) are coarse-grained — workspace-level only. A custom RBAC layer on top provides fine-grained control: **per user × per module × per action**.

### Concepts

- **Action** — a string identifier `"{Module}:{verb}"` for every command that mutates data
- **Role** — a named set of allowed actions (custom, creatable by admin)
- **Assignment** — maps a Jazz account ID to a role within a workspace
- **Admin** — workspace owner always has all permissions; other admins are assigned the built-in `admin` role

### Built-in Roles (not deletable)

| Role       | Allowed actions                                                      |
| ---------- | -------------------------------------------------------------------- |
| `owner`  | All actions (implicit, workspace creator)                            |
| `admin`  | All actions + manage roles + assign roles                            |
| `editor` | All content actions (create/update/delete models, materials, orders) |
| `viewer` | Read-only (no mutation actions)                                      |

Custom roles can be created, named, and granted any subset of actions.

### Action Catalog (by module)

```
Composer:createModel      Composer:updateModel    Composer:deleteModel
Composer:updateGraph      Composer:attachSvg
Materials:createMaterial  Materials:updateMaterial  Materials:deleteMaterial
Orders:createBudget       Orders:updateBudget       Orders:deleteBudget
Store:shareWorkspace      Store:acceptInvite
Permissions:createRole    Permissions:updateRole    Permissions:deleteRole
Permissions:assignRole    Permissions:revokeRole
```

---

## RBAC CoSchema — additions to `src/kernel/modules/Store/schema.ts`

```typescript
export class RoleCoMap extends CoMap {
  id = co.string;
  name = co.string;
  description = co.optional.string;
  allowedActionsJson = co.string;  // JSON array of action strings
  isBuiltIn = co.boolean;          // built-in roles cannot be deleted
}

export class RolesMap extends CoMap.Record(RoleCoMap) {}  // keyed by roleId

export class UserRoleAssignment extends CoMap {
  accountId = co.string;   // Jazz Account public ID
  roleId = co.string;
}

export class UserRolesList extends CoList.Of(co.ref(UserRoleAssignment)) {}

// WorkspaceCoMap gains two new fields:
export class WorkspaceCoMap extends CoMap {
  metadata = co.ref(WorkspaceMetadata);
  models = co.ref(ModelsMap);
  materials = co.ref(MaterialsList);
  budgets = co.ref(BudgetsList);
  roles = co.ref(RolesMap);            // NEW — all roles for this workspace
  userRoles = co.ref(UserRolesList);   // NEW — account → role assignments
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
    useCurrentUserRole: () => RoleCoMap | undefined;
  };
  components: {
    RoleManager: React.FC;          // admin panel: CRUD roles
    UserPermissionsPanel: React.FC; // admin panel: assign roles to members
  };
}
```

### `slice.ts`

```typescript
interface PermissionsState {
  roles: Record<string, { id: string; name: string; allowedActions: string[]; isBuiltIn: boolean }>;
  userRoles: Array<{ accountId: string; roleId: string }>;
  currentUserRoleId: string | undefined;
}
```

### `middlewares.ts`

Two responsibilities:

1. **Sync**: on workspace load, hydrate `PermissionsState` from Jazz `WorkspaceCoMap.roles` and `.userRoles`
2. **Enforcement**: intercept all command actions tagged with `meta.requiredPermission`. Block + dispatch `permissionDenied` if the current user's role doesn't include the required action:

```typescript
middlewares.startListening({
  predicate: (action) => action?.meta?.requiredPermission !== undefined,
  effect: async (action, { getState, dispatch }) => {
    const permission = action.meta.requiredPermission as string;
    const { Permissions, Store } = getState();
    const myRole = Permissions.roles[Permissions.currentUserRoleId];
    if (!myRole?.allowedActions.includes(permission)) {
      dispatch(permissionDenied({ action: action.type, required: permission }));
      // returning here stops the action from reaching domain middleware
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

### `components/RoleManager.tsx`

- Table listing all roles (name, description, action checkboxes)
- Actions grouped by module (Composer, Materials, Orders, Store, Permissions)
- "New Role" button → inline row creation
- Edit role name/description inline
- Delete role button (disabled for built-in roles)
- Changes dispatch `createRole` / `updateRole` / `deleteRole` commands
- Only visible to users with `Permissions:createRole` permission

### `components/UserPermissionsPanel.tsx`

- Lists all workspace members (from Jazz Group membership)
- Shows each member's current role (dropdown to change)
- Dispatches `assignRole` / `revokeRole` commands
- Only visible to users with `Permissions:assignRole` permission

### New actions in `actions.ts`

```typescript
export const createRole = createAction<{ name: string; allowedActions: string[] }>("Permissions/createRole");
export const updateRole = createAction<{ roleId: string; name?: string; description?: string; allowedActions?: string[] }>("Permissions/updateRole");
export const deleteRole = createAction<{ roleId: string }>("Permissions/deleteRole");
export const assignRole = createAction<{ accountId: string; roleId: string }>("Permissions/assignRole");
export const revokeRole = createAction<{ accountId: string }>("Permissions/revokeRole");
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

export async function initJazzNode(homePath: string) {
  const node = await createJazzNode({
    AccountSchema: KlippelAccount,
    storage: { type: "leveldb", path: `${homePath}/.jazz/db` },
    sync: { server: "wss://cloud.jazz.tools" },  // optional, configurable
  });
  return node;
}
```

**IPC handlers to register (in `electron/main/jazz.ts`):**

| Handler                   | Type       | Purpose                                  |
| ------------------------- | ---------- | ---------------------------------------- |
| `jazz-get-account-id`   | `handle` | Returns account public ID                |
| `jazz-create-workspace` | `handle` | Creates WorkspaceCoMap, returns CoID     |
| `jazz-list-workspaces`  | `handle` | Returns array of `{name, coId}`        |
| `jazz-load-workspace`   | `handle` | Returns full workspace CoValue snapshot  |
| `jazz-mutate`           | `handle` | Apply a mutation patch to a CoValue      |
| `jazz-share-workspace`  | `handle` | Creates invite link (reader/editor role) |
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
const jazzNode = await initJazzNode(homePath);   // NEW — before window creation
initJazzHooks(jazzNode, mainWindow);              // NEW

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

| File                                                                   | Change                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `electron/main/jazz.ts`                                              | NEW — Jazz node init + all IPC handlers                                            |
| `electron/main/index.ts`                                             | MODIFY — call initJazzNode, remove Helia init                                      |
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
| `src/kernel/modules/Permissions/index.ts`                            | NEW — kernel module definition                                                     |
| `src/kernel/modules/Permissions/slice.ts`                            | NEW — roles, userRoles, currentUserRoleId state                                    |
| `src/kernel/modules/Permissions/middlewares.ts`                      | NEW — permission enforcement + Jazz sync                                           |
| `src/kernel/modules/Permissions/actions.ts`                          | NEW — createRole, updateRole, deleteRole, assignRole, revokeRole, permissionDenied |
| `src/kernel/modules/Permissions/hooks/usePermissions.ts`             | NEW —`can(action)` hook                                                          |
| `src/kernel/modules/Permissions/components/RoleManager.tsx`          | NEW — CRUD UI for roles                                                            |
| `src/kernel/modules/Permissions/components/UserPermissionsPanel.tsx` | NEW — assign roles to members                                                      |
| `src/system/modules/Composer/actions.ts`                             | MODIFY — tag commands with `meta.requiredPermission`                             |
| `src/system/modules/Composer/middlewares.ts`                         | MODIFY — graph/SVG save/load via Jazz                                              |
| `src/system/modules/Materials/actions.ts`                            | MODIFY — tag commands with `meta.requiredPermission`                             |
| `src/system/modules/Materials/middlewares.ts`                        | MODIFY — materials via Jazz                                                        |
| `src/system/modules/Orders/actions.ts`                               | MODIFY — tag commands with `meta.requiredPermission`                             |

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

1. **Offline first:** Start with no network. Create workspace, add model, add materials. Quit and reopen. Confirm everything reloads from Jazz local LevelDB.
2. **Single-device round-trip:** Verify workspace list, graph, and materials reload from Jazz CoValues (not `.session/` JSON files) on relaunch.
3. **Multi-device sync:** Copy account seed to second machine. Create a model on machine A. Confirm it appears on machine B after both go online.
4. **Sharing:** Generate invite link from machine A. Accept on machine B with a different account. Verify reader can view, editor can modify.
5. **Legacy migration:** Open an old local workspace (no `.jazz-id` file). Verify auto-migration creates Jazz CoValues and writes `.jazz-id`. Subsequent opens skip migration.
6. **Graph fidelity:** Save a complex graph (50+ nodes, 100+ edges). Reload. Verify round-trip through `graphJson` serialization is lossless.
7. **SVG via BinaryCoStream:** Attach an SVG to a model. Confirm it syncs to second device and renders correctly.
8. **Existing session state unaffected:** Layout, viewport positions, and theme still persist to `.session/` files as before.
9. **RBAC — role CRUD:** As admin, create a custom role "Cost Analyst" with only `Materials:*` and `Orders:*` actions. Update its name. Delete it. Verify built-in roles cannot be deleted.
10. **RBAC — enforcement:** Assign a member the `viewer` role. Confirm they cannot create a model (`Composer:createModel` blocked), receive `permissionDenied` action in Redux, and the UI disables the create button via `usePermissions().can()`.
11. **RBAC — assign/revoke:** Assign a member from `viewer` to `editor`. Confirm they can now save graph changes. Revoke back to `viewer`. Confirm access is revoked.
12. **RBAC — sync:** Change a role's permissions on machine A (admin). Confirm the updated permission set syncs to machine B (member) without restart.
