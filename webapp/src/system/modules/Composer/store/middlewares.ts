import type { CSSProperties } from "react";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";

import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { destroyGraph } from "@kernel/modules/Graphs/store/graphsManager/actions";
import {
  closeViewport,
  removeFromGroup,
} from "@kernel/modules/Layout/store/viewports/actions";
import { SVGLoaded, addProxy } from "@kernel/modules/SVG/store/actions";
import type { SVGState } from "@kernel/modules/SVG/store/state";


import {
  createComposition,
  compositionCreated,
  modelFetched,
  fetchModel,
  storeModel,
  modelStored,
  closeComposition,
  compositionClosed,
  loadProxies,
  proxiesLoaded,
  listCompositions,
  compositionsListed,
  storeCompositionsList,
  compositionsListStored,
} from "./actions";
import type { ComposerState, CompositionsList } from "./state";
import { debugViewportOpened, openDebugView, selectPart } from "./composition/actions";
import { MaterialsState } from '../../Materials/store/materials/state';

const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: listCompositions,
  effect: async (
    { payload },
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    //fetch list
    const compositions: CompositionsList = [
      {name: 'Camisa polo feminina', svgPath: 'catalog/camisa-polo/decorated.svg', descriptionPath:'catalog/camisa-polo/description.md'},
    ]

    dispatch(storeCompositionsList(compositions))

    dispatch(
      compositionsListed(compositions)
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: storeCompositionsList,
  effect: async (
    { payload },
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    dispatch(
      compositionsListStored(payload)
    ); // dispatch event
  },
});

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
    dispatch(selectPart({ compositionName: payload.name, partName: 'garment' }));

    dispatch(
      compositionCreated(compositionsManager.compositions[payload.name])
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: closeViewport,
  effect: async ({ payload }: PayloadAction<{ name: string }>, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    // check if viewport is associated with some composition
    Object.values(compositionsManager.compositions).forEach((comp) => {
      if (comp.viewportName === payload.name) {
        dispatch(closeComposition({ name: comp.name, graphId: comp.graphId })); // dispatch event
      }
      if (comp.debugViewport === payload.name) {
        dispatch(removeFromGroup({ viewportName: comp.name }));
      }
    });
  },
});
middlewares.startListening({
  actionCreator: closeComposition,
  effect: async (
    { payload }: PayloadAction<{ name: string; graphId: string }>,
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    dispatch(destroyGraph({ graphId: payload.graphId }));

    dispatch(compositionClosed({ name: payload.name })); // dispatch event
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

    if (!payload.content) return;

    const parser = new DOMParser();
    const document = parser.parseFromString(payload.content, "image/svg+xml");

    const modelPath = document
      .getElementsByTagName("modelPath")
      .item(0)?.innerHTML;
    if (!modelPath) return;

    compositions.forEach((comp) => {
      if (comp.loading.loadModel !== "not-started") return
      dispatch(
        fetchModel({
          compositionName: comp.name,
          modelPath,
        })
      );
    });
  },
});

middlewares.startListening({
  actionCreator: fetchModel,
  effect: async (
    { payload }: PayloadAction<{ compositionName: string; modelPath: string }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    const composition =
      compositionsManager.compositions[payload.compositionName];

    const response = await fetch(payload.modelPath);
    const model = await (await response.blob()).text();

    // tree root
    dispatch(
      modelFetched({
        compositionName: composition.name,
        model: JSON.parse(model),
      })
    );
  },
});

middlewares.startListening({
  actionCreator: modelFetched,
  effect: async (
    { payload }: PayloadAction<{ compositionName: string; model: any }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    const composition =
      compositionsManager.compositions[payload.compositionName];

    dispatch(
      loadProxies({ compositionName: composition.name, model: payload.model })
    );

    dispatch(
      storeModel({ compositionName: composition.name, model: payload.model })
    );
  },
});

middlewares.startListening({
  actionCreator: loadProxies,
  effect: async (
    { payload }: PayloadAction<{ compositionName: string; model: any }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager }, 
      Materials: {materials}
    } = getState() as { Composer: ComposerState, Materials: {materials: MaterialsState} };

    const composition =
      compositionsManager.compositions[payload.compositionName];

    // add all proxies
    const nodes = payload.model.nodes;
    Object.values(nodes).forEach((node: any) => {
      if (!("proxies" in node)) return;
      const materialNode = nodes[node.materialId]
      if (!materialNode) {
        console.warn(`Missing material node ${node.materialId}! parsing material id`)
      }
      const materialId = materialNode?.materialId ?? node.materialId.split('-')[1]
      const material = materials[materialId]
      const proxies: { [id: string]: CSSProperties } = node.proxies.reduce(
        (
          acc: { [id: string]: CSSProperties },
          curr: { elem: string; attr: string }
        ) => ({
          ...acc,
          [curr.elem]: { ...acc[curr.elem], [curr.attr]: material.attributes['cor'].hex },
        }),
        {}
      );

      Object.entries(proxies).forEach(([id, styles]) => {
        dispatch(
          addProxy({
            path: composition.svgPath,
            instanceName: composition.name,
            id,
            styles,
          })
        );
      });
    });

    dispatch(
      proxiesLoaded({ compositionName: composition.name, model: payload.model })
    );
  },
});

middlewares.startListening({
  actionCreator: storeModel,
  effect: async (
    { payload }: PayloadAction<{ compositionName: string; model: any }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    const composition =
      compositionsManager.compositions[payload.compositionName];

    dispatch(loadGraph({ graphId: composition.graphId, graph: payload.model }));
    dispatch(
      modelStored({ compositionName: composition.name, model: payload.model })
    );
  },
});

middlewares.startListening({
  actionCreator: openDebugView,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
    } = getState() as { Composer: ComposerState };

    const composition =
      compositionsManager.compositions[payload.compositionName];

    dispatch(
      debugViewportOpened({
        compositionName: payload.compositionName,
        viewportName: payload.debugViewport,
      })
    );
  },
});

export default middlewares;
