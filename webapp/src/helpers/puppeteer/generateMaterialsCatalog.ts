/* istanbul ignore file */
/**
 * Pure, deterministic synthetic-catalog generator for performance tests.
 *
 * Given a seed + count it produces a `SeedCatalogInput` (the payload for
 * `window.electron.jazz.materials.seed`) plus a compact `CatalogIndex`
 * sidecar. Identities are **derived from the row index**, never random,
 * so a test can address any row a priori without scanning the catalog —
 * see e2e-tests.md §11.3. The PRNG only fills *values* (stock amounts,
 * attribute contents), keeping runs reproducible.
 *
 * No `page` dependency — this is unit-testable in isolation.
 */
import type {
  AttributeMap,
  EdgeDTO,
  MaterialDTO,
  MaterialTypeVersionDTO,
  OrgNodeDTO,
  SeedCatalogInput,
} from "@system/modules/Materials/typings/catalog";

// ---- PRNG (mulberry32) — deterministic, dependency-free --------------

const hashSeed = (seed: string | number): number => {
  if (typeof seed === "number") return seed >>> 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---- Type catalog (small, fixed, valid `MaterialTypeSchema`) ----------

const VERSION = "0.0.1";

type TypeDef = {
  name: string;
  attributes: Record<string, "string" | "number" | "color" | "date">;
  principal: string;
  extra: string;
  unit: string;
};

const TYPE_DEFS: TypeDef[] = [
  {
    name: "malha",
    attributes: { composicao: "string", gramatura: "number", cor: "color" },
    principal: "composicao",
    extra: "gramatura",
    unit: "kg",
  },
  {
    name: "linha",
    attributes: { material: "string", espessura: "number" },
    principal: "material",
    extra: "espessura",
    unit: "m",
  },
  {
    name: "botao",
    attributes: { formato: "string", diametro: "number", cor: "color" },
    principal: "formato",
    extra: "diametro",
    unit: "un",
  },
  {
    name: "ziper",
    attributes: { tipo: "string", comprimento: "number" },
    principal: "tipo",
    extra: "comprimento",
    unit: "un",
  },
];

const NAME_DICT = [
  "Algodão",
  "Poliéster",
  "Viscose",
  "Linho",
  "Elastano",
  "Nylon",
  "Seda",
  "Lã",
];

/** Tokens that addressing tests target. Never emitted by the dictionary. */
export const PROBE_TOKENS = {
  search: "__probe_search__",
  edit: "__probe_edit__",
  delete: "__probe_delete__",
} as const;

export type CatalogIndex = {
  seed: number;
  /** Total materials in the seed payload, including probes. */
  count: number;
  /** Versioned type ids present, e.g. `malha@0.0.1`. */
  types: string[];
  /** Material ids of the planted probe rows. */
  probes: { search: string; edit: string; delete: string };
  firstId: string;
  lastId: string;
  /** A deterministic handful of ids tests can spot-check via `get`. */
  sampleIds: string[];
};

export type GenerateOpts = {
  /** Number of bulk (non-probe) materials. */
  count: number;
  /** Seed for reproducibility. Same seed ⇒ identical bytes. */
  seed?: string | number;
  /** Plant the `__probe_*` rows (default true). */
  withProbes?: boolean;
};

export type GeneratedCatalog = {
  input: SeedCatalogInput;
  index: CatalogIndex;
};

const typeId = (def: TypeDef) => `${def.name}@${VERSION}`;

const schemaJsonFor = (def: TypeDef): string =>
  JSON.stringify({
    version: VERSION,
    attributes: def.attributes,
    selector: { principal: def.principal, extra: def.extra },
    stockUnit: def.unit,
  });

const buildAttributes = (
  def: TypeDef,
  i: number,
  rand: () => number,
): AttributeMap => {
  const out: AttributeMap = {};
  for (const [name, kind] of Object.entries(def.attributes)) {
    let value: unknown;
    switch (kind) {
      case "number":
        value = Math.round(rand() * 1000) / 10;
        break;
      case "color": {
        const n = Math.floor(rand() * 0xffffff);
        value = `#${n.toString(16).padStart(6, "0")}`;
        break;
      }
      case "date":
        value = new Date(2024, 0, 1 + (i % 365)).toISOString();
        break;
      default:
        value = NAME_DICT[(i + name.length) % NAME_DICT.length];
    }
    out[name] = { key: name, valueJson: JSON.stringify(value) };
  }
  return out;
};

/**
 * Build a deterministic `SeedCatalogInput` + `CatalogIndex`.
 */
export const generateMaterialsCatalog = (
  opts: GenerateOpts,
): GeneratedCatalog => {
  const seedNum = hashSeed(opts.seed ?? "klippel-perf");
  const rand = mulberry32(seedNum);
  const withProbes = opts.withProbes ?? true;

  const materialTypes: MaterialTypeVersionDTO[] = TYPE_DEFS.map((def) => ({
    id: typeId(def),
    schemaJson: schemaJsonFor(def),
  }));

  const now = Date.now();
  const industries: OrgNodeDTO[] = Array.from({ length: 4 }, (_, k) => ({
    id: `industry-${seedNum}-${k}`,
    type: "industry",
    name: `Indústria ${k}`,
    updatedAt: now,
  }));
  const sellers: OrgNodeDTO[] = Array.from({ length: 4 }, (_, k) => ({
    id: `seller-${seedNum}-${k}`,
    type: "seller",
    name: `Fornecedor ${k}`,
    updatedAt: now,
  }));

  const materials: MaterialDTO[] = [];
  const edges: EdgeDTO[] = [];

  const pushMaterial = (
    id: string,
    label: string,
    i: number,
    externalId?: string,
  ) => {
    const def = TYPE_DEFS[i % TYPE_DEFS.length];
    materials.push({
      id,
      type: def.name,
      label,
      // `externalId` is a search key (see useFilteredMaterials); the
      // material `label` is NOT. Probes get a unique token here so a
      // search narrows to exactly that row.
      externalId,
      attributes: buildAttributes(def, i, rand),
      stock: { amount: Math.round(rand() * 500), unit: def.unit },
      schemaVersion: VERSION,
      updatedAt: now,
    });
    // conformsTo: material → its pinned type version.
    edges.push({
      id: `conformsTo:${id}`,
      type: "conformsTo",
      sourceId: id,
      targetId: typeId(def),
    });
    // manufacturedBy: spread across industries for a realistic edge graph.
    const ind = industries[i % industries.length];
    edges.push({
      id: `manufacturedBy:${id}`,
      type: "manufacturedBy",
      sourceId: id,
      targetId: ind.id,
    });
  };

  for (let i = 0; i < opts.count; i++) {
    pushMaterial(`mat-${seedNum}-${i}`, `Material ${i}`, i);
  }

  // Planted probes — unique labels, deterministic ids, appended last so
  // bulk indices stay stable regardless of `withProbes`.
  const probes = {
    search: `mat-${seedNum}-probe-search`,
    edit: `mat-${seedNum}-probe-edit`,
    delete: `mat-${seedNum}-probe-delete`,
  };
  if (withProbes) {
    // Probes carry their token as `externalId` (a search key) so a query
    // for the token narrows to exactly that one row.
    pushMaterial(probes.search, PROBE_TOKENS.search, opts.count, PROBE_TOKENS.search);
    pushMaterial(probes.edit, PROBE_TOKENS.edit, opts.count + 1, PROBE_TOKENS.edit);
    pushMaterial(probes.delete, PROBE_TOKENS.delete, opts.count + 2, PROBE_TOKENS.delete);
  }

  const index: CatalogIndex = {
    seed: seedNum,
    count: materials.length,
    types: materialTypes.map((t) => t.id),
    probes,
    firstId: materials[0]?.id ?? "",
    lastId: materials[materials.length - 1]?.id ?? "",
    sampleIds: [
      `mat-${seedNum}-0`,
      `mat-${seedNum}-${Math.floor(opts.count / 2)}`,
      `mat-${seedNum}-${Math.max(0, opts.count - 1)}`,
    ],
  };

  return { input: { materials, materialTypes, industries, sellers, edges }, index };
};
