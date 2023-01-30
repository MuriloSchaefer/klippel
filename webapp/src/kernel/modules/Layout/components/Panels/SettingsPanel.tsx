import React from "react";
import { createPortal } from "react-dom";
import { SETTINGS_PANEL_ID } from "../../constants";

export const SettingsPanel = ({children}: {children: React.ReactElement}) => {
  const ref = document.getElementById(SETTINGS_PANEL_ID);

  if (!ref) return null;
  return createPortal(children, ref);
};

export default SettingsPanel;
