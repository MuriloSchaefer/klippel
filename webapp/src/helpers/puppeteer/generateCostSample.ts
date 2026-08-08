/* istanbul ignore file */
/**
 * Pure fixture for a cost sample: a priced materials catalog plus a variation
 * of 5 materials, 8 processes and 3 logos (some gated by electives) wired (e2e-tests.md §11.3 — every
 * identity is fixed and derivable, nothing is discovered by scanning).
 *
 * The shape exercises the cost rules that matter:
 *
 *   - `Corte` consumes **3** materials (fan-out over one process),
 *   - `Costura` 2 and `Acabamento` 1 (the ordinary cases),
 *   - `Revisão` consumes **no** material (labour only — its cost must still
 *     count, and it must not drag a material subtotal with it),
 *   - `Embalagem` reuses a material already consumed elsewhere (a material
 *     feeding two processes accumulates),
 *   - `Enfesto` is priced per *minute* rather than per unit (the costTime
 *     multiplication path),
 *   - `Inspeção final` has **no money at all** (it must read "não precificado"
 *     and contribute 0, never be treated as free-but-counted),
 *   - `Bordado` is gated by an elective that is **off** — priced, timed and
 *     consuming a material, yet it must contribute nothing to money *or* time,
 *     and its material consumption must not reach the material subtotal,
 *   - materials are bound to real parts of the uploaded artwork through
 *     VISUALIZATION nodes (`SAMPLE_VISUALIZATIONS`),
 *   - logos cover all three elective states: `Logo peito` has none,
 *     `Logo manga` has one that is **on** (must still be charged), and
 *     `Logo costas` has one that is **off** (must not be).
 *
 * Totals are fixed by construction, so a test asserts exact numbers rather
 * than whatever the app happens to produce.
 */

/**
 * A row of the **bundled catalog fixture** (`public/materials/materials.xlsx`),
 * identified by the id the import gives it.
 *
 * The sample imports that fixture rather than seeding a catalog of its own: the
 * fixture already carries correct type schemas (notably `cor` as the extra
 * selector, which a hand-rolled seed got wrong) and realistic rows. The only
 * thing it lacks is a price, which the seeder patches on — see
 * `priceCostSampleMaterials`.
 */
/** The part a material plays in the garment — how the sample refers to it. */
export type SampleMaterialRole =
  | "gola-externa"
  | "gola-interna"
  | "material-principal"
  | "material-secundario"
  | "detalhes";

export type SampleMaterial = {
  /** Catalog id as imported from the fixture. */
  id: string;
  role: SampleMaterialRole;
  type: "malha" | "tecido";
  nome: string;
  /** `cor` label as the fixture defines it — part of the material node label. */
  cor: string;
  /** R$ per stock unit (all five are stocked in kg). Ours to assign. */
  preco: number;
};

export type SampleConsumption = {
  materialId: string;
  /** kg per produced unit. */
  kgPerUnit: number;
};

export type SampleProcess = {
  /** Stable node id — no random suffix, so the fixture is addressable. */
  id: string;
  label: string;
  /**
   * Minutes per produced unit. **Required on every process** — a process
   * always takes time, even when nobody has priced it (`ProcessNode.costTime`).
   */
  minutesPerUnit: number;
  /** R$ per produced unit. Omitted when the process is priced per minute. */
  moneyPerUnit?: number;
  /** R$ per minute, multiplied by `minutesPerUnit`. */
  moneyPerMinute?: number;
  /**
   * Elective gating this process. When the elective is off the process is not
   * performed, so it contributes neither money nor time.
   */
  electiveId?: string;
  consumes: SampleConsumption[];
};

/**
 * The size curve. A budget line's quantity is the **sum of these**, not a
 * number typed into the row — a production run is graded.
 */
export type SampleGrade = { label: string; amount: number };

export const SAMPLE_GRADES: SampleGrade[] = [
  { label: "PP", amount: 20 },
  { label: "P", amount: 60 },
  { label: "M", amount: 90 },
  { label: "G", amount: 60 },
  { label: "GG", amount: 20 },
];

