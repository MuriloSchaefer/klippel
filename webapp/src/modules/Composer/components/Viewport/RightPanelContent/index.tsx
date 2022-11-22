import React, { useEffect } from "react";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";
import AccordionSection from "@kernel/modules/LayoutModule/components/Sidepanels/components/AccordionSection";
import { useAppDispatch } from "@kernel/store/hooks";

import { useComposerUIState } from "../../../hooks/useComposerUIState";
import { Material } from "../../../interfaces/Material";
import { Composition } from "../../../interfaces/Composition";
import { materialPropertiesChanged } from "../../../store/actions";
import { CompositionGraphState } from "../../../store/state";
import { ILayoutModule } from "@kernel/modules/LayoutModule";

const ComposerRightPanelContent = () => {
  const dispatch = useAppDispatch();
  const graphModule = useModule<IGraphModule>("GraphModule");
  const layoutModule = useModule<ILayoutModule>("LayoutModule");

  const { useActiveViewport } = layoutModule.hooks.module;
  const viewport = useActiveViewport();
  const selectedMaterialId = useComposerUIState((ui) => ui.viewports[viewport.state.id].UI.detailsPanel.selectedMaterialId);
  const graphId = useComposerUIState((ui) => ui.viewports[viewport.state.id].graphId);

  const { state: node } = graphModule.hooks.module.useGraph<
    CompositionGraphState,
    Composition | Material
  >(graphId ?? "", (g) => g && g.nodes[selectedMaterialId ?? ""]);


  useEffect(()=>{
    viewport.hooks.setDetailsPanelTitle(`Detalhes`)
  }, [])

  if (!node || !graphId || !selectedMaterialId) {
    return null;
  }


  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      materialPropertiesChanged({
        graphId,
        materialId: selectedMaterialId,
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

  return (
    <AccordionSection title="Composição">
      <div>
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
    </AccordionSection>
  );
};

export default ComposerRightPanelContent;
