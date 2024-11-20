import {
  Selection,
  axisBottom,
  axisRight,
  scaleLinear,
  select,
  zoom,
} from "d3";
import {
  useContext,
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
import { useTheme } from "@mui/material";
import { EditorToolkitContext } from "../components/SVGEditorToolkit";
import { randomString } from "@kernel/utils";


interface SVGEditorProps {
  svgPath: string;
  instanceName: string;
  beforeInjection?:(svgRoot: SVGSVGElement) => SVGSVGElement
}

interface SVGEditor {
  svgRef: React.RefObject<SVGSVGElement>;
  wrapperRef: React.RefObject<HTMLDivElement>;
  transform(fn: (svg?: SVGSVGElement | null) => SVGSVGElement): void;
}

type PickingElements = Array<{element: SVGElement, handlers: {
  pointerover: (e: PointerEvent) => void
  pointerout: (e: PointerEvent) => void
  pointerdown: (e: PointerEvent) => void
}}>

export const useSVGEditor = ({
  svgPath,
  instanceName,
  beforeInjection = (svg) => svg
}: SVGEditorProps): SVGEditor => {
  const {
    hooks: { useResizeObserver },
  } = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");
  const { useAppSelector, useAppDispatch } = storeModule.hooks;

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(wrapperRef);
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;

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

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current || !svgState?.content || !parsedSVG) {
      return;
    }

    select(svgRef.current).datum(null).call(render);
  }, [
    dimensions,
    svgRef.current,
    svgState?.content,
    parsedSVG,
    tools.pickElement.enabled,
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

  const [zoomTransform, setZoomTransform] = useState(undefined)
  const [pickingElements, setPickingElements] = useState<PickingElements>([])

  function render(svg: Selection<SVGSVGElement, undefined, null, undefined>) {
    svg.selectChildren("*").remove();

    const defs = svg.append("defs");

    //add helper for tools
    const pattern = defs
      .append("pattern")
      .attr("id", "pick-hatch-pattern")
      .attr("width", "50")
      .attr("height", "10")
      .attr("patternTransform", "rotate(45 0 0)")
      .attr("patternUnits", "userSpaceOnUse");

    let bg = pattern
      .append("rect")
      .attr("width", "50")
      .attr("height", "10")
      .attr("fill", theme.palette.background.default);

    let path = pattern
      .append("line")
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "0")
      .attr("y2", "10")
      .attr("style", `stroke:${theme.palette.primary.main}; stroke-width:10;`);

    const gridGroup = svg.append("g").attr("role", "grid");
    const editorContainer = svg.append("g").attr("role", "container");


    // Add grid
    const gX = gridGroup
      .append("g")
      .attr("class", "axis axis--x")
      .attr("stroke-opacity", "0.3")
      .attr("stroke-dasharray", "6 1")
      .attr("stroke-width", "0.5px")
      .call(xAxis);
    const gY = gridGroup
      .append("g")
      .attr("class", "axis axis--y")
      .attr("stroke-opacity", "0.3")
      .attr("stroke-dasharray", "6 1")
      .attr("stroke-width", "0.5px")
      .call(yAxis);



    // add zoom 
    // @ts-ignore TODO: fix typing
    const zoomFunc = zoom<Element, undefined>()
      .scaleExtent([-10, 40]) 
      // @ts-ignore TODO: fix typing
      .filter((event) => {
        event.preventDefault();
        return (!event.ctrlKey || event.type === "wheel") && !event.button;
      })
      // @ts-ignore TODO: fix typing
      .on("zoom", ({ transform }, d) => { 
        editorContainer.attr("transform", transform);
        gX.call(xAxis.scale(transform.rescaleX(x)));
        gY.call(yAxis.scale(transform.rescaleY(y)));
        setZoomTransform(transform)
      });
    svg // @ts-ignore TODO: fix typing
      .call(zoomFunc)
    
    if (zoomTransform){
      // @ts-ignore TODO: fix typing
      svg.call(zoomFunc.transform, zoomTransform)
    }


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
      });
    });

    // attach tool listeners
    if (tools.pickElement.enabled && tools.pickElement.type === 'SVGElement'){
      let elements = tools.pickElement.getSelectables(parsedSVG);
      const pickingElementsTemp: PickingElements = []
      elements.map((element: SVGElement) => {
        const currFillColor = element.getAttribute("fill");
        const currStrokeColor = element.getAttribute("stroke");
        const currStrokeWidth = element.getAttribute("stroke-width");

        const handlers = {
          pointerover: (e: PointerEvent) => {
            e.stopPropagation();
            element.setAttribute("fill", "url(#pick-hatch-pattern)");
            element.setAttribute("stroke", theme.palette.primary.main);
            element.setAttribute("stroke-width", "30");
          },
          pointerout: (e: PointerEvent) => {
            e.stopPropagation();
            if (currFillColor) element.setAttribute("fill", currFillColor);
            else element.removeAttribute("fill");
    
            if (currStrokeColor) element.setAttribute("stroke", currStrokeColor);
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
    
            if (currStrokeColor) element.setAttribute("stroke", currStrokeColor);
            else element.removeAttribute("stroke");
    
            if (currStrokeWidth)
              element.setAttribute("stroke-width", currStrokeWidth);
            else element.removeAttribute("stroke-width");
    
    
            let iden = element.getAttribute("id") || randomString(10);
            if (!element.getAttribute("id")) element.setAttribute("id", iden);
            tools.pickElement.callback(element);
            transform(() => parsedSVG);
          },
        }


        element.addEventListener("pointerover", handlers.pointerover);
        element.addEventListener("pointerout", handlers.pointerout);
        element.addEventListener("pointerdown", handlers.pointerdown);
        pickingElementsTemp.push({element, handlers})
      })
      setPickingElements(pickingElementsTemp)
    } else {
      if (pickingElements){
        // remove listeners
        pickingElements.map(({element, handlers}) => {
          element.removeEventListener("pointerover", handlers.pointerover);
          element.removeEventListener("pointerout", handlers.pointerout);
          element.removeEventListener("pointerdown", handlers.pointerdown);
        })
      }
    }
    editorContainer.node()?.append(beforeInjection(parsedSVG));
  }

  function transform(fn: (svg?: SVGSVGElement | null) => SVGSVGElement) {
    const serialized = new XMLSerializer().serializeToString(fn(parsedSVG));
    dispatch(updateSVG({ path: svgPath, instanceName, document: serialized }));
  }
  return {
    svgRef,
    wrapperRef,
    transform,
  };
};
