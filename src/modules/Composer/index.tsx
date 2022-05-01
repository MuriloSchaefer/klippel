import { IModule } from "@kernel/modules/base";
import useModel from "./components/SVGManager";
import initialTabs from "./components/RibbonMenu";
import ComposerViewport from "./components/Viewport";
import parseElementsMiddleware from "./store/middlewares/parseElements";

export interface IComposerModule extends IModule {
  hooks: {
    useModel: typeof useModel;
  };
}

/**
 * Composer module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const ComposerModule: IComposerModule = {
  name: "composer",
  components: {
    ribbonTabs: initialTabs,
    viewport: ComposerViewport,
  },
  store: {
    reducers: {},
    middlewares: [parseElementsMiddleware],
  },
  hooks: { useModel },
};
export default ComposerModule;
