import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import { MannequinLayer } from "modules/Composer/interfaces/Mannequin";
import { mannequinChangedEvent } from "modules/Composer/store/actions";
import React from "react";
import { MannequinChangedEvent } from "../../../interfaces/events/MannequinChanged";

export interface MannequinSectionProps {
  graphId: string;
}

const MannequinControls = ({ graphId }: MannequinSectionProps) => {
  const dispatch = useAppDispatch();

  const {
    mannequinLayer,
  }: {
    mannequinLayer: MannequinLayer;
  } = useAppSelector((state) => state.graphsManager.graphs[graphId].nodes);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      mannequinChangedEvent({
        graphId,
        oldAttributes: { skinColor: mannequinLayer.properties.skinColor },
        newAttributes: { skinColor: e.target.value },
      } as MannequinChangedEvent)
    );
  };

  return (
    <div>
      <input
        type="color"
        id="skin"
        list="skincolors"
        name="skin"
        value={mannequinLayer.properties.skinColor}
        onChange={handleChange}
      />
      <datalist id="skincolors">
        <option>#ffdbac</option>
        <option>#EECCAA</option>
        <option>#f1c27d</option>
        <option>#e0ac69</option>
        <option>#c68642</option>
        <option>#8d5524</option>
      </datalist>
    </div>
  );
};

export default MannequinControls;
