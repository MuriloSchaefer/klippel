import emitCustomEvent from "@kernel/events/emitEvent";
import { useAppSelector } from "@kernel/store/hooks";
import {
  MannequinAttributes,
  MannequinLayer,
} from "modules/Composer/interfaces/Mannequin";
import React from "react";
import { MannequinChangeEvent } from "./events/MannequinChange";

export interface MannequinSectionProps {
  graphId: string;
}

const MannequinControls = ({ graphId }: MannequinSectionProps) => {
  const {
    mannequinAttributes,
  }: {
    mannequinLayer: MannequinLayer;
    mannequinAttributes: MannequinAttributes;
  } = useAppSelector((state) => state.graphsManager.graphs[graphId].nodes);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emitCustomEvent("mannequin-change", {
      oldAttributes: { skinColor: mannequinAttributes.skinColor },
      newAttributes: { skinColor: e.target.value },
    } as MannequinChangeEvent);
  };

  console.log(mannequinAttributes);

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
