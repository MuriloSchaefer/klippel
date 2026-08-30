/**
 * Storage identity.
 *
 * The property under test is **determinism across peers**: two machines that
 * have never met must derive the same primary key for the same domain id, or
 * replication delivers two rows where the user has one. A random UUID would
 * pass every single-peer test in the suite and fail the first time two peers
 * met, so it is asserted here rather than left to sync tests.
 */
import { NAMESPACES, storageId, uuidV5 } from "./ids";

describe("uuidV5", () => {
  it("is deterministic for the same namespace and name", () => {
    const a = uuidV5(NAMESPACES.material, "mat-1");
    const b = uuidV5(NAMESPACES.material, "mat-1");
    expect(a).toBe(b);
  });

  it("matches the RFC 4122 v5 layout", () => {
    const id = uuidV5(NAMESPACES.material, "mat-1");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("agrees with the RFC's own test vector", () => {
    // Pins the algorithm, not just its shape: a change in hashing or in the
    // version/variant bits would still look like a UUID.
    const DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(uuidV5(DNS, "www.example.org")).toBe(
      "74738ff5-5367-5958-9aee-98fffdcd1876",
    );
  });
});

describe("storageId", () => {
  it("keeps namespaces apart", () => {
    // A material and an edge may legitimately share a domain key; if they
    // hashed alike they would collide on one primary key.
    expect(storageId("material", "x")).not.toBe(storageId("edge", "x"));
    expect(storageId("materialType", "x")).not.toBe(
      storageId("organization", "x"),
    );
    expect(storageId("model", "x")).not.toBe(storageId("modelDocument", "x"));
  });

  it("distinguishes different keys in one namespace", () => {
    expect(storageId("material", "mat-1")).not.toBe(
      storageId("material", "mat-2"),
    );
  });

  it("is stable for a known key", () => {
    // Changing a namespace constant re-keys every row of that table and makes
    // an old peer's rows look like new ones. This fails loudly if one moves.
    expect(storageId("material", "mat-1")).toBe(
      "5c3daa5a-3a77-5bbd-8640-857b6d401253",
    );
  });
});
