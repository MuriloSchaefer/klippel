import { CSSProperties, useCallback, useMemo, useRef } from "react";
import { useStore } from "react-redux";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { ILayoutModule } from "@kernel/modules/Layout";
import {
  addNode as addNodeAction,
  removeNode as removeNodeAction,
  updateNode as updateNodeAction,
  addEdge as addEdgeAction,
  removeEdge as removeEdgeAction,
  updateEdge as updateEdgeAction,
} from "@kernel/modules/Graphs/store/graphInstance/actions";
import {
  addProxy as addProxyAction,
  updateProxy as updateProxyAction,
  deleteProxy as deleteProxyAction,
  addInjectedElement as addInjectedElementAction,
  updateInjectedElement as updateInjectedElementAction,
  deleteInjectedElement as deleteInjectedElementAction,
} from "@kernel/modules/SVG/store/actions";
import { selectPart } from "../store/variations/actions";
import {
  MaterialNode,
  PartNode,
  ElectiveNode,
  GraduationNode,
  VisualizationDom,
  VisualizationNode,
  ProcessNode,
  ProcessOfEdge,
  HasProcessEdge,
  ConsumesEdge,
  ConsumedByEdge,
  LogoNode,
  LogoMethod,
  LogoPlacement,
  LogoSource,
  DocumentNode,
  AnnotationNode,
} from "../typings";
import { UnitValue } from "@system/modules/Converter/typings";
import { EdgeMap } from "@kernel/modules/Graphs/hooks/useGraph";
import { IMaterialsModule } from "@system/modules/Materials";
import { useTheme, type Theme } from "@mui/material";
import { CompoundValue } from "@system/modules/Converter/typings";
import {
  recomputeAllGradeDeltas,
  recomputeGradeDelta,
  dropGraduationFromEdge,
} from "../utils/consumptionPerGrade";
import { GraphState } from "@kernel/modules/Graphs/store/state";
import {
  buildLogoTransform,
  clipPathMarkup,
  logoClipId,
  logoClipWrapId,
  logoContainerId,
  logoSymbolId,
  placementContainerMarkup,
  sourceDefsMarkup,
} from "../utils/logoInjection";

// --- Logo overlay helpers ----------------------------------------------------

const shortHash = () => Math.random().toString(36).slice(2, 8);

/**
 * Scale that makes a fresh placement land at the same on-screen size as the
 * logo's main-copy preview. The preview is a DOM overlay measured in editor
 * pixels; a placement lives in the content SVG's user space, so the conversion
 * factor is the mount point's screen CTM. Both sides measure the logo by its
 * own declared viewport (the preview via the image's natural size, the
 * placement via the symbol root's width/height), so matching width also matches
 * height — the logo's own ratio is preserved either way.
 *
 * Returns undefined when the editor isn't mounted or the symbol has no
 * intrinsic size; callers fall back to scale 1.
 */
const previewParityScale = (
  logoId: string,
  mainCopy?: { width: number; height: number },
): number | undefined => {
  if (typeof document === "undefined" || !mainCopy?.width) return undefined;
  const sym = document.getElementById(
    logoSymbolId(logoId),
  ) as SVGSVGElement | null;
  const content = document.querySelector<SVGSVGElement>(
    '#svg-editor [role="container"] > svg',
  );
  if (!sym || !content) return undefined;
  const intrinsicWidth = sym.width?.baseVal?.value;
  const pxPerUnit = content.getScreenCTM()?.a;
  if (!(intrinsicWidth > 0) || !pxPerUnit) return undefined;
  return mainCopy.width / (intrinsicWidth * pxPerUnit);
};

/**
 * Re-express a placement's translate so anchoring it does not move it.
 *
 * Clipping mounts the placement next to its clip target, which usually means a
 * different parent — and a parent carries its own transform. Catalog artwork is
 * full of them (Inkscape wraps whole drawings in groups like
 * `translate(-12098,-6096)`), so a translate authored against the old parent is
 * read in a coordinate system thousands of units away: the logo leaves the
 * artboard, and with it the clip region, which reads as the placement vanishing
 * the instant it is clipped.
 *
 * Returns the same point mapped through `oldParent → newParent`, so the logo
 * stays where the user put it. Falls back to the original when the matrices are
 * unavailable (element not mounted) — worst case is the previous behaviour.
 */
const translateForNewParent = (
  wrapId: string,
  clipTargetId: string,
  t: LogoPlacement["transform"],
): { x: number; y: number } => {
  if (typeof document === "undefined") return { x: t.x, y: t.y };
  const wrap = document.getElementById(wrapId);
  const target = document.getElementById(clipTargetId) as SVGGraphicsElement | null;
  const oldParent = wrap?.parentNode as SVGGraphicsElement | null;
  const newParent = target?.parentNode as SVGGraphicsElement | null;
  if (!oldParent?.getScreenCTM || !newParent?.getScreenCTM) {
    return { x: t.x, y: t.y };
  }
  if (oldParent === newParent) return { x: t.x, y: t.y };
  const from = oldParent.getScreenCTM();
  const to = newParent.getScreenCTM();
  const ownerSVG = target?.ownerSVGElement;
  if (!from || !to || !ownerSVG) return { x: t.x, y: t.y };
  const point = ownerSVG.createSVGPoint();
  point.x = t.x;
  point.y = t.y;
  const mapped = point.matrixTransform(to.inverse().multiply(from));
  return { x: mapped.x, y: mapped.y };
};

// --- Annotation helpers ------------------------------------------------------

