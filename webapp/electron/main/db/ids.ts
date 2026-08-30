/**
 * Storage identity: a UUID derived from the row's domain key.
 *
 * Replicated tables are keyed by UUID rather than by the domain id the app
 * uses (`mat-1743`, `conformsTo:mat-1743`, `linha@0.0.5`, `mundialtextil`).
 * The domain id stays on the row, in a `*_key` column, and is what every DTO
 * still carries as `id` — nothing outside this directory sees a UUID.
 *
 * **Derived, not random.** A v5 UUID is a hash of (namespace, name), so two
 * peers projecting the same catalog, or importing the same supplier row,
 * compute the *same* UUID for it. A random v4/v7 key would give them different
 * primary keys for the same material and replication would deliver two rows
 * where the user has one. Determinism is the whole point of hashing here: the
 * key is a function of identity, so identity is what merges.
 *
 * The trade is the mirror image: two genuinely different materials that happen
 * to share a domain key merge into one row rather than colliding visibly. That
 * is the behaviour the app has today (the domain key *is* the identity), so
 * this preserves it rather than changing it.
 */
import { createHash } from "crypto";

/**
 * Per-table namespaces. Fixed forever: changing one re-keys every row of that
 * table and makes an old peer's rows look like new ones.
 */
export const NAMESPACES = {
  material: "6f1c7d20-7b1a-5e6a-9c4b-2f8b0a1d3e51",
  edge: "0d2a9f14-3c58-5b77-8a10-6e9c4b2d7f83",
  materialType: "b4e6a1c8-5d29-5f34-9e71-1a3c8d5f2b60",
  organization: "3a8f5b62-9e14-5c48-8d27-7b1e6a9f4c05",
  model: "c7d4e0a9-2b63-5a1f-9f38-4e5d7c2b8a16",
  modelDocument: "e2b90f47-6c15-5d83-8b24-9a7f3e1c6d05",
} as const;

export type IdNamespace = keyof typeof NAMESPACES;

const hexToBytes = (hex: string): Buffer =>
  Buffer.from(hex.replace(/-/g, ""), "hex");

/**
 * RFC 4122 v5 — SHA-1 over the namespace bytes and the name, with the version
 * and variant bits stamped in.
 *
 * SHA-1 is specified by v5 and is not doing security work here: it is a
 * name-to-identifier function, and collisions between two distinct domain keys
 * are not an attack we are defending against.
 */
export function uuidV5(namespace: string, name: string): string {
  const hash = createHash("sha1")
    .update(hexToBytes(namespace))
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** The storage id for a domain key in one of the catalog's tables. */
export function storageId(namespace: IdNamespace, key: string): string {
  return uuidV5(NAMESPACES[namespace], key);
}
