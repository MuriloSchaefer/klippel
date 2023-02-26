import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { addNode } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { addProxy, SVGLoaded } from "@kernel/modules/SVG/store/actions";
import { SVGState } from "@kernel/modules/SVG/store/state";
import {
  AnyAction,
  createListenerMiddleware,
  PayloadAction,
  ThunkDispatch,
} from "@reduxjs/toolkit";
import { compact, flatten } from "jsonld";
import _, { isEmpty } from "lodash";
import { graph, parse, serialize, jsonParser } from "rdflib";
import Part, { Properties } from "../interfaces";
import { xdom2properties, rdf2jsonld } from "../utils";
import {
  createComposition,
  compositionCreated,
  parseSVG,
  SVGParsed,
  modelExtracted,
  extractModel,
} from "./actions";
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
  effect: async ({ payload }: PayloadAction<SVGState>, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    const compositions = Object.values(compositionsManager.compositions).filter(
      (comp) => comp.svgPath === payload.path
    );
    
    compositions.forEach(comp => {
      if (!payload.content) return;
      
      dispatch(
        extractModel({
          compositionName: comp.name,
          svgContent: payload.content,
        })
      );
    })
  },
});

middlewares.startListening({
  actionCreator: extractModel,
  effect: async (
    { payload }: PayloadAction<{ compositionName: string; svgContent: string }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    const composition =
      compositionsManager.compositions[payload.compositionName];

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
      dispatch(
        addProxy({
          path: composition.svgPath,
          id: part.id,
          styles: {
            fill: "grey",
          },
        })
      );
      if (hasChildren) {
        // const properties = children.filter((c) => c.tagName === "metadata");
        const parts = children.filter(
          (c) => !["metadata", "defs"].includes(c.tagName)
        );

        parts.forEach((innerPart) =>
          parseNode(innerPart, part, {}, graphId, dispatch)
        );
      }
    };

    const parser = new DOMParser();
    const document = parser.parseFromString(
      payload.svgContent,
      "image/svg+xml"
    );

    // tree root
    const [meta] = [...document.querySelectorAll(`#model`)] as [SVGDefsElement];
    const model = await rdf2jsonld(meta);
    dispatch(modelExtracted({compositionName: composition.name, model}))


    dispatch(
      SVGParsed(compositionsManager.compositions[payload.compositionName])
    );
  },
});

export default middlewares;
