import { Reducer } from "react";
import { AnyAction } from "redux";
import { IModule } from "../base";
import { parseSVG, storeSVG } from "./store/actions";

import reducer from "./store/slice"
import { SVGModuleState } from "./store/state";

export interface ISVGModule extends IModule{
    store: {
        actions: {
            storeSVG: typeof storeSVG,
            parseSVG: typeof parseSVG,
        },
        middlewares: [],
        reducers: {
            SVGModule: Reducer<SVGModuleState, AnyAction>;
        }
    }
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const SVGModule: ISVGModule = {
    name: "SVGModule",
    components: {},
    store: {
        actions: {
            storeSVG,
            parseSVG,
        },
        middlewares: [],
        reducers: {
            SVGModule: reducer,
        },
    },
    hooks: {},
    constants: {},
};

export default SVGModule;
