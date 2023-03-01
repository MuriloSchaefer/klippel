import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { addProxy, SVGLoaded } from "@kernel/modules/SVG/store/actions";
import { SVGState } from "@kernel/modules/SVG/store/state";
import {
  createListenerMiddleware,
  PayloadAction,
} from "@reduxjs/toolkit";
import { SELF } from "../constants";
import { rdfxml2interpreter, interpreter2jsonld } from "../utils";
import {
  createComposition,
  compositionCreated,
  parseSVG,
  SVGParsed,
  modelFetched,
  fetchModel,
  storeModel,
  modelStored,
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

    if (!payload.content) return;
    
    const parser = new DOMParser();
    const document = parser.parseFromString(
      payload.content,
      "image/svg+xml"
    );

    const modelPath = document.getElementsByTagName('modelPath').item(0)?.innerHTML
    if (!modelPath) return
    
    compositions.forEach(comp => {
      
      dispatch(
        fetchModel({
          compositionName: comp.name,
          modelPath,
        })
      );
    })
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
    dispatch(modelFetched({compositionName: composition.name, model}))


    
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

    // add all proxies
    // const proxiedElements = interpreter.statementsMatching(undefined, SELF('ProxyElement'), undefined)
    // proxiedElements.forEach((proxiedElements: any) => {
    //   // console.log(proxiedElements.subject.value)
    //   const elem = proxiedElements.object.value
    //   const node = proxiedElements.subject.value.replace('_:#', '')
    //   const proxiedAttributes = interpreter.statementsMatching(SELF(node), SELF('ProxyAttribute'), undefined)
      
    //   const styles = proxiedAttributes.reduce((acc, curr)=> ({...acc, [curr.object.value]: 'grey'}), {})

    //   const proxy = {path: composition.svgPath, id: elem.replace('#', ''), styles }
    //   dispatch(addProxy(proxy))
    // })

    dispatch(
      storeModel({compositionName: composition.name, model: payload.model})
    );
  }
})

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

    // add all proxies
    // const proxiedElements = interpreter.statementsMatching(undefined, SELF('ProxyElement'), undefined)
    // proxiedElements.forEach((proxiedElements: any) => {
    //   // console.log(proxiedElements.subject.value)
    //   const elem = proxiedElements.object.value
    //   const node = proxiedElements.subject.value.replace('_:#', '')
    //   const proxiedAttributes = interpreter.statementsMatching(SELF(node), SELF('ProxyAttribute'), undefined)
      
    //   const styles = proxiedAttributes.reduce((acc, curr)=> ({...acc, [curr.object.value]: 'grey'}), {})

    //   const proxy = {path: composition.svgPath, id: elem.replace('#', ''), styles }
    //   dispatch(addProxy(proxy))
    // })
    const graph = JSON.parse(payload.model)
    dispatch(
      loadGraph({graphId: composition.graphId, graph})
    )
    // dispatch(
    //   addProxies({graphId: composition.graphId, graph})
    // )

    dispatch(
      modelStored({compositionName: composition.name, model: payload.model})
    );
  }
})

export default middlewares;
