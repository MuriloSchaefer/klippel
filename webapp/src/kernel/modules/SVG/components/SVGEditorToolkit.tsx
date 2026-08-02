import React, { createContext, useEffect, useMemo, useState } from "react";
import {
  EditorToolkit,
  ManipulateHandle,
  ManipulateMode,
  ManipulateTransform,
} from "../interfaces";

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
  // svgtoolbox helpers (spatial editing of an injected element)
  selectManipulable: (
    id: string,
    handlers?: {
      onTransform?: (id: string, t: ManipulateTransform) => void;
      onClip?: (id: string, clipTargetId: string) => void;
      getSelectables?: (svgRoot: SVGSVGElement) => SVGElement[];
      handles?: ManipulateHandle[];
    }
  ) => void;
  setManipulateMode: (mode: ManipulateMode) => void;
  cancelManipulate: () => void;
};

const noopTransform = (_id: string, _t: ManipulateTransform) => null;
const noopClip = (_id: string, _clipTargetId: string) => null;

const INITIAL_VALUE: EditorToolkitType = {
  state: {
    tools: {
      highlightedElements: [],
      pickElement: {
        type: "SVGElement",
        enabled: false,
        getSelectables: (svgRoot: SVGSVGElement) => [] as SVGElement[],
        callback: (element: SVGElement) => null,
      },
      manipulate: {
        enabled: false,
        targetId: undefined,
        mode: "idle",
        handles: undefined,
        onTransform: noopTransform,
        onClip: noopClip,
      },
    },
  },
  highlightElement: () => null,
  unHighlightElement: () => null,
  pickElement: () => null,
  cancelPickElement: () => null,
  selectManipulable: () => null,
  setManipulateMode: () => null,
  cancelManipulate: () => null,
};

export const EditorToolkitContext =
  createContext<EditorToolkitType>(INITIAL_VALUE);

export const Provider = ({
  children,
}: {
  children: React.ReactElement | React.ReactElement[];
}) => {
  const [state, setState] = useState<EditorToolkit>(INITIAL_VALUE.state);

  // Default selectables for clip-mode picks: any element carrying an id.
  const [clipSelectables, setClipSelectables] = useState<
    ((svgRoot: SVGSVGElement) => SVGElement[]) | undefined
  >(undefined);

  const values = useMemo<EditorToolkitType>(
    () => ({
      state,
      highlightElement: (id) => {
        if (id && !state.tools.highlightedElements.includes(id)) {
          setState((state) => ({
            ...state,
            tools: {
              ...state.tools,
              highlightedElements: [...state.tools.highlightedElements, id],
            },
          }));
        }
      },
      unHighlightElement: (id) => {
        setState((state) => ({
          ...state,
          tools: {
            ...state.tools,
            highlightedElements: state.tools.highlightedElements.filter(
              (e) => e !== id
            ),
          },
        }));
      },
      cancelPickElement: () => {
        setState((state) => ({
          ...state,
          tools: {
            ...state.tools,
            pickElement: INITIAL_VALUE.state.tools.pickElement,
          },
        }));
      },
      pickElement: (type, getSelectables, callback) => {
        setState((state) => ({
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
        }));
      },
      selectManipulable: (id, handlers) => {
        if (handlers?.getSelectables)
          setClipSelectables(() => handlers.getSelectables);
        setState((state) => ({
          ...state,
          tools: {
            ...state.tools,
            manipulate: {
              ...state.tools.manipulate,
              enabled: true,
              targetId: id,
              mode: "idle",
              handles: handlers?.handles,
              onTransform: handlers?.onTransform ?? state.tools.manipulate.onTransform,
              onClip: handlers?.onClip ?? state.tools.manipulate.onClip,
            },
          },
        }));
      },
      setManipulateMode: (mode) => {
        const targetId = state.tools.manipulate.targetId;
        // Clip mode delegates to the existing pickElement flow: pick the target
        // element, then hand it to the host's onClip and drop back to idle.
        if (mode === "clip" && targetId) {
          const onClip = state.tools.manipulate.onClip;
          const getSelectables =
            clipSelectables ??
            ((svgRoot: SVGSVGElement) =>
              Array.from(svgRoot.querySelectorAll<SVGElement>("[id]")).filter(
                (el) => el.id !== targetId
              ));
          setState((state) => ({
            ...state,
            tools: {
              ...state.tools,
              manipulate: { ...state.tools.manipulate, mode: "clip" },
              pickElement: {
                type: "SVGElement",
                enabled: true,
                getSelectables,
                callback: (selected) => {
                  setState((s) => ({
                    ...s,
                    tools: {
                      ...s.tools,
                      pickElement: INITIAL_VALUE.state.tools.pickElement,
                      manipulate: { ...s.tools.manipulate, mode: "idle" },
                    },
                  }));
                  if (selected.id) onClip(targetId, selected.id);
                },
              },
            },
          }));
          return;
        }
        setState((state) => ({
          ...state,
          tools: {
            ...state.tools,
            manipulate: { ...state.tools.manipulate, mode },
          },
        }));
      },
      cancelManipulate: () => {
        setState((state) => ({
          ...state,
          tools: {
            ...state.tools,
            manipulate: INITIAL_VALUE.state.tools.manipulate,
            pickElement: INITIAL_VALUE.state.tools.pickElement,
          },
        }));
      },
    }),
    [state, clipSelectables]
  );

  useEffect(() => {
    return () => {
      setState((state) => ({
        ...state,
        tools: {
          ...state.tools,
          pickElement: INITIAL_VALUE.state.tools.pickElement,
          manipulate: INITIAL_VALUE.state.tools.manipulate,
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
