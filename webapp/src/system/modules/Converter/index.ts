import { IModule } from "@kernel/modules/base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";
import ScaleSlider from "./components/ScaleSlider";
import UnitSelector from "./components/UnitSelector";
import CompoundSelector from "./components/CompoundSelector";
import { useScales } from "./hooks/useScales";
import CompoundUnit from './components/CompondUnit';

export interface IConverterModule extends IModule {
    components: {
        ScaleSlider: typeof ScaleSlider;
        CompoundSelector: typeof CompoundSelector;
        UnitSelector: typeof UnitSelector;
        CompoundUnit: typeof CompoundUnit;
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
        useScales: typeof useScales
    }
}
const module: IConverterModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: ['Graph'],
    components: {
        ScaleSlider,
        CompoundSelector,
        UnitSelector,
        CompoundUnit
    },
    store: {
        actions: {
        },
        middlewares: [],
        reducers: {
        },
    },
    hooks: {useScales},
    constants: {},
    kernelCalls: {
        startModule: startModule,
        restartModule: ()=>{},
        shutdownModule: ()=>{},
    }
};

export default module;