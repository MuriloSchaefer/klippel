import { IModule } from "../base";

export type IServiceWorkerModule = IModule;

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
  hooks: {},
  constants: {},
};

export default ServiceWorkerModule;
