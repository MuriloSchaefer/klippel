import { Selection, axisBottom, axisRight, scaleLinear, select } from "d3";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { selectSVGState } from "../store/selectors";
import { updateSVG } from "../store/actions";
import { useTheme } from "@mui/material/styles";
import { EditorToolkitContext } from "../components/SVGEditorToolkit";
import { randomString } from "@kernel/utils";
import useD3Container from "./useD3Container";
import renderManipulationHandles from "../components/d3/ManipulationHandles";

interface SVGEditorProps {
  svgPath: string;
  instanceName: string;
  beforeInjection?: (svgRoot: SVGSVGElement) => SVGSVGElement;
}

// Parse an injected SVG fragment robustly. Wrapping in a namespaced <svg> so
// fragments using xlink:href (e.g. <use xlink:href="#id">) parse without a
// "Namespace prefix xlink ... not defined" error, and importing the first
// element into the target document. Returns null on parse failure.
function parseInjectedFragment(
  markup: string,
  ownerDocument: Document,
): Element | null {
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${markup}</svg>`;
  const doc = new DOMParser().parseFromString(wrapped, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;
  const first = doc.documentElement.firstElementChild;
  if (!first) return null;
  return ownerDocument.importNode(first, true) as Element;
}

// Marker classes stamped on elements this editor mounts on top of the artwork.
// They are the presentation layer, owned by `svgState.injected` — never part of
// the stored document.
const INJECTED_MARKERS = ".svg-injected-container, .injected-def";

/**
 * Drop the editor's own injections from a document.
 *
 * The presentation layer is derived state: every render re-mounts it from
 * `svgState.injected`, and removing an entry there is the only way it goes
 * away. So a copy of it that reaches `content` is unreachable — it renders
 * forever, and a later injection of the same entry mounts *beside* it instead
 * of replacing it.
 *
 * That is exactly what a clip pick used to do. The picker stamps an id and
 * calls `transform`, which serialized the rendered copy — placements included,
 * and captured *before* `onClip` set the clip proxy. The stored document grew
 * an unclipped duplicate of every placement, appended at root level (so painted
 * over the whole drawing), which no `deleteInjectedElement` could reach: the
 * logo looked unclipped, and it survived deleting the placement.
 *
 * Applied on the way in as well as on the way out, so documents already
 * carrying baked-in copies heal on load.
 */
function stripInjectedLayer<T extends Element>(root: T): T {
  root.querySelectorAll(INJECTED_MARKERS).forEach((el) => el.remove());
  return root;
}

// Cheap djb2 digest of an injected fragment's markup. Used to key the defs join
// so a *changed* markup (e.g. a re-cropped logo <symbol>) forces an exit+enter
// re-parse instead of d3's no-op update — the DOM `id` is reapplied on enter, so
// any <use href="#id"> keeps resolving to the freshly parsed element.
//
// Memoized by entry identity: Redux only allocates a new entry object when the
// entry actually changes, so an unchanged entry keeps its cached digest (no
// re-hash of large logo markup on every zoom/drag frame) while a changed entry
// is a fresh object → cache miss → new digest → new key → re-parse.
const _digestCache = new WeakMap<object, string>();
function entryMarkupDigest(entry: { markup?: string }): string {
  const cached = _digestCache.get(entry);
  if (cached !== undefined) return cached;
  const markup = entry.markup ?? "";
  let h = 5381;
  for (let i = 0; i < markup.length; i++) {
    h = ((h << 5) + h) ^ markup.charCodeAt(i);
  }
  const digest = (h >>> 0).toString(36);
  _digestCache.set(entry, digest);
  return digest;
}

interface SVGEditor {
  svgRef: React.RefObject<SVGSVGElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  container: ReturnType<typeof useD3Container>;
  width: number;
  height: number;
  transform(fn: (svg?: SVGSVGElement | null) => SVGSVGElement): void;
}

type PickingElements = Array<{
  element: SVGElement;
  handlers: {
    pointerover: (e: PointerEvent) => void;
    pointerout: (e: PointerEvent) => void;
    pointerdown: (e: PointerEvent) => void;
  };
}>;

export const useSVGEditor = ({
  svgPath,
  instanceName,
  beforeInjection = (svg) => svg,
}: SVGEditorProps): SVGEditor => {
  const {
    hooks: { useResizeObserver },
  } = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");
  const { useAppSelector, useAppDispatch } = storeModule.hooks;

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(wrapperRef);
  const width = dimensions?.width ?? 700;
  const height = dimensions?.height ?? 700;

  const theme = useTheme();

  // Zoom/pan updates fire on every wheel/drag (debounced). The editor only
  // needs to react to content/proxy changes — d3 owns the live transform.
  const svgState = useAppSelector(
    (state) => selectSVGState(svgPath)(state)?.instances[instanceName],
    (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      return (
        a.content === b.content &&
        a.proxies === b.proxies &&
        a.injected === b.injected
      );
    },
  );
  const dispatch = useAppDispatch();

  // The source document, kept **pristine**: `renderPreview` paints onto a copy
  // of it and never on this, which is what keeps one instance's proxies out of
  // another's rendering even though two variations of the same model hold equal
  // content strings (and therefore share this cache entry under `Object.is`).
  // Keyed on the instance as well, so that sharing never becomes load-bearing.
  const parsedSVG = useMemo(() => {
    if (!svgState?.content) return undefined;
    const svgRoot = new DOMParser()
      .parseFromString(svgState.content, "image/svg+xml")
      .querySelector("svg");

    // The art is a nested <svg>, which clips its content to its own viewport by
    // default (UA `overflow:hidden`). Injected elements (logo placements,
    // annotations) dragged past the original art bounds would vanish. Letting
    // the nested viewport overflow keeps them visible at any zoom/pan without
    // having to resize the viewBox per frame.
    if (svgRoot) {
      svgRoot.setAttribute("overflow", "visible");
      svgRoot.style.overflow = "visible";
      // Heal documents saved before `transform` stripped the presentation
      // layer: any injected element baked into `content` is a duplicate of one
      // this render is about to mount from `svgState.injected`.
      stripInjectedLayer(svgRoot);
    }

    return svgRoot;
  }, [svgState?.content, svgPath, instanceName]);

  const {
    state: { tools },
    cancelManipulate,
  } = useContext(EditorToolkitContext);

  // Click on empty canvas exits manipulate mode (deselect). d3 zoom shares the
  // svg, so a pan moves the pointer — we only treat a near-stationary
  // pointerdown→up as a deselect click. Handle interactions stopPropagation on
  // pointerdown, so clicking the selection chrome never reaches here; only bare
  // background/art clicks (outside the selection box) deselect. Skipped while a
  // clip-target pick is active so that pick can consume the click.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !tools.manipulate.enabled || tools.pickElement.enabled) return;
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      downAt = null;
      if (moved > 4) return; // a pan/drag, not a click
      cancelManipulate();
    };
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointerup", onUp);
    return () => {
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointerup", onUp);
    };
  }, [tools.manipulate.enabled, tools.pickElement.enabled, cancelManipulate]);

  const container = useD3Container().width(width).height(height);

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current || !svgState?.content || !parsedSVG) {
      return;
    }
    container.render(null, svgRef.current);
  }, [
    dimensions,
    svgRef.current,
    svgState?.content,
    parsedSVG,
    tools.pickElement.enabled,
    tools.highlightedElements,
    tools.manipulate.enabled,
    tools.manipulate.targetId,
    tools.manipulate.mode,
    tools.manipulate.handles,
    svgState?.proxies,
    svgState?.injected,
  ]);

  const x = scaleLinear()
    .domain([-1, width + 1])
    .range([-1, width + 1]);

  const y = scaleLinear()
    .domain([-1, height + 1])
    .range([-1, height + 1]);

  const xAxis = axisBottom(x)
    .ticks(((width + 2) / (height + 2)) * 10)
    .tickSize(height)
    .tickPadding(8 - height);

  const yAxis = axisRight(y)
    .ticks(10)
    .tickSize(width)
    .tickPadding(8 - width);

  const [zoomTransform, setZoomTransform] = useState(undefined);
  const [pickingElements, setPickingElements] = useState<PickingElements>([]);

  /**
   * The document the last `renderPreview` actually mounted — a copy of
   * `parsedSVG`, carrying this render's injections and proxies. `transform`
   * serializes *this*, not the pristine parse, so a tool that writes into the
   * drawing (the element picker assigning an id) persists what the user sees.
   */
  const renderedSVGRef = useRef<SVGSVGElement | null>(null);

  function renderPreview(
    root: Selection<SVGSVGElement, any, SVGSVGElement, any>,
    selection: Selection<SVGGElement, any, SVGSVGElement, any>,
  ) {
    selection.selectChildren("*").remove();

    const editorContainer = selection
      .data([1])
      .join("g")
      .attr("role", "container");

    if (!parsedSVG) {
      console.error("SVG could not be parsed!");
      return;
    }

    /**
     * Render from a fresh copy of the source document, never from the source
     * itself.
     *
     * Proxies, highlights and injections are a presentation layer written on top
     * of the artwork as attributes. Applying them to a long-lived document makes
     * every pass depend on the ones before it: a proxy that is removed leaves its
     * colour behind, and — with `parsedSVG` memoised on the content string, which
     * two variations of one model share — a second instance inherits the first's
     * paint. Starting from a copy makes each render a pure function of state, so
     * "what is no longer proxied" needs no bookkeeping to undo.
     *
     * `cloneNode` is the cheap half of what this function already does: the
     * preview subtree is wiped and re-appended on every call regardless, and a
     * native deep clone costs far less than the re-parse it replaces.
     */
    const doc = parsedSVG.cloneNode(true) as SVGSVGElement;
    renderedSVGRef.current = doc;

    // Mount injected "container" elements into the copy BEFORE the proxy pass,
    // so the proxy loop can reach them by id and apply their transform/clip.
    // Nothing to clear first — the copy carries no earlier render's injections.
    const containerEntries = Object.values(svgState?.injected ?? {})
      .filter((e) => e.mount === "container")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    containerEntries.forEach((entry) => {
      const imported = parseInjectedFragment(entry.markup, doc.ownerDocument);
      if (!imported) return;
      imported.setAttribute("id", entry.id);
      imported.classList.add("svg-injected-container");
      // With an anchor, mount the element immediately after the anchor (exact-id
      // lookup) so a clipped placement paints just above its clip target; else
      // append at the end of the content (paints on top of the whole drawing).
      const anchorEl = entry.anchor ? doc.getElementById(entry.anchor) : null;
      if (anchorEl?.parentNode) {
        anchorEl.parentNode.insertBefore(imported, anchorEl.nextSibling);
      } else {
        doc.appendChild(imported);
      }
    });

    // attach proxies
    const proxies = Object.entries(svgState?.proxies ?? {});
    proxies.forEach(([id, attributes]) => {
      const elem = doc.getElementById(id);
      if (!elem) return;
      Object.entries(attributes).forEach(([attr, value]) => {
        elem.setAttribute(attr, value as string);
        // An inline `style` declaration would win over the attribute, so drop
        // the property being proxied from it. Only this copy is edited, so the
        // source document keeps its own `style` for the next render.
        const styles = elem.getAttribute("style");
        if (styles) {
          const newStyle = styles
            .split(";")
            .filter((s) => !s.includes(attr))
            .join(";");
          if (newStyle) elem.setAttribute("style", newStyle);
        }
      });
    });

    // highlighted elements
    if (tools.highlightedElements) {
      tools.highlightedElements.forEach((id) => {
        const e = doc.getElementById(id);
        if (e) {
          e.setAttribute("fill", "url(#pick-hatch-pattern)");
        }
      });
    }

    // attach tool listeners
    if (tools.pickElement.enabled && tools.pickElement.type === "SVGElement") {
      // Selectables come from the rendered copy, so the listeners below attach
      // to the very nodes on screen — the source document is not in the DOM.
      let elements = tools.pickElement.getSelectables(doc);
      const pickingElementsTemp: PickingElements = [];
      elements.map((element: SVGElement) => {
        const styles = element.getAttribute("style");
        const noFillorStrokeStyle = styles
          ? styles
              .split(";")
              .filter((s) => !s.includes("fill") && !s.includes("stroke"))
              .join(";")
          : "";
        const styleFillColor = styles
          ?.split(";")
          .find((s) => s.includes("fill"))
          ?.split(":")[1]
          .trim();
        const styleStrokeColor = styles
          ?.split(";")
          .find((s) => s.includes("stroke"))
          ?.split(":")[1]
          .trim();
        const styleStrokeWidth = styles
          ?.split(";")
          .find((s) => s.includes("stroke-width"))
          ?.split(":")[1]
          .trim();

        const currFillColor = element.getAttribute("fill") ?? styleFillColor;
        const currStrokeColor =
          element.getAttribute("stroke") ?? styleStrokeColor;
        const currStrokeWidth =
          element.getAttribute("stroke-width") ?? styleStrokeWidth;

        const handlers = {
          pointerover: (e: PointerEvent) => {
            e.stopPropagation();
            if (currFillColor && currFillColor !== "none") {
              element.setAttribute("style", noFillorStrokeStyle);
              console.log(currFillColor);
              element.setAttribute("fill", "url(#pick-hatch-pattern)");
            }

            if (currStrokeColor && currStrokeColor !== "none") {
              element.setAttribute("style", noFillorStrokeStyle);
              element.setAttribute("stroke", theme.palette.primary.main);
            }
          },
          pointerout: (e: PointerEvent) => {
            e.stopPropagation();
            if (styles) element.setAttribute("style", styles);
            if (currFillColor) {
              element.setAttribute("fill", currFillColor);
            } else {
              element.removeAttribute("fill");
            }

            if (currStrokeColor)
              element.setAttribute("stroke", currStrokeColor);
            else element.removeAttribute("stroke");

            if (currStrokeWidth)
              element.setAttribute("stroke-width", currStrokeWidth);
            else element.removeAttribute("stroke-width");
          },
          pointerdown: (e: PointerEvent) => {
            e.stopPropagation();
            e.preventDefault();

            if (currFillColor) element.setAttribute("fill", currFillColor);
            else element.removeAttribute("fill");

            if (currStrokeColor)
              element.setAttribute("stroke", currStrokeColor);
            else element.removeAttribute("stroke");

            if (currStrokeWidth)
              element.setAttribute("stroke-width", currStrokeWidth);
            else element.removeAttribute("stroke-width");

            let iden = element.getAttribute("id") || randomString(10);
            if (!element.getAttribute("id")) element.setAttribute("id", iden);
            tools.pickElement.callback(element);
            transform(() => doc);
          },
        };

        element.addEventListener("pointerover", handlers.pointerover);
        element.addEventListener("pointerout", handlers.pointerout);
        element.addEventListener("pointerdown", handlers.pointerdown);
        pickingElementsTemp.push({ element, handlers });
      });
      setPickingElements(pickingElementsTemp);
    } else {
      if (pickingElements) {
        // remove listeners
        pickingElements.map(({ element, handlers }) => {
          element.removeEventListener("pointerover", handlers.pointerover);
          element.removeEventListener("pointerout", handlers.pointerout);
          element.removeEventListener("pointerdown", handlers.pointerdown);
        });
      }
    }
    editorContainer.node()?.append(beforeInjection(doc));
  }

  container.content([
    (root) => {
      const defs = select(svgRef.current!)
        .selectAll("#svg-edit-defs")
        .data([1])
        .join("defs")
        .attr("id", "svg-edit-defs");
      const pattern = defs
        .selectAll("#pick-hatch-pattern")
        .data([1])
        .join("pattern")
        .attr("id", "pick-hatch-pattern")
        .attr("width", "5")
        .attr("height", "5")
        .attr("patternTransform", "rotate(45 0 0)")
        .attr("patternUnits", "userSpaceOnUse");
      pattern
        .selectAll("rect")
        .data([1])
        .join("rect")
        .attr("width", "5")
        .attr("height", "5")
        .attr("fill", theme.palette.background.default);

      pattern
        .selectAll("line")
        .data([1])
        .join("line")
        .attr("x1", "0")
        .attr("y1", "0")
        .attr("x2", "0")
        .attr("y2", "10")
        .attr("style", `stroke:${theme.palette.primary.main}; stroke-width:2;`);

      // Injected "defs" entries (logo <symbol>/<image> sources), keyed by id so
      // enter/update/exit semantics keep them in sync without duplicating. Safe
      // against renderPreview's preview-group wipe: this is the defs block.
      const defsEntries = Object.values(svgState?.injected ?? {})
        .filter((e) => e.mount === "defs")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      defs
        .selectAll<SVGGElement, (typeof defsEntries)[number]>(".injected-def")
        // Key by id + markup digest: when an existing def's markup changes the
        // key changes, so the stale element exits and a re-parsed one enters
        // (d3's update branch can't replace already-parsed DOM in place).
        .data(defsEntries, (d: any) => `${d.id}::${entryMarkupDigest(d)}`)
        .join(
          (enter) =>
            enter.append((d) => {
              const parsed = parseInjectedFragment(
                d.markup,
                svgRef.current!.ownerDocument,
              );
              const el = (parsed ??
                svgRef.current!.ownerDocument.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "g",
                )) as unknown as SVGGElement;
              el.setAttribute("id", d.id);
              el.classList.add("injected-def");
              return el;
            }),
          (update) => update,
          (exit) => exit.remove(),
        )
        .order();
    },
    (root, selection, datum) => {
      const preview = selection
        .selectAll("#SVG-editor-preview")
        .data([1])
        .join("g")
        .attr("id", "SVG-editor-preview");
      // @ts-ignore TODO: fix types
      renderPreview(root, preview);
    },
    (root, selection, datum) => {
      const toolsGroup = selection
        .selectAll("#SVG-editor-tools")
        .data([1])
        .join("g")
        .attr("id", "SVG-editor-tools");
      // @ts-ignore d3 selection generic mismatch
      renderManipulationHandles(toolsGroup, {
        svgRoot: svgRef.current,
        targetId: tools.manipulate.enabled
          ? tools.manipulate.targetId
          : undefined,
        mode: tools.manipulate.mode,
        handles: tools.manipulate.handles,
        onTransform: tools.manipulate.onTransform,
        color: theme.palette.secondary.main,
      });
    },
  ]);

  /**
   * Persist a transformation of the drawing.
   *
   * Operates on the **rendered** copy, falling back to the source parse before
   * the first render: a caller that edits the document (the element picker
   * stamping an id on the node it picked) is looking at what is on screen, and
   * serializing the pristine parse instead would drop that edit.
   *
   * The copy carries this render's whole presentation layer, so what gets
   * stored is serialized from a *stripped clone*: injected containers and defs
   * belong to `svgState.injected` and must never round-trip through `content`
   * (see `stripInjectedLayer`). The clone also keeps `fn`'s edit — the picker's
   * stamped id lives on an original art element — while leaving the on-screen
   * copy untouched, since this render still needs it.
   *
   * Still not stripped: proxy attributes and the picker's hatch highlight, which
   * overwrite attributes on the artwork itself rather than adding elements, so
   * there is no marker to remove them by. They remain a standing limitation.
   */
  function transform(fn: (svg?: SVGSVGElement | null) => SVGSVGElement) {
    const target = renderedSVGRef.current ?? parsedSVG;
    const edited = fn(target);
    const clean = stripInjectedLayer(edited.cloneNode(true) as SVGSVGElement);
    const serialized = new XMLSerializer().serializeToString(clean);
    dispatch(updateSVG({ path: svgPath, instanceName, document: serialized }));
  }
  return {
    svgRef,
    wrapperRef,
    width,
    height,
    container,
    transform,
  };
};
