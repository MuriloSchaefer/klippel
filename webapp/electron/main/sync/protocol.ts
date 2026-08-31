/**
 * The sync protocol, in one place.
 *
 * Three messages, and the relay understands only the first. Everything else it
 * forwards verbatim to the other members of a workspace room — the logic lives
 * in the peers, which is what keeps the server replaceable and small.
 *
 * ## Trust model — read this before changing anything here
 *
 * The relay is **trusted**. It sees every change in plaintext and nothing stops
 * it forging one. This is a deliberate step down from what Jazz provided,
 * where every change was signed by its author and the relay saw only encrypted
 * payloads it could neither read nor alter (`docs/join-workspaces.md`).
 *
 * Decided 2026-08-30, knowingly: rebuilding zero-knowledge means client-side
 * encryption plus per-peer signatures, which is a crypto design rather than a
 * transport, and it interacts badly with a merge the database performs for us.
 * Recorded rather than glossed, because a doc that implied the old guarantee
 * still held would be worse than the loss itself.
 *
 * What follows from it: the relay must be operated by whoever owns the data,
 * and peers must authenticate to it. A public relay is not an option under
 * this design.
 */
import type { WireChange } from "./wire";

/** Protocol version. Bumped when a message shape changes incompatibly. */
export const SYNC_PROTOCOL = 1;

/**
 * Join a workspace room. The only message the relay interprets.
 *
 * `workspace` is the room key: peers only ever see changes for the workspace
 * they named, so one relay can carry many without them mixing.
 */
export interface HelloMessage {
  t: "hello";
  v: number;
  workspace: string;
  site: string;
  /** Shared secret for the room. See the trust model above. */
  token?: string;
}

/**
 * "Tell me what I have missed."
 *
 * `have` maps a peer's site id to the highest `db_version` we have applied
 * *from that peer's database*. Each peer re-stamps changes it applies with its
 * own clock while preserving the originating site, so this is a cursor into
 * the sender's database, not into the original author's.
 */
export interface WantMessage {
  t: "want";
  site: string;
  have: Record<string, string>;
}

/**
 * A peer joined the room — the one message the relay *originates*.
 *
 * Without it, catch-up would depend on connection order: a peer asks `want`
 * when it connects, and a peer that connects later never hears the question.
 * On seeing a join, every member re-asks, so a gap closes whichever way round
 * the two peers arrived.
 */
export interface JoinedMessage {
  t: "joined";
  site: string;
}

/** Changes from one peer. `rows` is ordered by `db_version` ascending. */
export interface ChangesMessage {
  t: "changes";
  site: string;
  rows: WireChange[];
  /** Highest `db_version` in `rows`, so the receiver can move its cursor. */
  head: string;
}

export type SyncMessage =
  | HelloMessage
  | WantMessage
  | ChangesMessage
  | JoinedMessage;

/** Narrow an untrusted payload to a protocol message, or `null`. */
export function parseMessage(raw: string): SyncMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const t = (value as { t?: unknown }).t;
  if (t === "hello" || t === "want" || t === "changes" || t === "joined") {
    return value as SyncMessage;
  }
  return null;
}
