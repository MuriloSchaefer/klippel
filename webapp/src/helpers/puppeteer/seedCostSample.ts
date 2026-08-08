/* istanbul ignore file */
/**
 * Builds the cost sample in a running app: the bundled catalog fixture is
 * imported through the real UI and its rows are given a price, then the
 * variation's material/process/logo/visualization nodes and CONSUMES edges are
 * built through the same store actions the UI dispatches.
 *
 * Store-level rather than click-driven on purpose. The add-material form is a
 * three-step dependent selector (tipo → nome → cor) whose options are derived
 * from the catalog's `industry`/`externalId` grouping; driving it 5 times to
 * arrange a *fixture* measures the form, not the cost. The click path has its
 * own coverage in the Composer functionality suites — here we want the graph
 * in a known state so the cost math can be asserted exactly.
 *
 * The catalog import is idempotent, but callers still run against a freshly
 * reset workspace so the sample is reproducible.
 */
import { join } from "node:path";
import type { Page } from "puppeteer-core";

import {
  SAMPLE_ELECTIVES,
  SAMPLE_GRADES,
  SAMPLE_LOGOS,
  SAMPLE_MATERIALS,
  SAMPLE_PROCESSES,
  SAMPLE_SVG_PATH,
  SAMPLE_VISUALIZATIONS,
  materialNodeId,
  materialNodeLabel,
  type SampleElective,
  type SampleGrade,
  type SampleLogo,
  type SampleMaterial,
  type SampleProcess,
  type SampleVisualization,
} from "./generateCostSample";

const STOCK_UNIT = "kilogramas6";
const UNIT = "unitario18";
const MINUTE = "minutos249";
const MONEY = "reais11";

/**
 * Put a price on the fixture's materials.
 *
 * The bundled catalog carries no `preco`, and the cost aggregation needs one
 * (money per stock unit). `jazz-materials-update` **replaces** the whole
 * attribute map, so each row is read back first and the price merged in —
 * patching `{preco}` alone would wipe `nome`, `cor` and the rest.
 */
export const priceCostSampleMaterials = async (page: Page): Promise<void> => {
  await page.evaluate(async (materials: SampleMaterial[]) => {
    const jazz = (globalThis as any).electron?.jazz;
    if (!jazz) throw new Error("priceCostSampleMaterials: jazz bridge missing");

    for (const m of materials) {
      const current = await jazz.materials.get(m.id);
      if (!current) {
        throw new Error(
          `priceCostSampleMaterials: material ${m.id} (${m.nome}) not in the catalog — was the fixture imported?`,
        );
      }
      await jazz.materials.updateMaterial({
        id: m.id,
        patch: {
          attributes: {
            ...current.attributes,
            preco: { key: "preco", valueJson: JSON.stringify(m.preco) },
          },
        },
      });
    }
  }, SAMPLE_MATERIALS as unknown as SampleMaterial[]);
};

/**
 * Absolute path to the sample garment artwork, for the upload tool.
 *
 * The upload goes through `uploadVariationSVG` (the real file-chooser flow)
 * rather than dispatching `uploadSVG` with the file's contents: the artwork is
 * ~266 KB, and pushing that string through `page.evaluate` and then sanitizing
 * it synchronously blows puppeteer's `protocolTimeout`.
 */
export const costSampleSVGPath = (): string =>
  join(process.cwd(), SAMPLE_SVG_PATH);

/**
 * Build the variation graph: the electives, 5 material nodes, 3 logo nodes,
 * 8 process nodes, and the CONSUMES/CONSUMED_BY edge pairs between them. Dispatches the same actions
 * `useVariationActions` does, so the computation middleware runs normally.
 */
