import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { destroyGraph } from "@kernel/modules/Graphs/store/graphsManager/actions";
import { closeViewport } from "@kernel/modules/Layout/store/viewports/actions";
import { SVGLoaded, addProxy } from "@kernel/modules/SVG/store/actions";
import { SVGState } from "@kernel/modules/SVG/store/state";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { CSSProperties } from "react";
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
    dispatch(modelFetched({ compositionName: composition.name, model: JSON.parse(model) }));
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
    } = getState() as { Composer: ComposerState };

    const composition =
      compositionsManager.compositions[payload.compositionName];

    // add all proxies
    const nodes = payload.model.nodes;
    Object.values(nodes).forEach((node: any) => {
      if (!("proxies" in node)) return;
      const proxies: { [id: string]: CSSProperties } = node.proxies.reduce(
        (
          acc: { [id: string]: CSSProperties },
          curr: { elem: string; attr: string }
        ) => ({ ...acc, [curr.elem]: {...acc[curr.elem], [curr.attr]: 'grey'} }),
        {}
      );

      Object.entries(proxies).forEach(([id, styles]) => {
        dispatch(addProxy({path: composition.svgPath, instanceName: composition.name, id, styles}))
      })
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

export default middlewares;
