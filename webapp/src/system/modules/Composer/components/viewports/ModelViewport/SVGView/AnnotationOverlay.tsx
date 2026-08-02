import { useEffect, useMemo, useRef } from "react";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import { useVariationActions } from "../../../../hooks/useVariationActions";
import type { AnnotationNode, ElectiveNode } from "../../../../typings";

const targetElementId = (annotationId: string) =>
  `annotation-target-${annotationId}`;
const lineElementId = (annotationId: string) =>
  `annotation-line-${annotationId}`;

type DragState = {
  nodeId: string;
  annotationId: string;
  circle: SVGGraphicsElement;
  line: SVGElement | null;
};

/**
 * Headless overlay for annotations. The annotation geometry itself lives inside
 * the editor SVG (injected, so it zooms/pans and exports), so this component
 * renders nothing. It owns two cross-cutting concerns:
 *
 *  1. Elective gating — hide/show each annotation group when its linked elective
 *     toggles. Annotations have no cost middleware to ride along with (unlike
 *     logos), so visibility is reconciled here.
 *  2. Target-point dragging — the leader's anchor is a <circle> inside the editor
 *     SVG; a delegated pointer handler drags it in user space and commits.
 */
function AnnotationOverlay({
  variationId,
}: Readonly<{ variationId: string }>) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const { actions } = useVariationActions({ variationId });

  // Minimal slices: gate visibility on (annotation → elective link) + elective
  // values; dragging needs the id mapping.
  const annotations = useAppSelector((s: any): AnnotationNode[] => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return [];
    return (Object.values(nodes) as any[]).filter(
      (n): n is AnnotationNode => n.type === "ANNOTATION",
    );
  }, shallowEqual);

  const electiveValues = useAppSelector((s: any): Record<string, boolean> => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return {};
    const out: Record<string, boolean> = {};
    for (const n of Object.values(nodes) as any[]) {
      if (n.type === "ELECTIVE") out[n.id] = (n as ElectiveNode).value !== false;
    }
    return out;
  }, shallowEqual);

  // Map injected target-circle id → owning annotation node, for drag dispatch.
  const targetMap = useMemo(() => {
    const map: Record<string, { nodeId: string; annotationId: string }> = {};
    for (const a of annotations) {
      map[targetElementId(a.annotationId)] = {
        nodeId: a.id,
        annotationId: a.annotationId,
      };
    }
    return map;
  }, [annotations]);

  // Reconcile elective-gated visibility. Dispatch only on change to avoid churn.
  const lastHiddenRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    for (const a of annotations) {
      const hidden = !!a.electiveNodeId && electiveValues[a.electiveNodeId] === false;
      const prev = lastHiddenRef.current[a.id] ?? false;
      if (prev !== hidden) actions.setAnnotationHidden(a.id, hidden);
      lastHiddenRef.current[a.id] = hidden;
    }
  }, [annotations, electiveValues, actions]);

  // Delegated target-point drag. The target <circle> sits inside #svg-editor in
  // user space; convert screen deltas through the circle's parent CTM and update
  // the circle + leader line live, committing on pointer-up.
  useEffect(() => {
    const svg = document.getElementById(
      "svg-editor",
    ) as SVGSVGElement | null;
    if (!svg) return;

    let drag: DragState | null = null;

    const toLocal = (parent: SVGGraphicsElement, clientX: number, clientY: number) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = parent.getScreenCTM();
      if (!ctm) return null;
      const p = pt.matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    };

    const onPointerDown = (e: PointerEvent) => {
      let el = e.target as Element | null;
      while (el && el !== svg) {
        const owner = el.id ? targetMap[el.id] : undefined;
        if (owner) {
          const circle = el as SVGGraphicsElement;
          e.preventDefault();
          e.stopPropagation();
          drag = {
            nodeId: owner.nodeId,
            annotationId: owner.annotationId,
            circle,
            line: svg.querySelector(`#${lineElementId(owner.annotationId)}`),
          };
          (circle as any).setPointerCapture?.(e.pointerId);
          return;
        }
        el = el.parentElement;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag) return;
      const parent = drag.circle.parentNode as SVGGraphicsElement | null;
      if (!parent) return;
      const local = toLocal(parent, e.clientX, e.clientY);
      if (!local) return;
      drag.circle.setAttribute("cx", String(local.x));
      drag.circle.setAttribute("cy", String(local.y));
      drag.line?.setAttribute("x1", String(local.x));
      drag.line?.setAttribute("y1", String(local.y));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!drag) return;
      const parent = drag.circle.parentNode as SVGGraphicsElement | null;
      const local = parent ? toLocal(parent, e.clientX, e.clientY) : null;
      if (local) actions.updateAnnotationTarget(drag.nodeId, local);
      drag = null;
    };

    svg.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      svg.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [targetMap, actions]);

  return null;
}

export default AnnotationOverlay;
