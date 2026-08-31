/**
 * Sync, attached to the workspace database.
 *
 * The client's lifetime is exactly the database's: it starts when a workspace
 * opens and stops when it closes. That is the honest coupling — a peer syncs
 * *a database*, and pointing one at a database that has since been swapped is
 * how you replicate one workspace's rows into another.
 *
 * Sync is a courier, never a dependency. Every read and write works with the
 * relay unreachable or absent; what is lost is other people's changes, not the
 * app.
 */
import type { Database as Db } from "better-sqlite3";

import { findWorkspace } from "../workspacesIndex";
import { startSyncClient, type SyncClient, type SyncClientStatus } from "./client";

interface Attached {
  workspace: string;
  room: string;
  client: SyncClient;
}

/** Where a workspace syncs, and under what shared identity. */
export interface SyncTarget {
  url: string;
  /**
   * The relay room. The workspace's `coId` — the identity peers agreed on when
   * one shared and the other joined — never the local folder name, which each
   * peer chooses for itself (the join dialog offers a rename, and the
   * collaborative tests use it).
   */
  room: string;
}

let attached: Attached | null = null;
const remoteListeners = new Set<(count: number) => void>();

/**
 * Where this workspace syncs, or `null` for a local-only one.
 *
 * Sharing is what decides *whether* to sync; `KLIPPEL_SYNC_URL` only overrides
 * *where*, so a harness (or a dev running a local relay) can redirect every
 * peer without editing indexes. It deliberately cannot switch sync on: every
 * peer would then join a room named by whatever local workspace it happened to
 * have open, and two unrelated databases that share a folder name would
 * replicate into each other.
 */
export function resolveSyncTarget(workspace: string): SyncTarget | null {
  const entry = findWorkspace(workspace);
  if (!entry?.syncOptIn || !entry.coId) return null;
  const url = process.env.KLIPPEL_SYNC_URL ?? entry.syncUrl;
  if (!url) return null;
  return { url, room: entry.coId };
}

/** Notified when changes from another peer land, so readers can refresh. */
export function onRemoteChanges(listener: (count: number) => void): () => void {
  remoteListeners.add(listener);
  return () => remoteListeners.delete(listener);
}

/**
 * Start syncing this database, if the workspace has somewhere to sync to.
 *
 * Safe to call for a database without cr-sqlite: there are no change records
 * to ship, so we say so and stay off rather than opening a connection that
 * could never carry anything.
 */
export function attachSync(
  workspace: string,
  db: Db,
  replicated: boolean,
): void {
  detachSync();
  const target = resolveSyncTarget(workspace);
  if (!target) return;
  if (!replicated) {
    console.warn(
      `[sync] ${workspace} has a sync URL but cr-sqlite is not active — ` +
        "not connecting, since nothing would replicate.",
    );
    return;
  }
  const client = startSyncClient({
    db,
    workspace: target.room,
    url: target.url,
    token: process.env.KLIPPEL_SYNC_TOKEN,
    onApplied: (count) => {
      for (const listener of [...remoteListeners]) {
        try {
          listener(count);
        } catch (err) {
          console.error("[sync] remote-change listener threw", err);
        }
      }
    },
  });
  attached = { workspace, room: target.room, client };
}

export function detachSync(): void {
  attached?.client.close();
  attached = null;
}

/**
 * Broadcast what this peer has written since its last push.
 *
 * Called from the write paths rather than on a timer: a change the user just
 * made should leave the machine now, and a timer would either add latency or
 * poll a database that usually has nothing new.
 */
export function pushLocalChanges(): void {
  if (!attached) return;
  try {
    attached.client.push();
  } catch (err) {
    console.error("[sync] push failed", err);
  }
}

/** The site id this database writes as, for diagnostics. */
export function syncSite(): string | null {
  return attached?.client.site ?? null;
}

export interface SyncStatus extends Partial<SyncClientStatus> {
  /** False when this workspace is local-only — the ordinary case. */
  enabled: boolean;
  /** The relay room: the workspace `coId` peers agreed on. */
  room: string | null;
}

/**
 * What the peer is doing, for the status surface and the two-peer debug
 * session.
 *
 * "Is my sync working" is otherwise unanswerable without reading logs: a
 * workspace that never opted in, a relay that is down, and a relay that is up
 * but has carried nothing all look identical from the UI.
 */
export function syncStatus(): SyncStatus {
  if (!attached) return { enabled: false, room: null };
  return { enabled: true, room: attached.room, ...attached.client.status() };
}
