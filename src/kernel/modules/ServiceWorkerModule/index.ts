import { IModule } from "../base";
import afterModuleLoad from "./hooks/system/afterModuleLoad";

export interface IServiceWorkerModule extends IModule{
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const ServiceWorkerModule: IServiceWorkerModule = {
  name: "ServiceWorkerModule",
  components: {},
  store: {
    actions: {},
    middlewares: [],
    reducers: {},
  },
  hooks: {
    system: {
      afterModuleLoad: afterModuleLoad
    }
  },
  constants: {},
};

export default ServiceWorkerModule;
