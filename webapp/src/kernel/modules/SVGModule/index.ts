import { Reducer } from "react";
import { AnyAction } from "redux";
import { IModule } from "../base";
import useSVGManager from "./hooks/useSVGManager";
import { parseSVG, storeSVG } from "./store/actions";

import reducer from "./store/slice"
import middleware from './store/middlewares'
import { SVGModuleState } from "./store/state";
import MODULE_NAME from "./constants";

export interface ISVGModule extends IModule{
    store: {
        actions: {
            storeSVG: typeof storeSVG,
            parseSVG: typeof parseSVG,
        },
        middlewares: [
            middleware: typeof middleware,
        ],
        reducers: {
            SVGModule: Reducer<SVGModuleState, AnyAction>;
        }
    }
    hooks: {
        module: {
            useSVGManager: typeof useSVGManager
        }
    }
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const SVGModule: ISVGModule = {
    name: MODULE_NAME,
    components: {},
    store: {
        actions: {
            storeSVG,
            parseSVG,
        },
        middlewares: [middleware],
        reducers: {
            SVGModule: reducer,
        },
    },
    hooks: {module: {useSVGManager}},
    constants: {},
};

export default SVGModule;
