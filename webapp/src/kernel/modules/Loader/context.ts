import { createContext } from "react";
import { IModule } from "@kernel/modules/base";

export type ModulesContextType = {[name: string]: IModule };

const ModulesContext = createContext<ModulesContextType>({});

export default ModulesContext;
