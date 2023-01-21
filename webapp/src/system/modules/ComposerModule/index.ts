import { IModule } from "@kernel/modules/base";
import useModel from "./components/SVGManager";
import initialTabs from "./components/RibbonMenu";
import ComposerViewport from "./components/Viewport";
import { MODULE_NAME, MODULE_VERSION } from "./constants";

import parseElements from "./store/middlewares/parseGarment";
import parseSVG from "./store/middlewares/parseSVG";
import handlePartPropertiesChanges from "./store/middlewares/handleMaterialPropertiesChanges";
import handlePartSelectedEvent from "./store/middlewares/handleMaterialSelectedEvent";
import handleRightPanelClosedEvent from "./store/middlewares/handleRightPanelClosedEvent";

import ComposerUI from "./store/Slice";

import {startModule} from './kernelCalls'

export interface ComposerModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  // store: {
  //   reducers: {
  //     ComposerUI: typeof ComposerUI;
  //   };
  //   middlewares: [
  //     parseElements: typeof parseElements,
  //     parseSVG: typeof parseSVG,
  //     handlePartPropertiesChanges: typeof handlePartPropertiesChanges,
  //     handlePartSelectedEvent: typeof handlePartSelectedEvent,
  //     handleRightPanelClosedEvent: typeof handleRightPanelClosedEvent
  //   ];
  // };
  // hooks: {
  //   module: {
  //     useModel: typeof useModel;
  //   }
  // };
}

/**
 * Composer module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const module: ComposerModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: ['Layout', 'Graph', 'Store'],
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){}
  }
  // components: {
  //   ribbonTabs: initialTabs,
  //   viewport: ComposerViewport,
  // },
  // store: {
  //   reducers: {
  //     ComposerUI,
  //   },
  //   middlewares: [
  //     parseElements,
  //     parseSVG,
  //     handlePartPropertiesChanges,
  //     handlePartSelectedEvent,
  //     handleRightPanelClosedEvent,
  //   ],
  // },
  // hooks: { module: {useModel} },
};
export default module;
