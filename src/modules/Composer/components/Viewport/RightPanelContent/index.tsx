import React from "react";

import AccordionSection from "@kernel/layout/components/Sidepanels/components/AccordionSection";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import { partPropertiesChanged } from "modules/Composer/store/actions";

export interface ComposerRightPanelContentProps {
  compositionGraphId: string;
  selectedPart: string;
}

const ComposerRightPanelContent = ({
  compositionGraphId,
  selectedPart,
}: ComposerRightPanelContentProps) => {
  const dispatch = useAppDispatch();
  const part = useAppSelector(
    (state) =>
      state.graphsManager.graphs[compositionGraphId].nodes[selectedPart]
  );

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      partPropertiesChanged({
        graphId: compositionGraphId,
        partId: selectedPart,
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
