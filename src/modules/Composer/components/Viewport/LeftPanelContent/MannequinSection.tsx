import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import {
  MannequinAttributes,
  MannequinLayer,
} from "modules/Composer/interfaces/Mannequin";
import { mannequinChangeEvent } from "modules/Composer/store/actions";
import React from "react";
import { MannequinChangeEvent } from "../../../interfaces/events/MannequinChange";

export interface MannequinSectionProps {
  graphId: string;
}

const MannequinControls = ({ graphId }: MannequinSectionProps) => {
  const dispatch = useAppDispatch();

  const {
    mannequinAttributes,
  }: {
    mannequinLayer: MannequinLayer;
    mannequinAttributes: MannequinAttributes;
  } = useAppSelector((state) => state.graphsManager.graphs[graphId].nodes);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      mannequinChangeEvent({
        graphId,
        oldAttributes: { skinColor: mannequinAttributes.skinColor },
        newAttributes: { skinColor: e.target.value },
      } as MannequinChangeEvent)
    );
  };

  return (
    <div>
      <input
        type="color"
        id="skin"
        list="skincolors"
        name="skin"
        value={mannequinAttributes.skinColor}
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
