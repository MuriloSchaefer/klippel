import { IModule } from "@kernel/modules/base";
import useModel from "./components/SVGManager";
import initialTabs from "./components/RibbonMenu";
import ComposerViewport from "./components/Viewport";
import { MODULE_NAME } from "./constants";

import parseMannequin from "./store/middlewares/parseMannequin";
import parseElements from "./store/middlewares/parseParts";

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
  name: MODULE_NAME,
  components: {
    ribbonTabs: initialTabs,
    viewport: ComposerViewport,
  },
  store: {
    reducers: {},
    middlewares: [parseElements, parseMannequin],
  },
  hooks: { useModel },
};
export default ComposerModule;