const annotationGroupId = (annotationId: string) => `annotation-${annotationId}`;
const annotationTextId = (annotationId: string) =>
  `annotation-text-${annotationId}`;
const annotationLineId = (annotationId: string) =>
  `annotation-line-${annotationId}`;
const annotationTargetId = (annotationId: string) =>
  `annotation-target-${annotationId}`;

// Escape user text before it is inlined into the injected SVG markup (and thus
// into exported SVG files): prevents breaking the document or markup injection.
const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const annotationTransformStr = (
  t: AnnotationNode["transform"],
): string => `translate(${t.x},${t.y}) scale(${t.scale})`;

// Leader line runs from the target point to the label origin. Applied as a
// proxy (SVG presentation attributes), so cast at the dispatch site.
const annotationLineStyles = (
  target: AnnotationNode["target"],
  transform: AnnotationNode["transform"],
) => ({
  x1: String(target.x),
  y1: String(target.y),
  x2: String(transform.x),
  y2: String(transform.y),
});

const annotationTargetStyles = (target: AnnotationNode["target"]) => ({
  cx: String(target.x),
  cy: String(target.y),
});

// One <tspan> per line; SVG <text> does not wrap. Empty body still renders an
// (empty) text element so the manipulation handles have a bbox to grab.
const annotationTspans = (text: string): string => {
  const lines = (text || " ").split("\n");
  return lines
    .map(
      (line, i) =>
        `<tspan x="0" dy="${i === 0 ? "0" : "1.2em"}">${escapeXml(line) || " "}</tspan>`,
    )
    .join("");
};

// Static structure for the annotation group. Geometry (text transform, line
// endpoints, target position) is applied via proxies so it survives a markup
// re-inject (which happens when the text body changes).
const annotationGroupMarkup = (node: AnnotationNode, theme: Theme): string => {
  const tid = annotationTextId(node.annotationId);
  const lid = annotationLineId(node.annotationId);
  const cid = annotationTargetId(node.annotationId);
  // Annotation chrome follows the theme (never a literal color): primary for the
  // ink, the surface color for the target dot's contrast ring.
  const ink = theme.palette.primary.main;
  const ring = theme.palette.background.paper;
  return (
    `<g>` +
    `<line id="${lid}" stroke="${ink}" stroke-width="1" vector-effect="non-scaling-stroke" />` +
    `<circle id="${cid}" r="4" fill="${ink}" stroke="${ring}" stroke-width="1" style="cursor:move" />` +
    `<text id="${tid}" font-size="14" fill="${ink}" style="white-space:pre">${annotationTspans(node.text)}</text>` +
    `</g>`
  );
};