export const seedCostSampleGraph = async (
  page: Page,
  variationId: string,
): Promise<void> => {
  await page.evaluate(
    async (
      graphId: string,
      materials: SampleMaterial[],
      processes: SampleProcess[],
      electives: SampleElective[],
      grades: SampleGrade[],
      logos: SampleLogo[],
      visualizations: SampleVisualization[],
      units: { stock: string; unit: string; minute: string; money: string },
    ) => {
      const store = (globalThis as any).__klippelStore__;
      if (!store) throw new Error("seedCostSampleGraph: __klippelStore__ missing");

      const ADD_NODE = "[Graph:Instance:Command] Add node";
      const ADD_EDGE = "[Graph:Instance:Command] Add edge";

      const catalog = store.getState().Materials?.materials ?? {};
      const nodeIdFor = (m: SampleMaterial) =>
        `${m.nome} (${m.cor})`.toLowerCase().replaceAll(/\s+/g, "-");

      for (const e of electives) {
        store.dispatch({
          type: ADD_NODE,
          payload: {
            graphId,
            node: {
              id: e.id,
              type: "ELECTIVE",
              label: e.label,
              electiveId: e.id,
              value: e.value,
              defaultValue: e.value,
              position: { x: 0, y: 0 },
            },
            edges: {
              inputs: {
                [`garment->${e.id}`]: {
                  id: `garment->${e.id}`,
                  type: "HAS_ELECTIVE",
                  sourceId: "garment",
                  targetId: e.id,
                },
              },
              outputs: {},
            },
          },
        });
      }

      // The size curve. Order matters — it is how the sizes are listed.
      grades.forEach((grade, i) => {
        const nodeId = `graduation-${grade.label.toLowerCase()}`;
        store.dispatch({
          type: ADD_NODE,
          payload: {
            graphId,
            node: {
              id: nodeId,
              type: "GRADUATION",
              label: grade.label,
              graduationId: grade.label.toLowerCase(),
              order: i,
              amount: grade.amount,
              position: { x: 0, y: 0 },
            },
            edges: {
              inputs: {
                [`garment-${nodeId}`]: {
                  id: `garment-${nodeId}`,
                  type: "HAS_GRADUATION",
                  sourceId: "garment",
                  targetId: nodeId,
                },
              },
              outputs: {
                [`${nodeId}-garment`]: {
                  id: `${nodeId}-garment`,
                  type: "GRADUATION_OF",
                  sourceId: nodeId,
                  targetId: "garment",
                },
              },
            },
          },
        });
      });

      for (const m of materials) {
        const nodeId = nodeIdFor(m);
        store.dispatch({
          type: ADD_NODE,
          payload: {
            graphId,
            node: {
              id: nodeId,
              type: "MATERIAL",
              label: `${m.nome} (${m.cor})`,
              materialId: m.id,
              materialSnapshot: catalog[m.id],
              position: { x: 0, y: 0 },
              typeRestrictions: [m.type],
            },
            edges: {
              inputs: {
                [`garment-${nodeId}`]: {
                  id: `garment-${nodeId}`,
                  type: "HAS_MATERIAL",
                  sourceId: "garment",
                  targetId: nodeId,
                },
              },
              outputs: {},
            },
          },
        });
      }

      // Bind materials to parts of the artwork. Each VISUALIZATION references
      // its material node and the SVG element ids it paints.
      for (const v of visualizations) {
        const material = materials.find((m) => m.role === v.role)!;
        const materialNode = nodeIdFor(material);
        const nodeId = `visualization-${v.role}`;
        store.dispatch({
          type: ADD_NODE,
          payload: {
            graphId,
            node: {
              id: nodeId,
              type: "VISUALIZATION",
              label: v.label,
              visualizationId: v.role,
              materialNodeId: materialNode,
              doms: v.doms,
              position: { x: 0, y: 0 },
            },
            edges: {
              inputs: {
                [`${materialNode}-${nodeId}`]: {
                  id: `${materialNode}-${nodeId}`,
                  type: "HAS_VISUALIZATION",
                  sourceId: materialNode,
                  targetId: nodeId,
                },
              },
              outputs: {
                [`${nodeId}-${materialNode}`]: {
                  id: `${nodeId}-${materialNode}`,
                  type: "VISUALIZATION_OF",
                  sourceId: nodeId,
                  targetId: materialNode,
                },
              },
            },
          },
        });
      }

      // Paint the drawing. `addVisualization` normally registers an SVG proxy
      // per bound element as a side effect of the *action*; the graph nodes
      // alone recolour nothing. Seeding at store level has to do the same, or
      // the sample would claim a material for a part that still shows the
      // artwork's original colour.
      const svgPath = store.getState().Composer?.variations?.[graphId]?.svg;
      if (svgPath) {
        for (const v of visualizations) {
          const material = materials.find((m) => m.role === v.role)!;
          const hex = catalog[material.id]?.attributes?.cor?.hex;
          if (!hex) continue;
          for (const dom of v.doms) {
            const styles: Record<string, string> = {};
            if (dom.fill) styles.fill = hex;
            if (dom.stroke) styles.stroke = hex;
            store.dispatch({
              type: "[SVG:SVG:Command] Add proxy",
              payload: {
                path: svgPath,
                instanceName: graphId,
                id: dom.id,
                styles,
              },
            });
          }
        }
      }

      for (const l of logos) {
        // One placement, priced by an expression over the numeric context
        // `computeLogoCost` builds. Deliberately free of width/height so the
        // expected figure needs no unit conversion.
        const size = {
          width: { amount: 10, unit: "centimetros7" },
          height: { amount: 10, unit: "centimetros7" },
        };
        store.dispatch({
          type: ADD_NODE,
          payload: {
            graphId,
            node: {
              id: l.id,
              type: "LOGO",
              label: l.label,
              logoId: l.id,
              method: l.method,
              colors: l.colors,
              defaultSize: size,
              source: { kind: "svg", documentId: `${l.id}-doc` },
              position: { x: 0, y: 0 },
              ...(l.electiveId ? { electiveNodeId: l.electiveId } : {}),
              placements: [
                {
                  placementId: `${l.id}-p1`,
                  name: l.label,
                  master: true,
                  size,
                  costExpression: `colors * methodFactor * ${l.placementFactor}`,
                  transform: { x: 0, y: 0, rotation: 0, scale: 1 },
                },
              ],
            },
            edges: {
              inputs: {
                [`garment->${l.id}`]: {
                  id: `garment->${l.id}`,
                  type: "HAS_LOGO",
                  sourceId: "garment",
                  targetId: l.id,
                },
              },
              outputs: {
                [`${l.id}->garment`]: {
                  id: `${l.id}->garment`,
                  type: "LOGO_OF",
                  sourceId: l.id,
                  targetId: "garment",
                },
              },
            },
          },
        });

        // The artwork the logo points at. Cost never reads it, but the editor
        // overlay and the edit form resolve `source.documentId`, so a logo
        // without its DOCUMENT would be a logo that cannot be opened.
        const docNodeId = `${l.id}-doc-node`;
        store.dispatch({
          type: ADD_NODE,
          payload: {
            graphId,
            node: {
              id: docNodeId,
              type: "DOCUMENT",
              documentId: `${l.id}-doc`,
              kind: "svg",
              mime: "image/svg+xml",
              filename: `${l.id}.svg`,
              encoding: "base64",
              data: btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
                  '<rect width="10" height="10" fill="#1976d2"/></svg>',
              ),
              position: { x: 0, y: 0 },
            },
            edges: {
              inputs: {
                [`${l.id}-${docNodeId}`]: {
                  id: `${l.id}-${docNodeId}`,
                  type: "HAS_DOCUMENT",
                  sourceId: l.id,
                  targetId: docNodeId,
                },
              },
              outputs: {
                [`${docNodeId}-${l.id}`]: {
                  id: `${docNodeId}-${l.id}`,
                  type: "DOCUMENT_OF",
                  sourceId: docNodeId,
                  targetId: l.id,
                },
              },
            },
          },
        });
      }

      for (const p of processes) {
        const costMoney =
          p.moneyPerUnit !== undefined
            ? {
                quotient: { amount: p.moneyPerUnit, unit: units.money },
                dividend: { amount: 1, unit: units.unit },
              }
            : p.moneyPerMinute !== undefined
              ? {
                  quotient: { amount: p.moneyPerMinute, unit: units.money },
                  dividend: { amount: 1, unit: units.minute },
                }
              : undefined;
        // Always present: every process takes time (`ProcessNode.costTime` is
        // required). Expressed directly as minutes per produced unit, which is
        // what `computeProcessTime` targets.
        const costTime = {
          quotient: { amount: p.minutesPerUnit, unit: units.minute },
          dividend: { amount: 1, unit: units.unit },
        };

        store.dispatch({
          type: ADD_NODE,
          payload: {
            graphId,
            node: {
              id: p.id,
              type: "PROCESS",
              label: p.label,
              processId: p.id,
              position: { x: 0, y: 0 },
              costTime,
              ...(costMoney ? { costMoney } : {}),
              ...(p.electiveId ? { electiveNodeId: p.electiveId } : {}),
            },
            edges: {
              inputs: {
                [`garment->${p.id}`]: {
                  id: `garment->${p.id}`,
                  type: "HAS_PROCESS",
                  sourceId: "garment",
                  targetId: p.id,
                },
              },
              outputs: {
                [`${p.id}->garment`]: {
                  id: `${p.id}->garment`,
                  type: "PROCESS_OF",
                  sourceId: p.id,
                  targetId: "garment",
                },
              },
            },
          },
        });

        for (const c of p.consumes) {
          const material = materials.find((m) => m.id === c.materialId)!;
          const materialNode = nodeIdFor(material);
          const amount = {
            quotient: { amount: c.kgPerUnit, unit: units.stock },
            dividend: { amount: 1, unit: units.unit },
          };
          store.dispatch({
            type: ADD_EDGE,
            payload: {
              graphId,
              edge: {
                id: `${p.id}->${materialNode}`,
                type: "CONSUMES",
                sourceId: p.id,
                targetId: materialNode,
                amount,
              },
            },
          });
          store.dispatch({
            type: ADD_EDGE,
            payload: {
              graphId,
              edge: {
                id: `${materialNode}->${p.id}`,
                type: "CONSUMED_BY",
                sourceId: materialNode,
                targetId: p.id,
                amount,
              },
            },
          });
        }
      }
    },
    variationId,
    SAMPLE_MATERIALS as unknown as SampleMaterial[],
    SAMPLE_PROCESSES as unknown as SampleProcess[],
    SAMPLE_ELECTIVES as unknown as SampleElective[],
    SAMPLE_GRADES as unknown as SampleGrade[],
    SAMPLE_LOGOS as unknown as SampleLogo[],
    SAMPLE_VISUALIZATIONS as unknown as SampleVisualization[],
    { stock: STOCK_UNIT, unit: UNIT, minute: MINUTE, money: MONEY },
  );
};

export { materialNodeId, materialNodeLabel };
