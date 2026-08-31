/**
 * The wire format, asserted directly.
 *
 * Every failure mode here is silent: a value that round-trips as the wrong
 * storage class still *applies*, and leaves one peer holding `"123"` where
 * another holds `123`. Nothing downstream errors — the databases just quietly
 * disagree, and the next merge picks a winner between two things that were
 * meant to be the same. So the round trip is pinned per type rather than
 * inferred from a converging pair of databases.
 */
import { decodeValue, encodeValue, encodeChange, decodeChange } from "./wire";

const roundTrip = (value: unknown) => decodeValue(encodeValue(value));

describe("value encoding", () => {
  it("keeps text, integers and reals distinct", () => {
    expect(roundTrip("123")).toBe("123");
    expect(roundTrip(123)).toBe(123);
    expect(roundTrip(1.5)).toBe(1.5);
    // The one that matters: a numeric string must not come back a number.
    expect(typeof roundTrip("123")).toBe("string");
    expect(typeof roundTrip(123)).toBe("number");
  });

  it("carries integers past 2^53 without losing precision", () => {
    // `db_version` and `col_version` are 64-bit. A JSON number would round
    // these, and a version that moves backwards breaks merge ordering.
    const big = 9007199254740993n; // 2^53 + 1
    expect(roundTrip(big)).toBe(big);
    expect(encodeValue(big)).toEqual({ t: "i", v: "9007199254740993" });
  });

  it("round-trips a blob byte for byte", () => {
    // 0x00 and 0xFF are the bytes a text-based encoding mangles.
    const bytes = Buffer.from([0, 255, 16, 7, 0]);
    const back = roundTrip(bytes) as Buffer;
    expect(Buffer.isBuffer(back)).toBe(true);
    expect([...back]).toEqual([0, 255, 16, 7, 0]);
  });

  it("treats null and undefined as SQL NULL", () => {
    expect(roundTrip(null)).toBeNull();
    expect(roundTrip(undefined)).toBeNull();
  });

  it("refuses a value it cannot represent", () => {
    // Better to fail at the boundary than to ship `{}` to a peer.
    expect(() => encodeValue({ nested: true })).toThrow(/cannot encode/);
  });

  it("survives JSON, which is what actually happens to it", () => {
    const bytes = Buffer.from([0, 255, 3]);
    const wire = JSON.parse(JSON.stringify(encodeValue(bytes)));
    expect([...(decodeValue(wire) as Buffer)]).toEqual([0, 255, 3]);
  });
});

describe("change encoding", () => {
  const raw = {
    table: "materials",
    pk: Buffer.from([1, 11, 36]),
    cid: "name",
    val: "Linha Royal",
    col_version: 3n,
    db_version: 9007199254740993n,
    site_id: Buffer.from("a1a7c2c7373d40c6b8c2a09cfb28e658", "hex"),
    cl: 1n,
    seq: 42n,
  };

  it("names the site in hex", () => {
    expect(encodeChange(raw).siteId).toBe("a1a7c2c7373d40c6b8c2a09cfb28e658");
  });

  it("produces parameters in column order, values intact", () => {
    const params = decodeChange(
      JSON.parse(JSON.stringify(encodeChange(raw))),
    ) as unknown[];
    expect(params[0]).toBe("materials");
    expect([...(params[1] as Buffer)]).toEqual([1, 11, 36]);
    expect(params[2]).toBe("name");
    expect(params[3]).toBe("Linha Royal");
    expect(params[4]).toBe(3);
    expect(params[5]).toBe(9007199254740993n); // stays exact, past 2^53
    expect([...(params[6] as Buffer)]).toEqual([
      ...Buffer.from("a1a7c2c7373d40c6b8c2a09cfb28e658", "hex"),
    ]);
    expect(params[7]).toBe(1);
    expect(params[8]).toBe(42);
  });

  it("carries a NULL column value", () => {
    // A cleared column replicates as NULL; dropping it would leave the old
    // value standing on the receiving peer.
    const params = decodeChange(encodeChange({ ...raw, val: null })) as unknown[];
    expect(params[3]).toBeNull();
  });
});