export function useVariationActions({ variationId }: { variationId: string }) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const dispatch = storeModule.hooks.useAppDispatch();
  const store = useStore();
  const vp = layoutModule.hooks.useActiveViewport();
  const vpMgr = layoutModule.hooks.useViewportManager();

  const { useMaterials, useMaterialTypes } = materialsModule.hooks;
  const materials = useMaterials();
  const materialTypes = useMaterialTypes();

  // Refs let action callbacks always see fresh values without invalidating useMemo.
  const materialsRef = useRef(materials);
  materialsRef.current = materials;
  const materialTypesRef = useRef(materialTypes);
  materialTypesRef.current = materialTypes;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const markChanged = useCallback(() => {
    if (vp) vpMgr.functions.setHasChanged(vp.name, true);
  }, [vp?.name]);

  // Reads graph state at call time — no subscription cost.
  const getGraph = useCallback(
    (): GraphState | undefined =>
      (store.getState() as any)?.Graph?.graphs?.[variationId],
    [variationId],
  );

  // Reads the SVG path for this variation at call time — no subscription cost.
  const getSvgPath = useCallback(
    (): string | undefined =>
      (store.getState() as any)?.Composer?.variations?.[variationId]?.svg,
    [variationId],
  );

  return useMemo(
    () => ({
      actions: {
        selectPart: (partId: string) => {
          dispatch(selectPart({ variationId, partId }));
        },

        addPart: (name: string, parentId: string) => {
          const g = getGraph();
          let id = name.toLowerCase().replaceAll(/\s+/g, "-");
          let i = 1;
          while (id in (g?.nodes ?? {})) {
            id += "-" + i;
            i++;
          }
          const node: PartNode = {
            id,
            type: "PART",
            label: name,
            position: { x: 0, y: 0 },
          };
          const edges: EdgeMap = {
            inputs: {
              [`${parentId}-${id}`]: {
                id: `${parentId}-${id}`,
                type: "HAS_PART",
                sourceId: parentId,
                targetId: id,
              },
            },
            outputs: {
              [`${id}-${parentId}`]: {
                id: `${id}-${parentId}`,
                type: "PART_OF",
                sourceId: id,
                targetId: parentId,
              },
            },
          };
          dispatch(addNodeAction({ graphId: variationId, node, edges }));
          markChanged();
        },

        removePart: (partId: string) => {
          dispatch(removeNodeAction({ graphId: variationId, nodeId: partId }));
          markChanged();
        },

        addMaterial: (materialId: string, label: string, typeRestrictions: string[]) => {
          const material = materialsRef.current?.[materialId];
          if (!material) {
            console.error("Material not found:", materialId);
            return;
          }
          const nodeId = label.toLowerCase().replaceAll(/\s+/g, "-");
          const node: MaterialNode = {
            id: nodeId,
            type: "MATERIAL",
            label,
            materialId,
            materialSnapshot: material,
            position: { x: 0, y: 0 },
            typeRestrictions,
          };
          dispatch(
            addNodeAction({
              graphId: variationId,
              node,
              edges: {
                inputs: {
                  [`garment-${nodeId}`]: {
                    id: `garment-${nodeId}`,
                    type: "HAS_MATERIAL",
                    sourceId: "garment",
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-garment`]: {
                    id: `${nodeId}-garment`,
                    type: "MATERIAL_OF",
                    sourceId: nodeId,
                    targetId: "garment",
                  },
                },
              },
            }),
          );
          markChanged();
        },

        removeMaterialNode: (nodeId: string) => {
          const g = getGraph();
          const node = g?.nodes?.[nodeId];
          if (!node || node.type !== "MATERIAL") {
            console.error("Material node not found for id:", nodeId);
            return;
          }
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        addElective: (name: string, garmentId: string, defaultValue: boolean = false) => {
          const hash = Math.random().toString(36).slice(2, 8);
          const nodeId = `elective-${hash}`;
          const node: ElectiveNode = {
            id: nodeId,
            type: "ELECTIVE",
            label: name,
            electiveId: hash,
            value: defaultValue,
            defaultValue,
            position: { x: 0, y: 0 },
          };
          dispatch(
            addNodeAction({
              graphId: variationId,
              node,
              edges: {
                inputs: {
                  [`${garmentId}-${nodeId}`]: {
                    id: `${garmentId}-${nodeId}`,
                    type: "HAS_ELECTIVE",
                    sourceId: garmentId,
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-${garmentId}`]: {
                    id: `${nodeId}-${garmentId}`,
                    type: "ELECTIVE_OF",
                    sourceId: nodeId,
                    targetId: garmentId,
                  },
                },
              },
            }),
          );
          markChanged();
        },

        removeElective: (nodeId: string) => {
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateElective: (nodeId: string, changes: Partial<ElectiveNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId];
          if (!curr) return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, ...changes },
            }),
          );
          markChanged();
        },

        addVisualization: (
          name: string,
          garmentId: string,
          materialNodeId: string,
          doms: VisualizationDom[],
        ) => {
          const g = getGraph();
          const hash = Math.random().toString(36).slice(2, 8);
          const nodeId = `visualization-${hash}`;
          dispatch(
            addNodeAction({
              graphId: variationId,
              node: {
                id: nodeId,
                type: "VISUALIZATION",
                label: name,
                visualizationId: hash,
                materialNodeId,
                doms,
                position: { x: 0, y: 0 },
              } as any,
              edges: {
                inputs: {
                  [`${materialNodeId}-${nodeId}`]: {
                    id: `${materialNodeId}-${nodeId}`,
                    type: "HAS_VISUALIZATION",
                    sourceId: materialNodeId,
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-${materialNodeId}`]: {
                    id: `${nodeId}-${materialNodeId}`,
                    type: "VISUALIZATION_OF",
                    sourceId: nodeId,
                    targetId: materialNodeId,
                  },
                },
              },
            }),
          );
          const materialNode = g?.nodes[materialNodeId] as MaterialNode | undefined;
          if (!materialNode) {
            console.error("Material node not found:", materialNodeId);
            return;
          }
          const mat = materialsRef.current![materialNode.materialId];
          const schema = materialTypesRef.current[mat.type]?.schemas[mat.schemaVersion];
          const colorAttr = Object.entries(schema.attributes).find(([, v]) => v === "color");
          if (!colorAttr) {
            console.error("No color attribute found for material type:", mat.type);
            return;
          }
          const colorHex = mat.attributes[colorAttr[0]].hex as string;
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const dom of doms) {
              const proxy: Partial<CSSProperties> = {};
              if (dom.fill) proxy.fill = colorHex;
              if (dom.stroke) proxy.stroke = colorHex;
              dispatch(
                addProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: dom.id,
                  styles: proxy as CSSProperties,
                }),
              );
            }
          }
          markChanged();
        },

        removeVisualization: (nodeId: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as VisualizationNode | undefined;
          if (!curr) return;
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const dom of curr.doms) {
              dispatch(
                deleteProxyAction({ path: svgPath, instanceName: variationId, id: dom.id }),
              );
            }
          }
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateVisualization: (nodeId: string, changes: Partial<VisualizationNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as VisualizationNode | undefined;
          if (!curr) return;
          const updatedNode = { ...curr, ...changes } as VisualizationNode;
          dispatch(updateNodeAction({ graphId: variationId, nodeId, changes: updatedNode }));

          if (!changes.doms && !changes.materialNodeId) return;
          if (curr.materialNodeId === updatedNode.materialNodeId && curr.doms === updatedNode.doms)
            return;

          dispatch(removeEdgeAction({ graphId: variationId, edgeId: `${curr.materialNodeId}-${curr.id}` }));
          dispatch(removeEdgeAction({ graphId: variationId, edgeId: `${curr.id}-${curr.materialNodeId}` }));
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                id: `${updatedNode.materialNodeId}-${updatedNode.id}`,
                type: "HAS_VISUALIZATION",
                sourceId: updatedNode.materialNodeId,
                targetId: updatedNode.id,
              },
            }),
          );
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                id: `${updatedNode.id}-${updatedNode.materialNodeId}`,
                type: "VISUALIZATION_OF",
                sourceId: updatedNode.id,
                targetId: updatedNode.materialNodeId,
              },
            }),
          );

          const currMaterialNode = g.nodes[updatedNode.materialNodeId] as MaterialNode | undefined;
          if (!currMaterialNode) {
            console.error("Material node not found:", curr.materialNodeId);
            return;
          }
          const currMaterial = materialsRef.current![currMaterialNode.materialId];
          const schema =
            materialTypesRef.current[currMaterial.type]?.schemas[currMaterial.schemaVersion];
          const colorAttr = Object.entries(schema.attributes).find(([, v]) => v === "color");
          if (!colorAttr) {
            console.error("No color attribute found for material type:", currMaterial.type);
            return;
          }
          const colorHex = currMaterial.attributes[colorAttr[0]].hex as string;
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const dom of curr.doms) {
              dispatch(deleteProxyAction({ path: svgPath, instanceName: variationId, id: dom.id }));
            }
            for (const dom of updatedNode.doms) {
              const proxy: Partial<CSSProperties> = {};
              if (dom.fill) proxy.fill = colorHex;
              if (dom.stroke) proxy.stroke = colorHex;
              dispatch(
                updateProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: dom.id,
                  changes: proxy as CSSProperties,
                }),
              );
            }
          }
          markChanged();
        },

        updateMaterial: (nodeId: string, materialId: string) => {
          const g = getGraph();
          if (!g) return;
          const material = materialsRef.current?.[materialId];
          const newNode = {
            ...g.nodes[nodeId],
            materialId,
            materialSnapshot: material,
          } as MaterialNode;
          dispatch(updateNodeAction({ graphId: variationId, nodeId, changes: newNode }));

          if (!material) return;
          const schema = materialTypesRef.current[material.type]?.schemas[material.schemaVersion];
          const colorAttr = Object.entries(schema.attributes).find(([, v]) => v === "color");
          if (!colorAttr) return;
          const colorHex = material.attributes[colorAttr[0]].hex as string;
          const visualizationEdges = Object.values(g.edges).filter(
            (edge) => edge.type === "HAS_VISUALIZATION" && edge.sourceId === nodeId,
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const edge of visualizationEdges) {
              const visualizationNode = g.nodes[edge.targetId] as VisualizationNode | undefined;
              if (!visualizationNode) return;
              for (const dom of visualizationNode.doms) {
                const proxy: Partial<CSSProperties> = {};
                if (dom.fill) proxy.fill = colorHex;
                if (dom.stroke) proxy.stroke = colorHex;
                dispatch(
                  updateProxyAction({
                    path: svgPath,
                    instanceName: variationId,
                    id: dom.id,
                    changes: proxy as CSSProperties,
                  }),
                );
              }
            }
          }
          markChanged();
        },

        addGraduations: (names: string[], garmentId: string) => {
          const g = getGraph();
          const graduationEdges = g
            ? Object.values(g.edges).filter(
                (e: any) => e.sourceId === garmentId && e.type === "HAS_GRADUATION",
              )
            : [];
          const graduationNodes = graduationEdges.map((e: any) =>
            g ? g.nodes[e.targetId] : undefined,
          );
          const maxOrder = graduationNodes.reduce(
            (m: number, n: any) => Math.max(m, n?.order ?? 0),
            -1,
          );
          names.forEach((name, i) => {
            const hash = Math.random().toString(36).slice(2, 8);
            const nodeId = `graduation-${hash}`;
            const node: GraduationNode = {
              id: nodeId,
              type: "GRADUATION",
              label: name,
              graduationId: hash,
              order: maxOrder + i + 1,
              amount: 0,
              position: { x: 0, y: 0 },
            };
            dispatch(
              addNodeAction({
                graphId: variationId,
                node,
                edges: {
                  inputs: {
                    [`${garmentId}-${nodeId}`]: {
                      id: `${garmentId}-${nodeId}`,
                      type: "HAS_GRADUATION",
                      sourceId: garmentId,
                      targetId: nodeId,
                    },
                  },
                  outputs: {
                    [`${nodeId}-${garmentId}`]: {
                      id: `${nodeId}-${garmentId}`,
                      type: "GRADUATION_OF",
                      sourceId: nodeId,
                      targetId: garmentId,
                    },
                  },
                },
              }),
            );
          });
          markChanged();
        },

        removeGraduation: (nodeId: string) => {
          const g = getGraph();
          if (g) {
            for (const edge of Object.values(g.edges)) {
              if (edge.type !== "CONSUMES" && edge.type !== "CONSUMED_BY") continue;
              const e = edge as ConsumesEdge | ConsumedByEdge;
              if (!(e as any).consumptionPerGrade?.[nodeId]) continue;
              const changes = dropGraduationFromEdge(e, nodeId);
              dispatch(updateEdgeAction({ graphId: variationId, edgeId: e.id, changes: changes as any }));
            }
          }
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateGraduation: (nodeId: string, changes: Partial<GraduationNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId];
          if (!curr) return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, ...changes },
            }),
          );
          markChanged();
        },

        reorderGraduations: (graduationIds: string[]) => {
          const g = getGraph();
          if (!g) return;
          graduationIds.forEach((id, index) => {
            const node = g.nodes[id] as GraduationNode;
            if (node.order !== index) {
              dispatch(
                updateNodeAction({
                  graphId: variationId,
                  nodeId: id,
                  changes: { ...node, order: index },
                }),
              );
            }
          });
          markChanged();
        },

        addProcessMaterialConsumption: (
          processNodeId: string,
          materialNodeId: string,
          amount: CompoundValue,
        ) => {
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                id: `${processNodeId}->${materialNodeId}`,
                type: "CONSUMES",
                sourceId: processNodeId,
                targetId: materialNodeId,
                amount,
              } as ConsumesEdge,
            }),
          );
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                type: "CONSUMED_BY",
                id: `${materialNodeId}->${processNodeId}`,
                targetId: processNodeId,
                sourceId: materialNodeId,
                amount,
              } as ConsumedByEdge,
            }),
          );
          markChanged();
        },

        removeProcessMaterialConsumption: (processNodeId: string, materialNodeId: string) => {
          dispatch(
            removeEdgeAction({ graphId: variationId, edgeId: `${processNodeId}->${materialNodeId}` }),
          );
          dispatch(
            removeEdgeAction({ graphId: variationId, edgeId: `${materialNodeId}->${processNodeId}` }),
          );
          markChanged();
        },

        updateProcessMaterialConsumption: (
          processNodeId: string,
          materialNodeId: string,
          newAmount: CompoundValue,
        ) => {
          const forwardId = `${processNodeId}->${materialNodeId}`;
          const reverseId = `${materialNodeId}->${processNodeId}`;
          const g = getGraph();
          const forward = g?.edges[forwardId] as ConsumesEdge | undefined;
          const nextDeltas = recomputeAllGradeDeltas(newAmount, forward?.consumptionPerGrade);
          dispatch(
            updateEdgeAction({
              graphId: variationId,
              edgeId: forwardId,
              changes: { amount: newAmount, gradeDeltas: nextDeltas } as any,
            }),
          );
          dispatch(
            updateEdgeAction({
              graphId: variationId,
              edgeId: reverseId,
              changes: { amount: newAmount, gradeDeltas: nextDeltas } as any,
            }),
          );
          markChanged();
        },

        setProcessMaterialConsumptionForGraduation: (
          processNodeId: string,
          materialNodeId: string,
          graduationId: string,
          consumption: CompoundValue,
        ) => {
          const forwardId = `${processNodeId}->${materialNodeId}`;
          const reverseId = `${materialNodeId}->${processNodeId}`;
          const g = getGraph();
          const forward = g?.edges[forwardId] as ConsumesEdge | undefined;
          if (!forward) return;
          const nextConsumption = {
            ...(forward.consumptionPerGrade ?? {}),
            [graduationId]: consumption,
          };
          const nextDeltas = { ...(forward.gradeDeltas ?? {}) };
          const delta = recomputeGradeDelta(forward.amount, consumption);
          if (delta !== undefined) nextDeltas[graduationId] = delta;
          else delete nextDeltas[graduationId];
          const changes = {
            consumptionPerGrade: nextConsumption,
            gradeDeltas: Object.keys(nextDeltas).length === 0 ? undefined : nextDeltas,
          };
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: forwardId, changes: changes as any }));
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: reverseId, changes: changes as any }));
          markChanged();
        },

        clearProcessMaterialConsumptionForGraduation: (
          processNodeId: string,
          materialNodeId: string,
          graduationId: string,
        ) => {
          const forwardId = `${processNodeId}->${materialNodeId}`;
          const reverseId = `${materialNodeId}->${processNodeId}`;
          const g = getGraph();
          const forward = g?.edges[forwardId] as ConsumesEdge | undefined;
          if (!forward) return;
          const changes = dropGraduationFromEdge(forward, graduationId);
          if (Object.keys(changes).length === 0) return;
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: forwardId, changes: changes as any }));
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: reverseId, changes: changes as any }));
          markChanged();
        },

        addProcess: (process: {
          name: string;
          costTime: CompoundValue;
          costMoney: CompoundValue;
        }) => {
          const g = getGraph();
          if (!g) return;
          const hash = Math.random().toString(36).slice(2, 8);
          const nodeId = `process-${hash}`;
          const newNode = {
            type: "PROCESS",
            label: process.name,
            id: nodeId,
            costMoney: process.costMoney,
            costTime: process.costTime,
            position: { x: 0, y: 0 },
            processId: hash,
          } as ProcessNode;
          dispatch(
            addNodeAction({
              graphId: variationId,
              node: newNode,
              edges: {
                inputs: {
                  [`garment->${nodeId}`]: {
                    type: "HAS_PROCESS",
                    id: `garment->${nodeId}`,
                    sourceId: "garment",
                    targetId: nodeId,
                  } as HasProcessEdge,
                },
                outputs: {
                  [`${nodeId}->garment`]: {
                    type: "PROCESS_OF",
                    id: `${nodeId}->garment`,
                    sourceId: nodeId,
                    targetId: "garment",
                  } as ProcessOfEdge,
                },
              },
            }),
          );
          markChanged();
        },

        removeProcess: (nodeId: string) => {
          const g = getGraph();
          if (!g) return;
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateProcess: (nodeId: string, changes: Partial<ProcessNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId];
          if (!curr) return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, ...changes },
            }),
          );
          markChanged();
        },

        // --- Logos ----------------------------------------------------------

        addLogo: (input: {
          name: string;
          method: LogoMethod;
          colors: number;
          defaultSize: { width: UnitValue; height: UnitValue };
          electiveNodeId?: string;
          source: { kind: "svg" } | { kind: "raster"; pendingVector?: boolean };
          document: { data: string; mime: string; filename?: string };
          garmentId?: string;
        }): string => {
          const garmentId = input.garmentId ?? "garment";
          const logoId = shortHash();
          const nodeId = `logo-${logoId}`;
          const documentId = shortHash();
          const docNodeId = `document-${documentId}`;
          const kind =
            input.source.kind === "raster" ? "logo-raster" : "logo-svg";
          const source: LogoSource =
            input.source.kind === "raster"
              ? {
                  kind: "raster",
                  documentId,
                  pendingVector: input.source.pendingVector ?? true,
                }
              : { kind: "svg", documentId };

          const logoNode: LogoNode = {
            id: nodeId,
            type: "LOGO",
            label: input.name,
            logoId,
            method: input.method,
            colors: input.colors,
            defaultSize: input.defaultSize,
            source,
            // The main copy is a draggable/resizable overlay (no rotation),
            // staged on top of the editor. Placements are added separately and
            // live inside the content SVG.
            mainCopy: { x: 24, y: 24, width: 160, height: 160 },
            electiveNodeId: input.electiveNodeId,
            placements: [],
            position: { x: 0, y: 0 },
          };

          dispatch(
            addNodeAction({
              graphId: variationId,
              node: logoNode,
              edges: {
                inputs: {
                  [`${garmentId}-${nodeId}`]: {
                    id: `${garmentId}-${nodeId}`,
                    type: "HAS_LOGO",
                    sourceId: garmentId,
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-${garmentId}`]: {
                    id: `${nodeId}-${garmentId}`,
                    type: "LOGO_OF",
                    sourceId: nodeId,
                    targetId: garmentId,
                  },
                },
              },
            }),
          );

          const docNode: DocumentNode = {
            id: docNodeId,
            type: "DOCUMENT",
            documentId,
            kind,
            mime: input.document.mime,
            filename: input.document.filename,
            encoding: "base64",
            data: input.document.data,
            position: { x: 0, y: 0 },
          };
          dispatch(
            addNodeAction({
              graphId: variationId,
              node: docNode,
              edges: {
                inputs: {
                  [`${nodeId}-${docNodeId}`]: {
                    id: `${nodeId}-${docNodeId}`,
                    type: "HAS_DOCUMENT",
                    sourceId: nodeId,
                    targetId: docNodeId,
                  },
                },
                outputs: {
                  [`${docNodeId}-${nodeId}`]: {
                    id: `${docNodeId}-${nodeId}`,
                    type: "DOCUMENT_OF",
                    sourceId: docNodeId,
                    targetId: nodeId,
                  },
                },
              },
            }),
          );

          const svgPath = getSvgPath();
          if (svgPath) {
            // Inject only the source <symbol>/<image> into defs; in-content
            // placements (which <use> it) are added separately. The main copy
            // renders from the document directly in the DOM overlay.
            dispatch(
              addInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                element: {
                  id: logoSymbolId(logoId),
                  mount: "defs",
                  markup: sourceDefsMarkup(
                    logoId,
                    source,
                    input.document,
                    input.defaultSize,
                  ),
                  order: 0,
                },
              }),
            );
          }
          markChanged();
          return nodeId;
        },

        updateLogoMainCopy: (
          nodeId: string,
          mainCopy: { x: number; y: number; width: number; height: number },
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, mainCopy },
            }),
          );
          markChanged();
        },

        updateLogo: (
          nodeId: string,
          changes: Partial<LogoNode> & {
            document?: { data: string; mime: string; filename?: string };
          },
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          const { document, ...nodeChanges } = changes;
          // When the source file is replaced the kind may change (svg↔raster),
          // so re-derive the symbol from the NEW source, not curr's.
          const effectiveSource = nodeChanges.source ?? curr.source;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, ...nodeChanges },
            }),
          );
          if (document) {
            const docNode = Object.values(g.nodes).find(
              (n): n is DocumentNode =>
                (n as any).type === "DOCUMENT" &&
                (n as DocumentNode).documentId === curr.source.documentId,
            );
            if (docNode) {
              dispatch(
                updateNodeAction({
                  graphId: variationId,
                  nodeId: docNode.id,
                  changes: {
                    ...docNode,
                    data: document.data,
                    mime: document.mime,
                    filename: document.filename ?? docNode.filename,
                  },
                }),
              );
            }
            const svgPath = getSvgPath();
            if (svgPath) {
              dispatch(
                updateInjectedElementAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: logoSymbolId(curr.logoId),
                  changes: {
                    markup: sourceDefsMarkup(
                      curr.logoId,
                      effectiveSource,
                      { mime: document.mime, data: document.data },
                      nodeChanges.defaultSize ?? curr.defaultSize,
                    ),
                  },
                }),
              );
            }
          }
          markChanged();
        },

        removeLogo: (nodeId: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          const svgPath = getSvgPath();
          if (svgPath) {
            dispatch(
              deleteInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                id: logoSymbolId(curr.logoId),
              }),
            );
            for (const p of curr.placements) {
              dispatch(
                deleteInjectedElementAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: logoClipWrapId(curr.logoId, p.placementId),
                }),
              );
              dispatch(
                deleteProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: logoContainerId(curr.logoId, p.placementId),
                }),
              );
              dispatch(
                deleteProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: logoClipWrapId(curr.logoId, p.placementId),
                }),
              );
              if (p.clipTargetId) {
                dispatch(
                  deleteInjectedElementAction({
                    path: svgPath,
                    instanceName: variationId,
                    id: logoClipId(p.placementId),
                  }),
                );
              }
            }
          }
          const docNode = Object.values(g.nodes).find(
            (n): n is DocumentNode =>
              (n as any).type === "DOCUMENT" &&
              (n as DocumentNode).documentId === curr.source.documentId,
          );
          if (docNode) {
            dispatch(removeNodeAction({ graphId: variationId, nodeId: docNode.id }));
          }
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        addLogoPlacement: (nodeId: string, name?: string): string | undefined => {
          const g = getGraph();
          if (!g) return undefined;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return undefined;
          const placementId = shortHash();
          const last = curr.placements[curr.placements.length - 1];
          const offset = last ? 10 : 0;
          // First placement: size it to the preview. Later ones inherit the
          // previous placement's transform (offset below) so a series stays
          // consistent with whatever the user scaled to.
          const baseTransform = last?.transform ?? {
            x: 0,
            y: 0,
            rotation: 0,
            scale: previewParityScale(curr.logoId, curr.mainCopy) ?? 1,
          };
          const placement: LogoPlacement = {
            placementId,
            name: name ?? `Cópia ${curr.placements.length + 1}`,
            size: last?.size ?? curr.defaultSize,
            transform: {
              ...baseTransform,
              x: baseTransform.x + offset,
              y: baseTransform.y + offset,
            },
          };
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, placements: [...curr.placements, placement] },
            }),
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            dispatch(
              addInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                element: {
                  // Injection root is the clip wrapper <g>; the transform proxy
                  // below targets the inner <use> by logoContainerId.
                  id: logoClipWrapId(curr.logoId, placementId),
                  mount: "container",
                  markup: placementContainerMarkup(curr.logoId, placementId),
                  order: curr.placements.length,
                },
              }),
            );
            dispatch(
              addProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: logoContainerId(curr.logoId, placementId),
                styles: {
                  transform: buildLogoTransform(placement.transform),
                } as CSSProperties,
              }),
            );
          }
          markChanged();
          return placementId;
        },

        updateLogoPlacement: (
          nodeId: string,
          placementId: string,
          transform: LogoPlacement["transform"],
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: {
                ...curr,
                placements: curr.placements.map((p) =>
                  p.placementId === placementId ? { ...p, transform } : p,
                ),
              },
            }),
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: logoContainerId(curr.logoId, placementId),
                changes: { transform: buildLogoTransform(transform) } as CSSProperties,
              }),
            );
          }
          markChanged();
        },

        resizeLogoPlacement: (
          nodeId: string,
          placementId: string,
          size: { width: UnitValue; height: UnitValue },
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: {
                ...curr,
                placements: curr.placements.map((p) =>
                  p.placementId === placementId ? { ...p, size } : p,
                ),
              },
            }),
          );
          markChanged();
        },

        setLogoPlacementCostExpression: (
          nodeId: string,
          placementId: string,
          costExpression: string,
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: {
                ...curr,
                placements: curr.placements.map((p) =>
                  p.placementId === placementId ? { ...p, costExpression } : p,
                ),
              },
            }),
          );
          markChanged();
        },

        renameLogoPlacement: (
          nodeId: string,
          placementId: string,
          name: string,
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: {
                ...curr,
                placements: curr.placements.map((p) =>
                  p.placementId === placementId ? { ...p, name } : p,
                ),
              },
            }),
          );
          markChanged();
        },

        clipLogoPlacement: (
          nodeId: string,
          placementId: string,
          clipTargetId: string,
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          const placement = curr.placements.find(
            (p) => p.placementId === placementId,
          );
          const wrapId = logoClipWrapId(curr.logoId, placementId);
          // Measured before anything is dispatched — the compensation needs the
          // placement's *current* parent, which the anchor below replaces.
          const moved = placement
            ? translateForNewParent(wrapId, clipTargetId, placement.transform)
            : undefined;
          const transform =
            placement && moved
              ? { ...placement.transform, x: moved.x, y: moved.y }
              : placement?.transform;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: {
                ...curr,
                placements: curr.placements.map((p) =>
                  p.placementId === placementId
                    ? { ...p, clipTargetId, ...(transform ? { transform } : {}) }
                    : p,
                ),
              },
            }),
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            if (transform) {
              dispatch(
                updateProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: logoContainerId(curr.logoId, placementId),
                  changes: { transform: buildLogoTransform(transform) } as any,
                }),
              );
            }
            dispatch(
              addInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                element: {
                  id: logoClipId(placementId),
                  mount: "defs",
                  markup: clipPathMarkup(placementId, clipTargetId),
                  order: 1,
                },
              }),
            );
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                // Clip the untransformed wrapper, not the transformed <use>, so
                // the userSpaceOnUse target geometry stays in root space.
                id: logoClipWrapId(curr.logoId, placementId),
                changes: {
                  "clip-path": `url(#${logoClipId(placementId)})`,
                } as any,
              }),
            );
            // Mount the placement just above its clip target in paint order so
            // it sits on the clipped element's layer (below anything drawn after
            // it), instead of on top of the whole drawing.
            dispatch(
              updateInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                id: logoClipWrapId(curr.logoId, placementId),
                changes: { anchor: clipTargetId },
              }),
            );
          }
          markChanged();
        },

        removeLogoPlacement: (nodeId: string, placementId: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          const placement = curr.placements.find(
            (p) => p.placementId === placementId,
          );
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: {
                ...curr,
                placements: curr.placements.filter(
                  (p) => p.placementId !== placementId,
                ),
              },
            }),
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            dispatch(
              deleteInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                id: logoClipWrapId(curr.logoId, placementId),
              }),
            );
            dispatch(
              deleteProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: logoContainerId(curr.logoId, placementId),
              }),
            );
            dispatch(
              deleteProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: logoClipWrapId(curr.logoId, placementId),
              }),
            );
            if (placement?.clipTargetId) {
              dispatch(
                deleteInjectedElementAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: logoClipId(placementId),
                }),
              );
            }
          }
          markChanged();
        },

        linkLogoElective: (nodeId: string, electiveNodeId: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as LogoNode | undefined;
          if (!curr || curr.type !== "LOGO") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, electiveNodeId },
            }),
          );
          markChanged();
        },

        // --- Annotations ----------------------------------------------------

        addAnnotation: (input: {
          garmentId?: string;
          label?: string;
          text?: string;
        }): string => {
          const garmentId = input.garmentId ?? "garment";
          const annotationId = shortHash();
          const nodeId = annotationGroupId(annotationId);
          const g = getGraph();
          const count = Object.values(g?.nodes ?? {}).filter(
            (n): n is AnnotationNode => (n as any).type === "ANNOTATION",
          ).length;
          // Stagger defaults so successive annotations don't stack exactly.
          const off = count * 16;
          const target = { x: 120 + off, y: 120 + off };
          const transform = { x: 200 + off, y: 90 + off, scale: 1 };

          const node: AnnotationNode = {
            id: nodeId,
            type: "ANNOTATION",
            label: input.label ?? `Anotação ${count + 1}`,
            annotationId,
            text: input.text ?? "Nova anotação",
            target,
            transform,
            position: { x: 0, y: 0 },
          };

          dispatch(
            addNodeAction({
              graphId: variationId,
              node,
              edges: {
                inputs: {
                  [`${garmentId}-${nodeId}`]: {
                    id: `${garmentId}-${nodeId}`,
                    type: "HAS_ANNOTATION",
                    sourceId: garmentId,
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-${garmentId}`]: {
                    id: `${nodeId}-${garmentId}`,
                    type: "ANNOTATION_OF",
                    sourceId: nodeId,
                    targetId: garmentId,
                  },
                },
              },
            }),
          );

          const svgPath = getSvgPath();
          if (svgPath) {
            dispatch(
              addInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                element: {
                  id: annotationGroupId(annotationId),
                  mount: "container",
                  markup: annotationGroupMarkup(node, themeRef.current),
                  order: count,
                },
              }),
            );
            dispatch(
              addProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationTextId(annotationId),
                styles: {
                  transform: annotationTransformStr(transform),
                } as CSSProperties,
              }),
            );
            dispatch(
              addProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationLineId(annotationId),
                styles: annotationLineStyles(target, transform) as any,
              }),
            );
            dispatch(
              addProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationTargetId(annotationId),
                styles: annotationTargetStyles(target) as any,
              }),
            );
          }
          markChanged();
          return nodeId;
        },

        renameAnnotation: (nodeId: string, label: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as AnnotationNode | undefined;
          if (!curr || curr.type !== "ANNOTATION") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, label },
            }),
          );
          markChanged();
        },

        updateAnnotationText: (nodeId: string, text: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as AnnotationNode | undefined;
          if (!curr || curr.type !== "ANNOTATION") return;
          const next = { ...curr, text };
          dispatch(
            updateNodeAction({ graphId: variationId, nodeId, changes: next }),
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            // Text lives in the markup (not a proxy), so re-inject the group; the
            // geometry proxies re-apply on the same render pass.
            dispatch(
              updateInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationGroupId(curr.annotationId),
                changes: { markup: annotationGroupMarkup(next, themeRef.current) },
              }),
            );
          }
          markChanged();
        },

        // Label move/scale, committed from the manipulation handles.
        updateAnnotationTransform: (
          nodeId: string,
          transform: AnnotationNode["transform"],
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as AnnotationNode | undefined;
          if (!curr || curr.type !== "ANNOTATION") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, transform },
            }),
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationTextId(curr.annotationId),
                changes: {
                  transform: annotationTransformStr(transform),
                } as CSSProperties,
              }),
            );
            // Leader line label-end follows the label origin.
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationLineId(curr.annotationId),
                changes: annotationLineStyles(curr.target, transform) as any,
              }),
            );
          }
          markChanged();
        },

        // Target-point drag, committed from the overlay.
        updateAnnotationTarget: (
          nodeId: string,
          target: AnnotationNode["target"],
        ) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as AnnotationNode | undefined;
          if (!curr || curr.type !== "ANNOTATION") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, target },
            }),
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationTargetId(curr.annotationId),
                changes: annotationTargetStyles(target) as any,
              }),
            );
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationLineId(curr.annotationId),
                changes: annotationLineStyles(target, curr.transform) as any,
              }),
            );
          }
          markChanged();
        },

        // Visibility gate driven by the elective. Kept separate from the node so
        // the overlay can reconcile it reactively (annotations have no cost
        // middleware to ride along with, unlike logos).
        setAnnotationHidden: (nodeId: string, hidden: boolean) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as AnnotationNode | undefined;
          if (!curr || curr.type !== "ANNOTATION") return;
          const svgPath = getSvgPath();
          if (!svgPath) return;
          dispatch(
            updateProxyAction({
              path: svgPath,
              instanceName: variationId,
              id: annotationGroupId(curr.annotationId),
              changes: { display: hidden ? "none" : "inline" } as any,
            }),
          );
        },

        linkAnnotationElective: (nodeId: string, electiveNodeId: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as AnnotationNode | undefined;
          if (!curr || curr.type !== "ANNOTATION") return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, electiveNodeId },
            }),
          );
          markChanged();
        },

        removeAnnotation: (nodeId: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as AnnotationNode | undefined;
          if (!curr || curr.type !== "ANNOTATION") return;
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          const svgPath = getSvgPath();
          if (svgPath) {
            const aId = curr.annotationId;
            dispatch(
              deleteInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                id: annotationGroupId(aId),
              }),
            );
            for (const id of [
              annotationTextId(aId),
              annotationLineId(aId),
              annotationTargetId(aId),
              annotationGroupId(aId),
            ]) {
              dispatch(
                deleteProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id,
                }),
              );
            }
          }
          markChanged();
        },
      },
    }),
    [variationId, dispatch, markChanged, getGraph, getSvgPath],
  );
}
