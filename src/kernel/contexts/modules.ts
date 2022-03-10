import { IModule } from "@kernel/modules/base";
import { createContext } from "react";

export type ModulesContextType = {
  loadedModules: Array<IModule>;
};

const ModulesContext = createContext<ModulesContextType>({
  loadedModules: [],
});

export default ModulesContext;