/** Total garments the run is for — what the budget line's amount must equal. */
export const expectedTotalGarments = (): number =>
  SAMPLE_GRADES.reduce((sum, g) => sum + g.amount, 0);

export type SampleElective = {
  id: string;
  label: string;
  value: boolean;
};

/**
 * Two electives, one off and one on, so both sides of the gate are exercised:
 * `elective-bordado` (off) suppresses the `Bordado` process *and* the back
 * logo; `elective-manga` (on) must suppress nothing.
 */
export const SAMPLE_ELECTIVES: SampleElective[] = [
  { id: "elective-bordado", label: "Bordado costas", value: false },
  { id: "elective-manga", label: "Logo manga", value: true },
];

export type SampleLogo = {
  id: string;
  label: string;
  method: "embroidery" | "silkscreen";
  colors: number;
  /** Elective gating this logo, when it has one. */
  electiveId?: string;
  /**
   * Priced per placement. Kept free of `width`/`height` so the expected value
   * needs no unit conversion — the formula, not the geometry, is what is under
   * test here.
   */
  placementFactor: number;
};

/** Method weights, mirroring `computeLogoCost`'s `METHOD_FACTORS`. */
export const LOGO_METHOD_FACTORS: Record<string, number> = {
  embroidery: 1,
  silkscreen: 0.6,
};

export const SAMPLE_LOGOS: SampleLogo[] = [
  // No elective: always applied.
  { id: "logo-peito", label: "Logo peito", method: "silkscreen", colors: 3, placementFactor: 2 },
  // Elective ON: applied, and must not be suppressed.
  {
    id: "logo-manga",
    label: "Logo manga",
    method: "embroidery",
    colors: 2,
    electiveId: "elective-manga",
    placementFactor: 5,
  },
  // Elective OFF: not applied — contributes nothing.
  {
    id: "logo-costas",
    label: "Logo costas",
    method: "embroidery",
    colors: 4,
    electiveId: "elective-bordado",
    placementFactor: 5,
  },
];

/** `colors * methodFactor * placementFactor`, matching the seeded expression. */
export const logoMoneyPerUnit = (logo: SampleLogo): number =>
  logo.colors * LOGO_METHOD_FACTORS[logo.method] * logo.placementFactor;

/** Logos that are actually applied — an elective that is off excludes its logo. */
export const activeLogos = (): SampleLogo[] =>
  SAMPLE_LOGOS.filter((l) => {
    if (!l.electiveId) return true;
    return SAMPLE_ELECTIVES.find((e) => e.id === l.electiveId)?.value !== false;
  });

/** Money per produced unit contributed by logos. */
export const expectedLogoMoneyPerUnit = (): number =>
  activeLogos().reduce((sum, l) => sum + logoMoneyPerUnit(l), 0);

/**
 * The garment artwork the sample uploads, and the element ids inside it that
 * materials are bound to.
 *
 * The bindings follow the drawing's own `inkscape:label` tree, so each
 * visualization paints the part a garment maker would name: the `fundo` fills
 * inside "frente › principal", "costas › manga esquerda", "gola", and so on —
 * across **both** the front and back views, which are separate subtrees.
 *
 * Structural nodes (costura, filete, efeitos, etiqueta) are deliberately left
 * alone: they are stitching and shading, not fabric.
 */
export const SAMPLE_SVG_PATH = "public/catalog/2026/fem/camisas/manga-curta-raglan.svg";

export type SampleVisualization = {
  /** The material role this visualization paints with. */
  role: SampleMaterialRole;
  label: string;
  /** SVG element ids, with the fill/stroke channels to bind. */
  doms: { id: string; fill?: boolean; stroke?: boolean }[];
};

