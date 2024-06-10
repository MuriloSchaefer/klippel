import { IModule } from "@kernel/modules/base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";
import ScaleSlider from "./components/ScaleSlider";
import UnitAmountSelector from "./components/UnitAmountSelector";
import CompoundSelector from "./components/CompoundSelector";
import { useScales } from "./hooks/useScales";
import useUnits from "./hooks/useUnits";
import CompoundUnit from './components/CompondUnit';
import CoverterGraphViewport from "./components/Builder/ConverterGraphViewport";
import useConverter from "./hooks/useConverter";

export interface IConverterModule extends IModule {
    components: {
        CoverterGraphViewport: typeof CoverterGraphViewport;
        ScaleSlider: typeof ScaleSlider;
        CompoundSelector: typeof CompoundSelector;
        UnitAmountSelector: typeof UnitAmountSelector;
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
        useScales: typeof useScales,
        useUnits: typeof useUnits,
        useConverter: typeof useConverter
    }
}
const module: IConverterModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: ['Graph'],
    components: {
        CoverterGraphViewport,
        ScaleSlider,
        CompoundSelector,
        UnitAmountSelector,
        CompoundUnit
    },
    store: {
        actions: {
        },
        middlewares: [],
        reducers: {
        },
    },
    hooks: {useScales,useUnits, useConverter},
    constants: {},
    kernelCalls: {
        startModule: startModule,
        restartModule: ()=>{},
        shutdownModule: ()=>{},
    }
};

export default module;