import { IModule } from "../base";

export type IMouseManagerModule = IModule;

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const MouseManagerModule: IMouseManagerModule = {
  name: "MouseManager",
  components: {},
  store: {
    actions: {},
    middlewares: [],
    reducers: {},
  },
  hooks: {},
  constants: {},
};

export default MouseManagerModule;
