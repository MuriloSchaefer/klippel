import { IModule } from "@kernel/modules/base";
import MaterialSelector from "./components/selectors/Material";
import MaterialTypeSelector from "./components/selectors/MaterialType";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";
import CRUDMaterialTypeCell from "./components/selectors/CRUDMaterialTypeCell";

export interface IMaterialsModule extends IModule {
    components: {
        MaterialTypeSelector: typeof MaterialTypeSelector,
        MaterialSelector: typeof MaterialSelector,
        CRUDMaterialTypeCell: typeof CRUDMaterialTypeCell,
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
const module: IMaterialsModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: ['Layout', 'Graph', 'SVG'],
    components: {
        MaterialTypeSelector,
        MaterialSelector,
        CRUDMaterialTypeCell
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