export const SAMPLE_VISUALIZATIONS: SampleVisualization[] = [
  {
    role: "gola-externa",
    label: "Gola externa",
    doms: [
      { id: "path776", fill: true }, // frente › gola › fundo-externo
      { id: "path703", fill: true }, // costas › gola-costas
    ],
  },
  {
    role: "gola-interna",
    label: "Gola interna",
    doms: [
      { id: "path853", fill: true }, // frente › gola interna › fundo
      { id: "path705", fill: true }, // frente › gola › fundo lapela
    ],
  },
  {
    role: "material-principal",
    label: "Material principal (frente e costas)",
    doms: [
      { id: "path215", fill: true }, // frente › principal › fundo-principal
      { id: "path759", fill: true }, // frente › principal › principal-costas
      { id: "path154", fill: true }, // frente › principal › fundo-manga-direita
      { id: "path206", fill: true }, // frente › principal › fundo-manga-esquerda
      { id: "path707", fill: true }, // frente › gola › frente vista
      { id: "path423", fill: true }, // costas › principal
      { id: "path427", fill: true },
      { id: "path431", fill: true },
    ],
  },
  {
    role: "material-secundario",
    label: "Material secundário (mangas e barra)",
    doms: [
      { id: "path157", fill: true }, // frente › manga-direita › fundo
      { id: "path124", fill: true }, // frente › manga esquerda › fundo
      { id: "path773", fill: true }, // costas › manga direita › fundo
      { id: "path777", fill: true }, // costas › manga esquerda › fundo
      { id: "path230", fill: true }, // frente › barra
      { id: "path453", fill: true }, // costas › barra
      { id: "path450", fill: true }, // costas › manga esquerda › barra › fundo
      { id: "rect770", fill: true }, // costas › manga direita › barra
    ],
  },
  {
    // The piping is drawn as *strokes* (`fill:none`) on the frente/costa
    // filetes, so those bind the stroke channel; the two sleeve filetes are
    // filled shapes. Binding the wrong channel recolours nothing.
    role: "detalhes",
    label: "Detalhes (filetes)",
    doms: [
      { id: "path86", stroke: true }, // frente › filete-frente
      { id: "path208", stroke: true }, // frente › filete-costa
      { id: "path429", stroke: true }, // costas › filete
      { id: "path161", stroke: true }, // frente › barra-manga-direita › filete
      { id: "path228", stroke: true }, // frente › manga esquerda › barra › fundo
      { id: "path451", fill: true }, // costas › filete-manga direita
      { id: "path766", fill: true }, // costas › filete-manga-esquerda
    ],
  },
];

export const SAMPLE_MATERIALS: SampleMaterial[] = [
  // One catalog row per role, in five distinguishable colours so a mis-bound
  // visualization is visible at a glance rather than hiding behind a shared
  // tone: navy body, white sleeves, black outer collar, royal inner collar,
  // red piping.
  {
    id: "8",
    role: "gola-externa",
    type: "malha",
    nome: "Piquet ingles PA",
    cor: "Preto",
    preco: 41,
  },
  {
    id: "9",
    role: "gola-interna",
    type: "malha",
    nome: "Piquet ingles PA",
    cor: "Royal",
    preco: 39.5,
  },
  {
    id: "4",
    role: "material-principal",
    type: "malha",
    nome: "Malha PV",
    cor: "Marinho",
    preco: 32.9,
  },
  {
    id: "1",
    role: "material-secundario",
    type: "malha",
    nome: "Malha PV",
    cor: "Branco",
    preco: 30.4,
  },
  {
    id: "5",
    role: "detalhes",
    type: "malha",
    nome: "Malha PV",
    cor: "Vermelho",
    preco: 34.2,
  },
];

/**
 * The `cor` hexes the fixture defines, by label — what a bound element must end
 * up painted with. Kept here so the expectation and the seed read the same
 * source; the seeder itself takes the hex from the live catalog row.
 */
export const MATERIAL_COLOR_HEX: Record<string, string> = {
  Preto: "#000000",
  Royal: "#0000ff",
  Marinho: "#000055",
  Branco: "#ffffff",
  Vermelho: "#ff0000",
};

/** Look a material up by the part it plays, rather than by catalog id. */
export const materialByRole = (role: SampleMaterialRole): SampleMaterial =>
  SAMPLE_MATERIALS.find((m) => m.role === role)!;

/** Material node label in the variation, derived from the catalog row. */
export const materialNodeLabel = (m: SampleMaterial) => `${m.nome} (${m.cor})`;
export const materialNodeId = (m: SampleMaterial) =>
  materialNodeLabel(m).toLowerCase().replaceAll(/\s+/g, "-");

