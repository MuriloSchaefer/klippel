/**
 * The wire format for `crsql_changes` rows.
 *
 * A change row is `(table, pk, cid, val, col_version, db_version, site_id, cl,
 * seq)`, and three of those are BLOBs — `pk`, `site_id`, and `val` whenever the
 * column being replicated holds one (an attachment's bytes, for instance).
 * JSON cannot carry a BLOB, so values are tagged on the way out and rebuilt on
 * the way in.
 *
 * This is the layer where a mistake is silent and permanent: a value that
 * round-trips as the wrong *type* still applies cleanly and leaves one peer
 * holding `"123"` where another holds `123`, or a corrupted primary key that
 * merges two rows into one. It is therefore deliberately explicit — every
 * SQLite storage class is tagged, nothing is inferred from shape — and tested
 * directly (`wire.test.ts`).
 */

/** SQLite's storage classes, as they cross the wire. */
export type WireValue =
  | null
  | { t: "i"; v: string } // integer, as a string so BigInt survives JSON
  | { t: "f"; v: number } // real
  | { t: "s"; v: string } // text
  | { t: "b"; v: string }; // blob, base64

/** One `crsql_changes` row, ready for `JSON.stringify`. */
export interface WireChange {
  table: string;
  pk: WireValue;
  cid: string;
  val: WireValue;
  colVersion: string;
  dbVersion: string;
  siteId: string;
  cl: string;
  seq: string;
}

/** What better-sqlite3 hands back for a change row. */
export interface RawChange {
  table: string;
  pk: unknown;
  cid: string;
  val: unknown;
  col_version: bigint | number;
  db_version: bigint | number;
  site_id: unknown;
  cl: bigint | number;
  seq: bigint | number;
}

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");

/**
 * Tag one value by its storage class.
 *
 * Integers travel as strings: cr-sqlite's versions are 64-bit, and a JSON
 * number would silently lose precision past 2^53. That is not hypothetical
 * for a `db_version` on a long-lived database.
 */
export function encodeValue(value: unknown): WireValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return { t: "i", v: value.toString() };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { t: "i", v: String(value) }
      : { t: "f", v: value };
  }
  if (typeof value === "string") return { t: "s", v: value };
  if (value instanceof Uint8Array) return { t: "b", v: toBase64(value) };
  if (Buffer.isBuffer(value)) return { t: "b", v: value.toString("base64") };
  throw new Error(
    `sync/wire: cannot encode value of type ${typeof value} (${String(value)})`,
  );
}

/** Rebuild a value for binding back into SQLite. */
export function decodeValue(wire: WireValue): unknown {
  if (wire === null) return null;
  switch (wire.t) {
    case "i": {
      const asBig = BigInt(wire.v);
      // Bind as a plain number when it fits, because better-sqlite3 rejects
      // BigInt unless the connection opts in; fall back to BigInt past 2^53
      // rather than lose the value.
      return asBig <= BigInt(Number.MAX_SAFE_INTEGER) &&
        asBig >= BigInt(Number.MIN_SAFE_INTEGER)
        ? Number(asBig)
        : asBig;
    }
    case "f":
      return wire.v;
    case "s":
      return wire.v;
    case "b":
      return Buffer.from(wire.v, "base64");
    default: {
      const exhaustive: never = wire;
      throw new Error(`sync/wire: unknown tag ${JSON.stringify(exhaustive)}`);
    }
  }
}

const bigToString = (value: bigint | number): string =>
  typeof value === "bigint" ? value.toString() : String(value);

export function encodeChange(row: RawChange): WireChange {
  return {
    table: row.table,
    pk: encodeValue(row.pk),
    cid: row.cid,
    val: encodeValue(row.val),
    colVersion: bigToString(row.col_version),
    dbVersion: bigToString(row.db_version),
    // Always present on a change row and always a BLOB; carried as hex because
    // it is also how a site is named everywhere else in the protocol.
    siteId: Buffer.isBuffer(row.site_id)
      ? row.site_id.toString("hex")
      : Buffer.from(row.site_id as Uint8Array).toString("hex"),
    cl: bigToString(row.cl),
    seq: bigToString(row.seq),
  };
}

/** Positional parameters for `INSERT INTO crsql_changes`, in column order. */
export function decodeChange(change: WireChange): unknown[] {
  return [
    change.table,
    decodeValue(change.pk),
    change.cid,
    decodeValue(change.val),
    decodeValue({ t: "i", v: change.colVersion }),
    decodeValue({ t: "i", v: change.dbVersion }),
    Buffer.from(change.siteId, "hex"),
    decodeValue({ t: "i", v: change.cl }),
    decodeValue({ t: "i", v: change.seq }),
  ];
}
