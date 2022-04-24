import { IModule } from "@kernel/modules/base";
import ModulesContext from "@kernel/modules/context";
import { useContext } from "react";

const useModule = <T = IModule>(name: string): T => {
  const { modules } = useContext(ModulesContext);
  const module = modules.get(name);
  if (!module) throw Error(`Module ${name} not found`);
  return module as unknown as T;
};

export default useModule;
