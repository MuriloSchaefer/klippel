import { IModule } from "@kernel/modules/base";
import useSVG from "./hooks/useSVG";
import initialTabs from "./ribbonMenu";

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const ComposerModule: IModule = {
  name: "composer",
  ribbonTabs: initialTabs,
  hooks: [useSVG],
};
export default ComposerModule;
