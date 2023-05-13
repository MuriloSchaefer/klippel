import { IModule } from "@kernel/modules/base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";

export interface IConverterModule extends IModule {
    components: {
    },
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
const module: IConverterModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: ['Graph'],
    components: {
    },
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