import React, { useEffect } from "react";

import useGraph from "@kernel/hooks/useGraph";
import AccordionSection from "@kernel/layout/components/Sidepanels/components/AccordionSection";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";

import { rightPanelTitleChanged } from "@kernel/layout/ations";

import { Part } from "../../../interfaces/Part";
import { Composition } from "../../../interfaces/Composition";
import { partPropertiesChanged } from "../../../store/actions";
import { CompositionGraphState } from "../../../store/state";

const ComposerRightPanelContent = () => {
  const dispatch = useAppDispatch();
  const selectedPartId = useAppSelector<string>(
    (state) => state.ComposerUI.rightPanel.selectedPartId
  );
  const graphId = useAppSelector((state) => state.ComposerUI.viewport.graphId);

  const graph = useGraph<CompositionGraphState, Composition | Part>(
    graphId,
    (g) => g.nodes[selectedPartId]
  );

  useEffect(() => {
    if (graph?.state && graph?.state.type === "Part") {
      dispatch(rightPanelTitleChanged("Configurações"));
    }
  }, [graph?.state]);

  if (!graph) {
    return null;
  }
  const { state: part } = graph;
  if (!part || part.type !== "Part") return null;

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      partPropertiesChanged({
        graphId,
        partId: selectedPartId,
        oldProperties: {
          ...part.properties,
          color: part.properties.color,
        },
        newProperties: { ...part.properties, color: e.target.value },
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
          value={part.properties.color}
          onChange={handleColorChange}
        />
        <datalist id="colors">
          <option>#fff</option>
          <option>magenta</option>
          <option>#f1c27d</option>
          <option>#e0ac69</option>
          <option>#c68642</option>
          <option>#8d5524</option>
        </datalist>
      </div>
    </AccordionSection>
  );
};

export default ComposerRightPanelContent;
