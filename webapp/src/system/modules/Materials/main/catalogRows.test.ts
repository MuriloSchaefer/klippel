/**
 * The decisions the storage layer makes about a row.
 *
 * These are asserted directly rather than through the app because they are
 * rules, not plumbing: what an absent value looks like on the way out, which
 * fields a search can reach, and what a typed query actually matches. Each one
 * has a way of being wrong that a green e2e run would not notice — a dropped
 * `externalId`, a colour that stops being searchable, a query that quietly
 * matches everything.
 */
import {
  ftsQuery,
  haystackForRow,
  parseAttributeMap,
  rowToDto,
  searchableColumns,
  type MaterialRow,
} from "./catalogRows";

const row = (patch: Partial<MaterialRow> = {}): MaterialRow => ({
  id: "uuid-1",
  material_key: "mat-1",
  type: "linha",
  label: "",
  external_id: "",
  external_url: "",
  image_url: "",
  description: "",
  schema_version: "0.0.5",
  name: "",
  color_label: "",
  industry: "",
  stock_amount: 0,
  stock_unit: "",
  pos_x: 0,
  pos_y: 0,
  attrs_json: "{}",
  composition_json: "",
  caracteristics_json: "",
  updated_at: 1,
  ...patch,
});

describe("rowToDto", () => {
  it("carries the domain id, never the storage uuid", () => {
    // The UUID is replication's business. A DTO that leaked it would put a key
    // the rest of the app has never seen into model references and pins.
    const dto = rowToDto(row({ id: "uuid-1", material_key: "mat-1" }));
    expect(dto.id).toBe("mat-1");
  });

  it("decodes empty strings back to absent fields", () => {
    // The schema has no nullable columns — cr-sqlite forbids them — so `''` is
    // how absence is spelled. It must not surface as an empty-string field, or
    // the UI renders a blank link and a blank image where there is none.
    const dto = rowToDto(row());
    expect(dto).not.toHaveProperty("label");
    expect(dto).not.toHaveProperty("externalId");
    expect(dto).not.toHaveProperty("externalURL");
    expect(dto).not.toHaveProperty("imageURL");
    expect(dto).not.toHaveProperty("description");
    expect(dto).not.toHaveProperty("composition");
    expect(dto).not.toHaveProperty("caracteristics");
  });

  it("keeps values that are present", () => {
    const dto = rowToDto(
      row({
        label: "Linha 40",
        external_id: "06009",
        external_url: "https://example.test/p",
        image_url: "https://example.test/p.jpg",
        description: "desc",
        stock_amount: 12.5,
        stock_unit: "kilogramas6",
        pos_x: 3,
        pos_y: 4,
        composition_json: '{"algodao":{"key":"algodao","valueJson":"50"}}',
      }),
    );
    expect(dto.label).toBe("Linha 40");
    expect(dto.externalId).toBe("06009");
    expect(dto.externalURL).toBe("https://example.test/p");
    expect(dto.imageURL).toBe("https://example.test/p.jpg");
    expect(dto.description).toBe("desc");
    expect(dto.stock).toEqual({ amount: 12.5, unit: "kilogramas6" });
    expect(dto.position).toEqual({ x: 3, y: 4 });
    expect(dto.composition).toHaveProperty("algodao");
  });

  it("survives a blob that is not valid JSON", () => {
    // The column has a `json_valid` CHECK, so this is defence against a value
    // that arrived some other way. One bad row must not take down the page it
    // appears on.
    const dto = rowToDto(row({ attrs_json: "{oops" }));
    expect(dto.attributes).toEqual({});
  });
});

describe("parseAttributeMap", () => {
  it("treats the empty string as no attributes", () => {
    expect(parseAttributeMap("")).toEqual({});
  });
});

describe("searchableColumns", () => {
  const attr = (value: unknown) => ({ key: "x", valueJson: JSON.stringify(value) });

  it("promotes nome and the colour's label", () => {
    const { name, colorLabel } = searchableColumns({
      attributes: {
        nome: attr("Piquet PV"),
        cor: attr({ id: "03", hex: "#0000ff", label: "Royal" }),
      },
    });
    expect(name).toBe("Piquet PV");
    expect(colorLabel).toBe("Royal");
  });

  it("falls back to the hex when a colour has no label", () => {
    const { colorLabel } = searchableColumns({
      attributes: { cor: attr({ hex: "#0000ff" }) },
    });
    expect(colorLabel).toBe("#0000ff");
  });

  it("accepts a colour stored as a plain string", () => {
    const { colorLabel } = searchableColumns({
      attributes: { cor: attr("Royal") },
    });
    expect(colorLabel).toBe("Royal");
  });

  it("yields empty strings when the attributes are missing", () => {
    // A material may legitimately have neither — the columns are NOT NULL, so
    // the answer has to be `''` rather than undefined.
    expect(searchableColumns({ attributes: {} })).toEqual({
      name: "",
      colorLabel: "",
    });
  });
});

describe("haystackForRow", () => {
  it("includes every field a user can read in the grid", () => {
    const text = haystackForRow({
      name: "Piquet PV",
      color_label: "Royal",
      type: "malha",
      industry: "Sajama",
      external_id: "06009",
    });
    for (const token of ["piquet", "royal", "malha", "sajama", "06009"]) {
      expect(text).toContain(token);
    }
  });

  it("omits empty fields rather than emitting blanks", () => {
    const text = haystackForRow({
      name: "Piquet",
      color_label: "",
      type: "malha",
      industry: "",
      external_id: "",
    });
    expect(text).not.toMatch(/\s{2,}/);
  });
});

describe("ftsQuery", () => {
  it("makes every token a prefix term, ANDed", () => {
    expect(ftsQuery("royal lin")).toBe('"royal"* AND "lin"*');
  });

  it("strips FTS5 syntax rather than escaping it", () => {
    // A search box is not an expression language: a stray quote or a `-` is a
    // typo, and it must not throw or silently invert the query.
    expect(ftsQuery('roy"al')).toBe('"roy"* AND "al"*');
    expect(ftsQuery("azul-marinho")).toBe('"azul"* AND "marinho"*');
    expect(ftsQuery("a*(b)")).toBe('"a"* AND "b"*');
  });

  it("matches nothing for a query with no usable tokens", () => {
    // Not "everything": an empty MATCH that matched all rows would make a
    // mistyped query look like a cleared one.
    expect(ftsQuery("")).toBe('""');
    expect(ftsQuery('"*"')).toBe('""');
  });
});
