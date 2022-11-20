import React, {
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppDispatch } from "@kernel/store/hooks";
import useSVG from "../../hooks/useSVG";
import { ReactSVG } from "react-svg";

import { ProxiesProps } from "./proxies";

interface Proxy {
  attributes: {
    [name: string]: any;
  };
  callbacks: {
    [evtName: string]: (event: Event) => void;
  };
}

interface SVGProxyProps {
  svgRoot?: SVGElement;
  elemId: string;
  proxy: Proxy;
}

const SVGProxy = ({ elemId, proxy }: SVGProxyProps) => {
  return <></>;
};

interface SVGLoaderProps {
  svgXML: string;
  onSVGReady: (root: SVGElement) => void;
  children: ReactElement<ProxiesProps>;
  proxies?: {
    [elemId: string]: Proxy;
  };
}
const SVGLoader = ({
  svgXML,
  onSVGReady,
  proxies,
  children,
}: SVGLoaderProps): ReactElement => {
  const objURL = useMemo(
    () =>
      window.URL.createObjectURL(new Blob([svgXML], { type: "image/svg+xml" })),
    [svgXML]
  );

  const handleAfterInjection = (
    err: Error | null,
    svg: SVGElement | undefined
  ) => {
    if (err) {
      console.error(err);
      return;
    }

    onSVGReady && svg && onSVGReady(svg);
  };
  const handleBeforeInjection = (svg: SVGElement | undefined) => {
    if (proxies && svg) {
      console.log("adding proxies");
      Object.entries(proxies).forEach(([id, { attributes, callbacks }]) => {
        const [element] = [...svg?.querySelectorAll(`#${id}`)];
        Object.entries(attributes).forEach(([attr, value]) => {
          element.setAttribute(attr, value);
        });

        Object.entries(callbacks).forEach(([event, cb]) => {
          console.log("adding", event, cb);
          element.addEventListener(event, cb);
        });
      });
    }
  };

  return (
    <>
      <ReactSVG
        src={objURL}
        beforeInjection={handleBeforeInjection}
        afterInjection={handleAfterInjection}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      />
      {children}
    </>
  );
};

/** Hook that loads an SVG model */
interface UseModelProps {
  mannequinSize: string;
  product: string;
  model: string;
  graphId: string;
  children: ReactElement;
  proxies: {[id: string]: Proxy}
}
const SVGManager = ({
  graphId,
  mannequinSize,
  product,
  model,
  children,
  proxies
}: UseModelProps): ReactElement => {
  const dispatch = useAppDispatch();
  const [svgXML, setSvgXML] = useState<string | undefined>(undefined);
  const [SVGRef, setSVGRef] = useState<SVGElement | undefined>(undefined);
  const SVGManager = useSVG();

  useEffect(() => {
    const loadSVG = async () => {
      //dispatch(startSVGLoad({ product, model }));
      const svgText = await SVGManager.loadSVG(
        `/catalog/${product}/${model}.svg`
      );
      setSvgXML(svgText);
    };
    loadSVG();
  }, [mannequinSize, product, model]);

  return svgXML ? (
    <SVGLoader
      svgXML={svgXML}
      onSVGReady={(svgRoot: SVGElement) => {
        //dispatch(SVGLoaded({ graphId, svgRoot }));
        if (!SVGRef) setSVGRef(svgRoot);
      }}
      proxies={proxies}
    >
      {children && React.cloneElement(children, { svgRoot: SVGRef })}
    </SVGLoader>
  ) : (
    <div>Loading...</div>
  );
};

export default SVGManager;
