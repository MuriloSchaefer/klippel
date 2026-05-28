import { IModule } from "@kernel/modules/base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";
import ScaleSlider from "./components/ScaleSlider";
import UnitAmountSelector from "./components/UnitAmountSelector";
import UnitSelector from "./components/UnitSelector";
import CompoundSelector from "./components/CompoundSelector";
import { useScales } from "./hooks/useScales";
import useUnits from "./hooks/useUnits";
import CompoundUnit from './components/CompondUnit';
import CoverterGraphViewport from "./components/Builder/ConverterGraphViewport";
import useConverter from "./hooks/useConverter";
import { convert } from "./utils/convert";
import { pickDisplayUnit } from "./utils/pickDisplayUnit";
import { formatScaledResult } from "./utils/formatScaledResult";

export interface IConverterModule extends IModule {
    components: {
        CoverterGraphViewport: typeof CoverterGraphViewport;
        ScaleSlider: typeof ScaleSlider;
        CompoundSelector: typeof CompoundSelector;
        UnitAmountSelector: typeof UnitAmountSelector;
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
        useScales: typeof useScales,
        useUnits: typeof useUnits,
        useConverter: typeof useConverter
    },
    utils: {
        convert: typeof convert;
        pickDisplayUnit: typeof pickDisplayUnit;
        formatScaledResult: typeof formatScaledResult;
    },
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
    hooks: {useScales, useUnits, useConverter},
    utils: { convert, pickDisplayUnit, formatScaledResult },
    constants: {},
    kernelCalls: {
        startModule: startModule,
        restartModule: ()=>{},
        shutdownModule: ()=>{},
    },
};

export default module;