export const SAMPLE_PROCESSES: SampleProcess[] = [
  {
    id: "process-corte",
    label: "Corte",
    minutesPerUnit: 4,
    moneyPerUnit: 3.5,
    consumes: [
      { materialId: "4", kgPerUnit: 0.45 }, // principal
      { materialId: "1", kgPerUnit: 0.12 }, // secundário
      { materialId: "5", kgPerUnit: 0.02 }, // detalhes
    ],
  },
  {
    id: "process-costura",
    label: "Costura",
    minutesPerUnit: 15,
    moneyPerUnit: 12.75,
    consumes: [
      { materialId: "8", kgPerUnit: 0.06 }, // gola externa
      { materialId: "9", kgPerUnit: 0.04 }, // gola interna
    ],
  },
  {
    id: "process-acabamento",
    label: "Acabamento",
    minutesPerUnit: 6,
    moneyPerUnit: 4.25,
    consumes: [{ materialId: "4", kgPerUnit: 0.05 }],
  },
  // Labour only — no material at all.
  {
    id: "process-revisao",
    label: "Revisão",
    minutesPerUnit: 3,
    moneyPerUnit: 2.1,
    consumes: [],
  },
  {
    id: "process-embalagem",
    label: "Embalagem",
    minutesPerUnit: 2,
    moneyPerUnit: 1.4,
    consumes: [{ materialId: "1", kgPerUnit: 0.03 }],
  },
  // Priced per minute: 0.9 R$/min × 6 min = 5.40 R$/un.
  {
    id: "process-enfesto",
    label: "Enfesto",
    minutesPerUnit: 6,
    moneyPerMinute: 0.9,
    consumes: [],
  },
  // Timed but unpriced: money is optional, time is not.
  {
    id: "process-inspecao",
    label: "Inspeção final",
    minutesPerUnit: 2,
    consumes: [],
  },
  // Gated by an elective that is OFF: priced, timed and consuming a material,
  // yet it must contribute nothing to either total.
  {
    id: "process-bordado",
    label: "Bordado",
    minutesPerUnit: 9,
    moneyPerUnit: 7.8,
    electiveId: "elective-bordado",
    consumes: [{ materialId: "8", kgPerUnit: 0.04 }],
  },
];

/** Processes that actually run — an elective that is off excludes its process. */
export const activeProcesses = (): SampleProcess[] =>
  SAMPLE_PROCESSES.filter((p) => {
    if (!p.electiveId) return true;
    return SAMPLE_ELECTIVES.find((e) => e.id === p.electiveId)?.value !== false;
  });

/** Money per produced unit contributed by processes. */
export const expectedProcessMoneyPerUnit = (): number =>
  activeProcesses().reduce((sum, p) => {
    if (p.moneyPerUnit !== undefined) return sum + p.moneyPerUnit;
    if (p.moneyPerMinute !== undefined)
      return sum + p.moneyPerMinute * p.minutesPerUnit;
    return sum;
  }, 0);

/** kg per produced unit for one material, summed over every process. */
export const expectedMaterialKgPerUnit = (materialId: string): number =>
  activeProcesses().reduce(
    (sum, p) =>
      sum +
      p.consumes
        .filter((c) => c.materialId === materialId)
        .reduce((s, c) => s + c.kgPerUnit, 0),
    0,
  );

/** Money per produced unit contributed by materials (consumption × price). */
export const expectedMaterialMoneyPerUnit = (): number =>
  SAMPLE_MATERIALS.reduce(
    (sum, m) => sum + expectedMaterialKgPerUnit(m.id) * m.preco,
    0,
  );

export const expectedTotalMoneyPerUnit = (): number =>
  expectedProcessMoneyPerUnit() +
  expectedMaterialMoneyPerUnit() +
  expectedLogoMoneyPerUnit();

/** Production minutes per produced unit, over the processes that run. */
export const expectedMinutesPerUnit = (): number =>
  activeProcesses().reduce((sum, p) => sum + p.minutesPerUnit, 0);
