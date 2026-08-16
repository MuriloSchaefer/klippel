import { useEffect, useMemo, useRef } from "react";

import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";
import type { IGraphModule } from "@kernel/modules/Graphs";
import { selectSVGState } from "@kernel/modules/SVG/store/selectors";
import {
  addInjectedElement as addInjectedElementAction,
  updateInjectedElement as updateInjectedElementAction,
  updateProxy as updateProxyAction,
} from "@kernel/modules/SVG/store/actions";
import type { IMaterialsModule } from "@system/modules/Materials";
import {
  ensureMaterialsLoaded,
  unpinMaterials,
} from "@system/modules/Materials/store/materials/actions";

import type {
  DocumentNode,
  LogoNode,
  MaterialNode,
  VisualizationNode,
} from "../typings";
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

/**
 * Rebuild the SVG presentation layer for a variation that was just loaded.
 *
 * Logos, placements and visualizations are stored as *graph* nodes. What makes
 * them visible is a second, derived representation in the SVG module — injected
 * `<symbol>`/`<use>`/`<clipPath>` elements and colour proxies — which the
 * creating actions dispatch as a side effect. Nothing else ever wrote it, so it
 * only existed for as long as the session that created it: reopening a model
 * rebuilt the graph and left the derived layer empty. Every placement `<use>`
 * then pointed at a `#logo-sym-…` that no longer existed and painted nothing,
 * and every visualization lost its colour, so the drawing came back in the
 * artwork's original fills.
 *
 * This hook closes that loop. It is deliberately *additive and keyed*: an entry
 * is dispatched only when its id is absent, so it can run on every render, it
 * never clobbers a live edit (a drag in progress, a freshly picked clip), and
 * re-running it is a no-op. That also makes it safe against the graph and the
 * SVG instance arriving in either order — whichever lands second triggers the
 * effect that fills in the rest.
 *
 * Deletions are not its business: removing a node dispatches its own cleanup.
 */
