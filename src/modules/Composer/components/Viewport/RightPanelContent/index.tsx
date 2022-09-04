import React, { useEffect } from "react";

import useGraph from "@kernel/hooks/useGraph";
import AccordionSection from "@kernel/layout/components/Sidepanels/components/AccordionSection";
import { useAppDispatch } from "@kernel/store/hooks";

import { rightPanelTitleChanged } from "@kernel/layout/ations";

import useComposerUIState from "modules/Composer/hooks/useComposerUIState";
import { Part } from "../../../interfaces/Part";
import { Composition } from "../../../interfaces/Composition";
import { partPropertiesChanged } from "../../../store/actions";
import { CompositionGraphState } from "../../../store/state";

const ComposerRightPanelContent = () => {
  const dispatch = useAppDispatch();
  const selectedPartId = useComposerUIState(
    (ui) => ui.rightPanel.selectedPartId
  );
  const graphId = useComposerUIState((ui) => ui.viewport.graphId);

  const { state: node } = useGraph<CompositionGraphState, Composition | Part>(
    graphId ?? "",
    (g) => g.nodes[selectedPartId ?? ""]
  );

  useEffect(() => {
    if (node) {
      dispatch(rightPanelTitleChanged("Configurações"));
    }
  }, [node]);

  if (!node || !graphId || !selectedPartId) {
    return null;
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      partPropertiesChanged({
        graphId,
        partId: selectedPartId,
        oldProperties: {
          ...node.properties,
          color: node.properties.color,
        },
        newProperties: { ...node.properties, color: e.target.value },
      })
    );
  };

  return (
    <AccordionSection title="Composição">
      <div>
        <input
          type="color"
          id="skin"
          list="colors"
          name="skin"
          value={node.properties.color}
          onChange={handleColorChange}
        />
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
