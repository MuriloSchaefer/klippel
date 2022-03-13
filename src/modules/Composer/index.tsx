import { IModule } from "@kernel/modules/base";
import useModel from "./hooks/useModel";
import initialTabs from "./ribbonMenu";

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const ComposerModule: IModule = {
  name: "composer",
  ribbonTabs: initialTabs,
  hooks: [useModel],
};
export default ComposerModule;
