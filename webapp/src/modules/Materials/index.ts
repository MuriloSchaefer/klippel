import { IModule } from "@kernel/modules/base";
import { MODULE_NAME } from "./constants";

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
        module: {
        }
    }
}
const MaterialsModule: IMaterialsModule = {
    name: MODULE_NAME,
    components: {},
    store: {
        actions: {
        },
        middlewares: [],
        reducers: {
        },
    },
    hooks: {module: {}},
    constants: {},
};

export default MaterialsModule;