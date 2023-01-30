import React from "react";
import { createPortal } from "react-dom";
import { DETAILS_PANEL_ID} from "../../constants";

export const DetailsPanel = ({children}: {children: React.ReactElement}) => {
  const ref = document.getElementById(DETAILS_PANEL_ID);

  if (!ref) return null;
  return createPortal(children, ref);
};

export default DetailsPanel;
