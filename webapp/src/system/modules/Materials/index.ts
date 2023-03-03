import { IModule } from "@kernel/modules/base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";

export interface IMaterialsModule extends IModule {
    store: {
        actions: {
        },
        middlewares: [
        ],
        reducers: {
        }
    }
    hooks: {
    }
}
const module: IMaterialsModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: ['Layout', 'Graph', 'SVG'],
    components: {},
    store: {
        actions: {
        },
        middlewares: [],
        reducers: {
        },
    },
    hooks: {},
    constants: {},
    kernelCalls: {
        startModule: startModule,
        restartModule: ()=>{},
        shutdownModule: ()=>{},
    }
};

export default module;