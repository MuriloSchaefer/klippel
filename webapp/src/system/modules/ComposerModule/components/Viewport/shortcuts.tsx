import React from "react";
import useModule from "@kernel/hooks/useModule";
import { useAppDispatch } from "@kernel/store (deprecated)/hooks";
import { IMouseModule } from "@kernel/modules/MouseModule";
import { IGraphModule } from "@kernel/modules/Graphs";

import useComposerUIState from "../../hooks/useComposerUIState";
import { CompositionGraphState } from "../../store/state";
import Composition from "../../interfaces/Composition";
import Material from "../../interfaces/Material";
import { materialPropertiesChanged } from "../../store/actions";
import MaterialList from "../Utils/MaterialList";

interface ShortcutsProps {
    viewportId: string
}
const Shortcuts = ({viewportId}: {viewportId: string}) => {
    // load modules
    const mouseModule = useModule<IMouseModule>("MouseModule")

    const {id, nodeId} = useComposerUIState((ui) => ui.viewports[viewportId].UI.shortcuts)
    const shortcuts = mouseModule.hooks.module.useFloatingShortcuts(id)
    if (!shortcuts.state?.visible || !nodeId) return null;

    return <ShortcutsContent viewportId={viewportId} nodeId={nodeId} />
}

interface ShortcutsContentProps {
    viewportId: string;
    nodeId: string
}
const ShortcutsContent = ({viewportId, nodeId}:ShortcutsContentProps) => {
    const dispatch = useAppDispatch();
    const graphModule = useModule<IGraphModule>("GraphModule")
    const graphId = useComposerUIState((ui)=>ui.viewports[viewportId]?.graphId )

    const { state: node } = graphModule.hooks.module.useGraph<
        CompositionGraphState,
        Composition | Material
    >(graphId, (g) => g && g.nodes[nodeId]);

    if (!node) return <div>Error loading information</div>;

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(
          materialPropertiesChanged({
            graphId,
            materialId: nodeId,
            oldProperties: {
              ...node.properties,
              Cor: node.properties.Cor,
            },
            newProperties: {
              ...node.properties,
              Cor: { value: e.target.value, type: "string" },
            },
          })
        );
      };

    return <div role="material-shortcuts">
        <MaterialList />
    {node.properties.Cor && (
      <input
        type="color"
        id="materialColor"
        list="colors"
        name="materialColor"
        value={node.properties.Cor.value}
        onChange={handleColorChange}
      />
    )}

    {/* <datalist id="colors">
      <option>#fff</option>
      <option>magenta</option>
      <option>#f1c27d</option>
      <option>#e0ac69</option>
      <option>#c68642</option>
      <option>#8d5524</option>
    </datalist> */}
  </div>
}

export default React.memo(Shortcuts);