import { IModule } from "../base";
import MarkdownReader from "./components/MarkdownReader";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useMarkdown from "./hooks/useMarkdown";
import { startModule } from "./kernelCalls";

export type IMarkdownModule = IModule & {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
    MarkdownReader: typeof MarkdownReader
  },
  hooks: {
    useMarkdown: typeof useMarkdown
  },  
}

/**
 * Graph module is a kernel component
 * that manages graphs for the application.
 * Kernel uses it for things such:
 * modules tree,
 * ui state management,
 * etc.
 */
const module: IMarkdownModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: {
    MarkdownReader
  },
  hooks: {
    useMarkdown
  },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default module;
