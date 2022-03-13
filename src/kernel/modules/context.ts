import { createContext } from "react";
import { IModule } from "./base";

export type ModulesContextType = {
  modules: Map<string, IModule>;
};

const ModulesContext = createContext<ModulesContextType>({
  modules: new Map(),
});

export default ModulesContext;
