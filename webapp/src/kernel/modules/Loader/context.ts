import { createContext } from "react";
import { IModule } from "@kernel/modules/base";

export type ModulesContextType = {[name: string]: IModule };

const ModulesContext = createContext<{modules: ModulesContextType, setModules: (modules: ModulesContextType)=>void}>({
    modules: {},
    setModules: () => null
});

export default ModulesContext;
