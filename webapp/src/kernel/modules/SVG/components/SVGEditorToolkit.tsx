import React, { createContext, useEffect, useMemo, useState } from "react";
import { EditorToolkit } from "../interfaces";

export type EditorToolkitType = {
  state: EditorToolkit;
  highlightElement: (id: string) => void;
  unHighlightElement: (id: string) => void;
  pickElement: (
    type: "SVGElement",
    getSelectables: (svgRoot: SVGSVGElement) => SVGElement[],
    callback: (element: SVGElement) => void
  ) => void;
  cancelPickElement: () => void;
};
const INITIAL_VALUE: EditorToolkitType = {
  state: {
    tools: {
      hightlightedElements: [],
      pickElement: {
        type: "SVGElement",
        enabled: false,
        getSelectables: (svgRoot: SVGSVGElement) => [] as SVGElement[],
        callback: (element: SVGElement) => null,
      },
    },
  },
  highlightElement: () => null,
  unHighlightElement: () => null,
  pickElement: () => null,
  cancelPickElement: () => null,
};

export const EditorToolkitContext =
  createContext<EditorToolkitType>(INITIAL_VALUE);

export const Provider = ({
  children,
}: {
  children: React.ReactElement | React.ReactElement[];
}) => {
  const [state, setState] = useState<EditorToolkit>(INITIAL_VALUE.state);
  const values = useMemo<EditorToolkitType>(
    () => ({
      state,
      highlightElement: (id) => {
        if (id && !state.tools.hightlightedElements.includes(id)){
          setState((state) => ({
            ...state,
            tools: {
              ...state.tools,
              hightlightedElements: [...state.tools.hightlightedElements, id],
            },
          }));
          
        }
      },
      unHighlightElement: (id) => {
        setState((state) => ({
          ...state,
          tools: {
            ...state.tools,
            hightlightedElements: state.tools.hightlightedElements.filter(
              (e) => e !== id
            ),
          },
        }));
      },
      cancelPickElement: () => {
        console.log("canceling");
        setState((state) => ({
          ...state,
          tools: {
            ...state.tools,
            pickElement: INITIAL_VALUE.state.tools.pickElement,
          },
        }));
      },
      pickElement: (type, getSelectables, callback) => {
        setState({
          ...state,
          tools: {
            ...state.tools,
            pickElement: {
              type,
              getSelectables,
              enabled: true,
              callback: (selected) => {
                setState((state) => ({
                  ...state,
                  tools: {
                    ...state.tools,
                    pickElement: INITIAL_VALUE.state.tools.pickElement,
                  },
                }));
                callback(selected);
              },
            },
          },
        });
      },
    }),
    [state]
  );

  useEffect(() => {
    return () => {
      setState((state) => ({
        ...state,
        tools: {
          ...state.tools,
          pickElement: INITIAL_VALUE.state.tools.pickElement,
        },
      }));
    };
  }, []);

  return (
    <EditorToolkitContext.Provider value={values}>
      {children}
    </EditorToolkitContext.Provider>
  );
};

export default React.memo(Provider);
