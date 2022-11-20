import { createContext } from "react";
import { IModule } from "../modules/base";

export type ModulesContextType = {
  modules: { [name: string]: IModule };
};

const ModulesContext = createContext<ModulesContextType>({
  modules: {},
});

export default ModulesContext;
