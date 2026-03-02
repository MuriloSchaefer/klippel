import { Selection, axisBottom, axisRight, scaleLinear, select } from "d3";
import { useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { selectSVGState } from "../store/selectors";
import { updateSVG } from "../store/actions";
import { useTheme } from "@mui/material/styles";
import { EditorToolkitContext } from "../components/SVGEditorToolkit";
import { randomString } from "@kernel/utils";
import useD3Container from "./useD3Container";

interface SVGEditorProps {
  svgPath: string;
  instanceName: string;
  beforeInjection?: (svgRoot: SVGSVGElement) => SVGSVGElement;
}

interface SVGEditor {
  svgRef: React.RefObject<SVGSVGElement>;
  wrapperRef: React.RefObject<HTMLDivElement>;
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

  const svgState = useAppSelector(selectSVGState(svgPath))?.instances[
    instanceName
  ];
  const dispatch = useAppDispatch();

  const parsedSVG = useMemo(() => {
    if (!svgState?.content) return undefined;
    const svgRoot = new DOMParser()
      .parseFromString(svgState.content, "image/svg+xml")
      .querySelector("svg");

    return svgRoot;
  }, [svgState?.content]);

  const {
    state: { tools },
  } = useContext(EditorToolkitContext);

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
    tools.hightlightedElements,
    svgState?.proxies,
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

    // attach proxies
    const proxies = Object.entries(svgState?.proxies ?? {});
    proxies.forEach(([id, attributes]) => {
      const elem = parsedSVG.querySelector(`#${id}`);
      Object.entries(attributes).forEach(([attr, value]) => {
        elem?.setAttribute(attr, value as string);
        const styles = elem?.getAttribute("style")
        if (styles){
          const newStyle = styles.split(";").filter((s) => !s.includes(attr)).join(";");
          if (newStyle) elem?.setAttribute("style", newStyle);
        }
      });
    });

    // hightlighted elements
    if (tools.hightlightedElements) {
      tools.hightlightedElements.forEach((id) => {
        const e = parsedSVG.getElementById(id);
        if (e) {
          e.setAttribute("fill", "url(#pick-hatch-pattern)");
        }
      });
    }

    // attach tool listeners
    if (tools.pickElement.enabled && tools.pickElement.type === "SVGElement") {
      let elements = tools.pickElement.getSelectables(parsedSVG);
      const pickingElementsTemp: PickingElements = [];
      elements.map((element: SVGElement) => {
        const styles = element.getAttribute("style")
        const noFillorStrokeStyle =   styles ? styles.split(";").filter((s) => !s.includes('fill') && !s.includes('stroke')).join(";") : '';
        const styleFillColor = styles?.split(";").find((s) => s.includes("fill"))?.split(":")[1].trim();
        const styleStrokeColor = styles?.split(";").find((s) => s.includes("stroke"))?.split(":")[1].trim();
        const styleStrokeWidth = styles?.split(";").find((s) => s.includes("stroke-width"))?.split(":")[1].trim();


        const currFillColor = element.getAttribute("fill") ?? styleFillColor;
        const currStrokeColor = element.getAttribute("stroke") ?? styleStrokeColor;
        const currStrokeWidth = element.getAttribute("stroke-width") ?? styleStrokeWidth;

        const handlers = {
          pointerover: (e: PointerEvent) => {
            e.stopPropagation();
            if (currFillColor && currFillColor !== "none"){
              element.setAttribute("style", noFillorStrokeStyle);
              console.log(currFillColor)
              element.setAttribute("fill", "url(#pick-hatch-pattern)");
            }

            if (currStrokeColor && currStrokeColor !== "none"){
              element.setAttribute("style", noFillorStrokeStyle);
              element.setAttribute("stroke", theme.palette.primary.main);
            }
          },
          pointerout: (e: PointerEvent) => {
            e.stopPropagation();
            if (styles) element.setAttribute("style", styles);
            if (currFillColor ) {
              element.setAttribute("fill", currFillColor)}
            else {
              element.removeAttribute("fill")}

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
            transform(() => parsedSVG);
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
    editorContainer.node()?.append(beforeInjection(parsedSVG));
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
      selection
        .selectAll("#SVG-editor-tools")
        .data([1])
        .join("g")
        .attr("id", "SVG-editor-tools");
    },
  ]);

  function transform(fn: (svg?: SVGSVGElement | null) => SVGSVGElement) {
    const serialized = new XMLSerializer().serializeToString(fn(parsedSVG));
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
