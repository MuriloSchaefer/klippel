import { IModule } from "@kernel/modules/base";
import useModel from "./components/SVGManager";
import initialTabs from "./components/ribbonMenu";
import ComposerViewport from "./components/viewport";

export interface IGraphModule extends IModule {
  hooks: {
    useModel: () => ReturnType<typeof useModel>;
  };
}

/**
 * Composer module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const ComposerModule: IModule = {
  name: "composer",
  components: {
    ribbonTabs: initialTabs,
    viewport: ComposerViewport,
  },
  hooks: { useModel },
};
export default ComposerModule;