export default function useVariationRehydration({
  variationId,
  svgPath,
}: {
  variationId: string;
  svgPath?: string;
}) {
  const storeModule = useModule<Store>("Store");
  const graphModule = useModule<IGraphModule>("Graph");
  const materialsModule = useModule<IMaterialsModule>("Materials");

  const dispatch = storeModule.hooks.useAppDispatch();
  const { useAppSelector } = storeModule.hooks;
  const graph = graphModule.hooks.useGraph(variationId);

  const materialTypes = materialsModule.hooks.useMaterialTypes();

  const svgInstance = useAppSelector((state) =>
    svgPath ? selectSVGState(svgPath)(state)?.instances[variationId] : undefined,
  );

  const nodes = graph.state?.nodes;

  // This pass genuinely needs to re-run when catalog data lands (it paints
  // material colours onto the SVG), so unlike the action hooks it stays
  // subscribed — but only to the materials this variation references. The
  // whole-catalog subscription re-ran it on every unrelated tick
  // (docs/analysis/materials-catalog-lag-analysis.md, F3).
  const referencedMaterialIds = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(nodes ?? {})
            .filter((n): n is MaterialNode => (n as any).type === "MATERIAL")
            .map((n) => n.materialId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [nodes],
  );
  const materials = materialsModule.hooks.useMaterials(referencedMaterialIds);

  // A variation restored from `.session/` never went through `openModel`, so
  // nothing has told the catalog to keep its materials resident. Without this
  // the rehydrated editor paints colours from a mirror that may not contain
  // the rows it references — the pin is what makes the whole-catalog
  // assumption this hook used to rely on unnecessary rather than merely
  // unstated.
  //
  // The pin is owned by this variation and released when the editor goes
  // away, so the mirror can reclaim a closed model's materials instead of
  // holding every material every model ever opened referenced. Coming back
  // within the residency TTL finds the rows still resident; later, they are
  // re-resolved by id.
  useEffect(() => {
    if (!referencedMaterialIds.length) return;
    dispatch(
      ensureMaterialsLoaded({ ids: referencedMaterialIds, owner: variationId }),
    );
    return () => {
      dispatch(unpinMaterials({ owner: variationId }));
    };
  }, [dispatch, referencedMaterialIds, variationId]);

  // Read the SVG layer through a ref, never through the effect's deps.
  //
  // Everything this hook dispatches lands in that same slice, so depending on
  // it means every write re-runs the effect — and since the reducers rebuild
  // their objects, "nothing changed" still arrives as a new identity. Reactive
  // deps here are a render loop, not a refresh.
  const svgRef = useRef(svgInstance);
  svgRef.current = svgInstance;

  // One pass per loaded document. Re-running is not how corrections happen:
  // creating, editing and deleting a logo or visualization each dispatch their
  // own SVG-layer updates, so this hook only has to cover the gap between a
  // document being restored and anything being edited.
  const rehydratedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const instance = svgRef.current;
    if (!svgPath || !nodes || !instance) return;
    const key = `${svgPath}::${variationId}`;
    if (rehydratedRef.current === key) return;
    rehydratedRef.current = key;

    const injected = instance.injected;
    const proxies = instance.proxies;
    const hasInjected = (id: string) => Boolean(injected?.[id]);
    const hasProxy = (id: string) => Boolean(proxies?.[id]);

    const inject = (
      id: string,
      mount: "defs" | "container",
      markup: string,
      order: number,
      anchor?: string,
    ) => {
      if (hasInjected(id)) return;
      dispatch(
        addInjectedElementAction({
          path: svgPath,
          instanceName: variationId,
          element: { id, mount, markup, order, ...(anchor ? { anchor } : {}) },
        }),
      );
    };

    // --- Logos: symbol def, then one container (+ optional clip) per placement
    const documents = Object.values(nodes).filter(
      (n): n is DocumentNode => (n as any).type === "DOCUMENT",
    );

    Object.values(nodes)
      .filter((n): n is LogoNode => (n as any).type === "LOGO")
      .forEach((logo) => {
        const doc = documents.find(
          (d) => d.documentId === logo.source.documentId,
        );
        // A logo whose document node is missing cannot be drawn at all; leaving
        // the placements uninjected is better than injecting <use>s that dangle
        // (which is the very failure this hook exists to fix). The same applies
        // when the node is present but carries no inline `data`: logo assets
        // are the inline shape, so that is a broken document, not an
        // attachment-style one whose bytes live in a fileStream.
        if (!doc?.data) return;
        // Re-bind so the narrowing survives into the call below — TS keeps
        // `doc.data` as `string | undefined` on a property read.
        const inlineDoc = { ...doc, data: doc.data };

        inject(
          logoSymbolId(logo.logoId),
          "defs",
          sourceDefsMarkup(logo.logoId, logo.source, inlineDoc, logo.defaultSize),
          0,
        );

        logo.placements.forEach((placement, index) => {
          const wrapId = logoClipWrapId(logo.logoId, placement.placementId);
          const useId = logoContainerId(logo.logoId, placement.placementId);

          // A clipped placement mounts just above its clip target so it paints
          // on that element's layer rather than over the whole drawing — the
          // same anchoring `clipLogoPlacement` applies.
          inject(
            wrapId,
            "container",
            placementContainerMarkup(logo.logoId, placement.placementId),
            index,
            placement.clipTargetId,
          );

          if (!hasProxy(useId)) {
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: useId,
                changes: { transform: buildLogoTransform(placement.transform) } as any,
              }),
            );
          }

          if (!placement.clipTargetId) return;

          inject(
            logoClipId(placement.placementId),
            "defs",
            clipPathMarkup(placement.placementId, placement.clipTargetId),
            1,
          );

          if (!hasProxy(wrapId)) {
            dispatch(
              updateProxyAction({
                path: svgPath,
                instanceName: variationId,
                id: wrapId,
                changes: {
                  "clip-path": `url(#${logoClipId(placement.placementId)})`,
                } as any,
              }),
            );
          }
          // The anchor is part of the injected entry, so an entry that already
          // existed unanchored (placement injected before its clip was picked)
          // needs it applied separately.
          if (injected?.[wrapId] && !injected[wrapId].anchor) {
            dispatch(
              updateInjectedElementAction({
                path: svgPath,
                instanceName: variationId,
                id: wrapId,
                changes: { anchor: placement.clipTargetId },
              }),
            );
          }
        });
      });

    // --- Visualizations: the material colour, as a fill/stroke proxy per dom
    if (!materials || !materialTypes) return;

    Object.values(nodes)
      .filter((n): n is VisualizationNode => (n as any).type === "VISUALIZATION")
      .forEach((visualization) => {
        const materialNode = nodes[visualization.materialNodeId] as
          | MaterialNode
          | undefined;
        if (!materialNode) return;
        const material = materials[materialNode.materialId];
        if (!material) return;
        const schema =
          materialTypes[material.type]?.schemas?.[material.schemaVersion];
        if (!schema) return;
        const colorAttr = Object.entries(schema.attributes).find(
          ([, kind]) => kind === "color",
        );
        if (!colorAttr) return;
        const colorHex = material.attributes[colorAttr[0]]?.hex as
          | string
          | undefined;
        if (!colorHex) return;

        visualization.doms.forEach((dom) => {
          const changes: Record<string, string> = {};
          if (dom.fill) changes.fill = colorHex;
          if (dom.stroke) changes.stroke = colorHex;
          if (!Object.keys(changes).length) return;
          dispatch(
            updateProxyAction({
              path: svgPath,
              instanceName: variationId,
              id: dom.id,
              changes: changes as any,
            }),
          );
        });
      });
    // `svgInstance` is read through `svgRef` and deliberately absent from the
    // deps — see the ref's comment. What is listed is only what decides
    // *whether the pass can run*: the document identity, and the data it reads
    // once. `rehydratedRef` makes a re-run on any of these a no-op anyway.
  }, [dispatch, svgPath, variationId, nodes, materials, materialTypes]);
}
