import { Selection } from "d3";
import { ManipulateMode, ManipulateTransform } from "../../interfaces";

export type ManipulationHandlesProps = {
  svgRoot: SVGSVGElement | null;
  targetId?: string;
  mode: ManipulateMode;
  onTransform: (id: string, t: ManipulateTransform) => void;
  /** Stroke/fill for the selection chrome (outline + handles). */
  color?: string;
};

/**
 * Parse a "translate(x,y) rotate(deg cx cy) scale(s)" transform string into the
 * logical {x, y, rotation, scale} values. Missing pieces default to identity.
 */
export function parseTransform(
  value: string | null | undefined,
): ManipulateTransform {
  const out: ManipulateTransform = { x: 0, y: 0, rotation: 0, scale: 1 };
  if (!value) return out;
  const translate = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/.exec(value);
  if (translate) {
    out.x = parseFloat(translate[1]);
    out.y = parseFloat(translate[2]);
  }
  const rotate = /rotate\(\s*(-?[\d.]+)/.exec(value);
  if (rotate) out.rotation = parseFloat(rotate[1]);
  const scale = /scale\(\s*(-?[\d.]+)/.exec(value);
  if (scale) out.scale = parseFloat(scale[1]);
  return out;
}

/** Build the transform string emitted to the proxy, pivoting rotation on (cx,cy). */
export function buildTransform(
  t: ManipulateTransform,
  center: { cx: number; cy: number },
): string {
  return `translate(${t.x},${t.y}) rotate(${t.rotation} ${center.cx} ${center.cy}) scale(${t.scale})`;
}

const findById = (
  root: SVGSVGElement,
  id: string,
): SVGGraphicsElement | undefined =>
  Array.from(root.querySelectorAll<SVGGraphicsElement>("[id]")).find(
    (el) => el.id === id,
  );

const screenCenter = (el: SVGGraphicsElement) => {
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
};

type LocalBox = { x: number; y: number; width: number; height: number };

/**
 * For a logo placement `<use>` of a *cropped* symbol, the selection box is the
 * crop rect, not `getBBox()`. The editor's `<use>` renders the symbol's raw
 * content and ignores its root viewBox, so a cropped placement clips visually
 * (via the symbol's `logo-crop-…` clip-path) while `getBBox()` still reports the
 * full, pre-crop geometry — which would draw an oversized, wrong-shaped outline.
 * The cropped symbol's root width/height equal the crop rect (origin 0,0), so we
 * use those when the crop clip is present. Returns null for everything else
 * (plain elements, uncropped logos) so they keep using `getBBox()`.
 */
const croppedUseBox = (
  root: SVGSVGElement,
  el: SVGGraphicsElement,
): LocalBox | null => {
  if (el.tagName.toLowerCase() !== "use") return null;
  const href = el.getAttribute("href") || el.getAttribute("xlink:href") || "";
  if (!href.startsWith("#")) return null;
  const sym = findById(root, href.slice(1));
  if (!sym || !sym.querySelector('[id^="logo-crop-"]')) return null;
  const width = parseFloat(sym.getAttribute("width") || "");
  const height = parseFloat(sym.getAttribute("height") || "");
  if (!(width > 0) || !(height > 0)) return null;
  return { x: 0, y: 0, width, height };
};

/**
 * Render selection chrome (outline + rotate/scale handles) for the selected
 * injected element and wire drag interactions.
 *
 * The target lives inside a nested <svg> (its own coordinate system), while the
 * handles render in the outer tools group. To keep them aligned we set the
 * handle group's transform to the matrix that maps the target's local geometry
 * space into the tools-group space (derived from screen CTMs), and recompute it
 * live as the target transform changes. All pointer math is done in screen
 * pixels; only the translate is converted back into the target's parent space.
 */
export default function renderManipulationHandles(
  selection: Selection<SVGGElement, any, any, any>,
  {
    svgRoot,
    targetId,
    mode: _mode,
    onTransform,
    color = "#1976d2",
  }: ManipulationHandlesProps,
) {
  selection.selectChildren("*").remove();
  if (!svgRoot || !targetId) return;

  const target = findById(svgRoot, targetId);
  if (!target || typeof target.getBBox !== "function") return;

  let bbox: LocalBox;
  const cropBox = croppedUseBox(svgRoot, target);
  if (cropBox) {
    bbox = cropBox;
  } else {
    try {
      bbox = target.getBBox();
    } catch {
      return;
    }
  }
  if (!bbox.width && !bbox.height) return;

  const toolsNode = selection.node();
  if (!toolsNode) return;

  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const current = parseTransform(target.getAttribute("transform"));

  const group = selection.append("g").attr("class", "manipulation-handles");

  // Map the target's local geometry space → tools-group space so the outline
  // and handles sit exactly on the (transformed) target. Recomputed on each
  // live update so the chrome follows the element while dragging/scaling.
  let screenScale = 1;
  const syncGroupMatrix = () => {
    const tctm = target.getScreenCTM();
    const toolsCTM = toolsNode.getScreenCTM();
    if (!tctm || !toolsCTM) return;
    const rel = toolsCTM.inverse().multiply(tctm);
    group.attr(
      "transform",
      `matrix(${rel.a},${rel.b},${rel.c},${rel.d},${rel.e},${rel.f})`,
    );
    screenScale = Math.hypot(rel.a, rel.b) || 1;
  };
  syncGroupMatrix();

  // Handle radius in local units that renders ~7px on screen.
  const hr = 7 / screenScale;

  // Selection outline (1px screen stroke regardless of scale).
  group
    .append("rect")
    .attr("x", bbox.x)
    .attr("y", bbox.y)
    .attr("width", bbox.width)
    .attr("height", bbox.height)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4 2")
    .attr("vector-effect", "non-scaling-stroke")
    .style("pointer-events", "none");

  const applyLive = (t: ManipulateTransform) => {
    target.setAttribute("transform", buildTransform(t, { cx, cy }));
    syncGroupMatrix();
  };

  const beginDrag =
    (
      init: (start: { x: number; y: number }) => void,
      onMove: (e: PointerEvent, start: { x: number; y: number }) => void,
    ) =>
    (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const start = { x: event.clientX, y: event.clientY };
      init(start);
      const move = (e: PointerEvent) => onMove(e, start);
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        onTransform(targetId, { ...current });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  // Move: convert the incremental screen delta into the target parent's user
  // space so the translate magnitude is correct despite the nested-svg scaling.
  const parent = target.parentNode as SVGGraphicsElement | null;
  group
    .append("rect")
    .attr("x", bbox.x)
    .attr("y", bbox.y)
    .attr("width", bbox.width)
    .attr("height", bbox.height)
    .attr("fill", "transparent")
    .style("cursor", "move")
    .on(
      "pointerdown",
      beginDrag(
        () => {},
        (e, start) => {
          const inv = parent?.getScreenCTM?.()?.inverse();
          const dxs = e.clientX - start.x;
          const dys = e.clientY - start.y;
          current.x += inv ? inv.a * dxs + inv.c * dys : dxs;
          current.y += inv ? inv.b * dxs + inv.d * dys : dys;
          start.x = e.clientX;
          start.y = e.clientY;
          applyLive(current);
        },
      ),
    );

  // Rotate handle (top-right): angle delta around the element's screen center.
  {
    let center = { x: 0, y: 0 };
    let a0 = 0;
    let rot0 = 0;
    group
      .append("circle")
      .attr("cx", bbox.x + bbox.width + hr * 2)
      .attr("cy", bbox.y - hr * 2)
      .attr("r", hr)
      .attr("fill", color)
      .style("cursor", "grab")
      .on(
        "pointerdown",
        beginDrag(
          (start) => {
            center = screenCenter(target);
            a0 = Math.atan2(start.y - center.y, start.x - center.x);
            rot0 = current.rotation;
          },
          (e) => {
            const a1 = Math.atan2(e.clientY - center.y, e.clientX - center.x);
            current.rotation = rot0 + ((a1 - a0) * 180) / Math.PI;
            applyLive(current);
          },
        ),
      );
  }

  // Scale handle (bottom-right): screen-distance ratio from the center.
  {
    let center = { x: 0, y: 0 };
    let d0 = 1;
    let scale0 = 1;
    group
      .append("rect")
      .attr("x", bbox.x + bbox.width - hr)
      .attr("y", bbox.y + bbox.height - hr)
      .attr("width", hr * 2)
      .attr("height", hr * 2)
      .attr("fill", color)
      .style("cursor", "nwse-resize")
      .on(
        "pointerdown",
        beginDrag(
          (start) => {
            center = screenCenter(target);
            d0 = Math.hypot(start.x - center.x, start.y - center.y) || 1;
            scale0 = current.scale;
          },
          (e) => {
            const d1 = Math.hypot(e.clientX - center.x, e.clientY - center.y);
            current.scale = Math.max(0.02, scale0 * (d1 / d0));
            applyLive(current);
          },
        ),
      );
  }
}
