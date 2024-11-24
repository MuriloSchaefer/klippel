import { IModule } from "../base";
import ChordPlot from "./components/d3/ChordPlot";
import D3Grid from "./components/d3/Grid";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useD3Container from "./hooks/useD3Container";
import useSVG from "./hooks/useSVG";
import useSVGManager from "./hooks/useSVGManager";
import { startModule } from "./kernelCalls";
import DependencyCircle from "./components/d3/DependencyCircle";
import { selectSVGState } from "./store/selectors";
import { useSVGEditor } from "./hooks/useSVGEditor";
import SVGEditorToolkit from './components/SVGEditorToolkit';
import useSVGEditorToolkit from "./hooks/useSVGEditorToolkit";

export interface ISVGModule extends IModule {
  name: typeof MODULE_NAME;
  version: typeof MODULE_VERSION;
  components: {
    SVGEditorToolkit: typeof SVGEditorToolkit
  };
  d3Components: {
    Grid: typeof D3Grid;
    ChordPlot: typeof ChordPlot;
    DependencyCircle: typeof DependencyCircle;
  };
  selectors: {
    selectSVGState: typeof selectSVGState
  },
  hooks: {
    useD3Container: typeof useD3Container;
    useSVGManager: typeof useSVGManager;
    useSVG: typeof useSVG;

    useSVGEditor: typeof useSVGEditor;
    useSVGEditorToolkit: typeof useSVGEditorToolkit
  }
}

/**
 * Graph module is a kernel component
 * that manages graphs for the application.
 * Kernel uses it for things such:
 * modules tree,
 * ui state management,
 * etc.
 */
const module: ISVGModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: {
    SVGEditorToolkit
  },
  d3Components: { Grid: D3Grid, ChordPlot, DependencyCircle },
  hooks: {
    useD3Container,
    useSVGManager,
    useSVG,
    useSVGEditor,
    useSVGEditorToolkit
  },
  selectors: {selectSVGState},
  kernelCalls: {
    startModule,
    restartModule() {},
    shutdownModule() {},
  },
};

export default module;
