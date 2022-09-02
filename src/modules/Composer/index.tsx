import { IModule } from "@kernel/modules/base";
import useModel from "./components/SVGManager";
import initialTabs from "./components/RibbonMenu";
import ComposerViewport from "./components/Viewport";
import { MODULE_NAME } from "./constants";

import parseMannequin from "./store/middlewares/parseMannequin";
import parseElements from "./store/middlewares/parseGarment";
import parseSVG from "./store/middlewares/parseSVG";
import handleMannequinChanges from "./store/middlewares/handleMannequinChanges";
import handlePartPropertiesChanges from "./store/middlewares/handlePartPropertiesChanges";
import handlePartSelectedEvent from "./store/middlewares/handlePartSelectedEvent";
import handleRightPanelClosedEvent from "./store/middlewares/handleRightPanelClosedEvent";

import ComposerUI from "./store/Slice";

export interface IComposerModule extends IModule {
  store: {
    reducers: {
      ComposerUI: typeof ComposerUI;
    };
    middlewares: [
      parseElements: typeof parseElements,
      parseMannequin: typeof parseMannequin,
      parseSVG: typeof parseSVG,
      handleMannequinChanges: typeof handleMannequinChanges,
      handlePartPropertiesChanges: typeof handlePartPropertiesChanges,
      handlePartSelectedEvent: typeof handlePartSelectedEvent,
      handleRightPanelClosedEvent: typeof handleRightPanelClosedEvent
    ];
  };
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
    reducers: {
      ComposerUI,
    },
    middlewares: [
      parseElements,
      parseMannequin,
      parseSVG,
      handleMannequinChanges,
      handlePartPropertiesChanges,
      handlePartSelectedEvent,
      handleRightPanelClosedEvent,
    ],
  },
  hooks: { useModel },
};
export default ComposerModule;
