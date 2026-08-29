/**
 * Which rows a bulk migration may move.
 *
 * The rule is narrow on purpose: "behind the version the type itself calls
 * latest". A type whose successor has not synced yet must not mark every row
 * outdated, and a row whose type is not resident is unknown, not stale.
 */
import { isOutdated } from "./selectors";
import type { MaterialState } from "./state";
import type { MaterialTypesState } from "../materialTypes/state";

const material = (over: Partial<MaterialState> = {}): MaterialState => ({
  id: "m1",
  type: "linha",
  schemaVersion: "0.0.4",
  suppliers: [],
  industry: "",
  externalId: "m1",
  attributes: {},
  stock: { amount: 0, unit: "m" },
  ...over,
});

const types = (latest?: string): MaterialTypesState =>
  ({
    linha: {
      name: "linha",
      label: "linha",
      latestSchema: latest,
      schemas: {},
    },
  }) as unknown as MaterialTypesState;

describe("isOutdated", () => {
  it("is true when the row is behind the type's latest", () => {
    expect(isOutdated(material(), types("0.0.5"))).toBe(true);
  });

  it("is false when the row is already on it", () => {
    expect(isOutdated(material({ schemaVersion: "0.0.5" }), types("0.0.5"))).toBe(
      false,
    );
  });

  it("is false when the type has no latest — unknown is not outdated", () => {
    // A material can sync ahead of its type; that must not light up every row.
    expect(isOutdated(material(), types(undefined))).toBe(false);
    expect(isOutdated(material(), {} as MaterialTypesState)).toBe(false);
  });

  it("is false for an absent row", () => {
    expect(isOutdated(undefined, types("0.0.5"))).toBe(false);
  });
});
