import { IModule } from "@kernel/modules/base";
import ModulesContext from "../context";
import { useContext } from "react";


const useModule = <T extends IModule = IModule>(name: string): T => {
  const {modules} = useContext(ModulesContext);
  console.log(modules)
  const module = modules[name];
  if (!module) throw Error(`Module ${name} not found`);
  return module as unknown as T;
};

export default useModule;
