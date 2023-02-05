import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { addNode } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { SVGLoaded } from "@kernel/modules/SVG/store/actions";
import { SVGState } from "@kernel/modules/SVG/store/state";
import { AnyAction, createListenerMiddleware, PayloadAction, ThunkDispatch } from "@reduxjs/toolkit";
import _, { isEmpty } from "lodash";
import Part, { Properties } from "../interfaces";
import { xdom2properties } from "../utils";
import { createComposition, compositionCreated, parseSVG, SVGParsed } from "./actions";
import { ComposerState } from "./state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: createComposition,
  effect: async (
    { payload }: PayloadAction<{ name: string; svgPath: string }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    dispatch(
      compositionCreated(compositionsManager.compositions[payload.name])
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: SVGLoaded,
  effect: async (
    { payload }: PayloadAction<SVGState>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    const composition = Object.values(compositionsManager.compositions).find(comp => comp.svgPath === payload.path)
    if (!composition || !payload.content) return

    dispatch(
      parseSVG({compositionName: composition.name, svgContent: payload.content})
    );
  },
});

middlewares.startListening({
  actionCreator: parseSVG,
  effect: async (
    { payload }: PayloadAction<{compositionName: string, svgContent: string}>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };
    
    const composition = compositionsManager.compositions[payload.compositionName]

    // Parser logic here
    const parseNode = (
      node: Element,
      parent: Node,
      baseProperties: Properties,
      graphId: string,
      dispatch: ThunkDispatch<unknown, unknown, AnyAction>
    ): void => {
      if (isEmpty(node.id)) {
        node.setAttribute("id", _.uniqueId("random_"));
      }
      // group element, recurse
      const children = Array.from(node.children);
      const hasChildren = !isEmpty(children);
    
      // vector object, add material to graph
      const part: Part = {
        id: node.id,
        type: "Part",
        properties: { ...baseProperties, ...xdom2properties(node) },
        inputs: {
          [parent.id]: {
            id: `${parent.id}-${node.id}`,
            sourceId: parent.id,
            targetId: node.id,
          } as Edge,
        },
        outputs: {},
      };
      dispatch(addNode({ graphId, node: part }));
      if (hasChildren) {
        // const properties = children.filter((c) => c.tagName === "metadata");
        const parts = children.filter((c) => !["metadata", "defs"].includes(c.tagName));
    
        parts.forEach((innerPart) =>
          parseNode(innerPart, part, {}, graphId, dispatch)
        );
      }
    };


    const parser = new DOMParser()
    const document = parser.parseFromString(payload.svgContent, 'image/svg+xml')
    console.log(document)

    // tree root
    const [garment] = [...document.querySelectorAll(`#peca`)] as [SVGElement]
    const root: Part = {
      id: `root`,
      type: 'Part',
      properties: {
        ...xdom2properties(garment),
      },
      inputs: {},
      outputs: {},
    };
    dispatch(addNode({ graphId: composition.graphId, node: root }));

    const children = Array.from<any>(garment.children);
    const garmentParts = children.filter((c) => !["metadata", "defs"].includes(c.tagName));
    garmentParts.forEach((part) =>
      parseNode(
        part,
        root,
        {},
        composition.graphId,
        dispatch
      )
    );

    dispatch(
      SVGParsed(compositionsManager.compositions[payload.compositionName])
    );
  },
});


export default middlewares;
