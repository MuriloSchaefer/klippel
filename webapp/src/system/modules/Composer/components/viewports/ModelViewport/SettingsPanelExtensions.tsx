import React, { useMemo } from "react";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { MODEL_VIEWPORT_SETTINGS_REGISTRY_NAME } from "../../../constants";

export type SettingsPanelExtensionProps = {
  variationId: string;
  modelId: string;
  /** Panel collapse state, forwarded by `SettingsPanel` via `cloneElement`. */
  state?: "expanded" | "collapsed";
};

/**
 * Renders the accordions other modules contributed to the ModelViewport
 * settings panel (see `MODEL_VIEWPORT_SETTINGS_REGISTRY_NAME`).
 *
 * A single element rather than a bare array or fragment on purpose:
 * `SettingsPanel` clones each of its children with the panel `state`, which a
 * fragment would swallow (and React warns about). This component takes the
 * clone and forwards `state` to every extension, so contributed accordions
 * collapse to icons along with the built-in ones.
 */
function SettingsPanelExtensions({
  variationId,
  modelId,
  state,
}: SettingsPanelExtensionProps) {
  const storeModule = useModule<Store>("Store");
  const componentRegistryManager = storeModule.managers.componentRegistry();

  const extensions = useMemo(
    () =>
      componentRegistryManager.functions.getRegistry<SettingsPanelExtensionProps>(
        MODEL_VIEWPORT_SETTINGS_REGISTRY_NAME,
      ) ?? {},
    [componentRegistryManager],
  );

  return (
    <>
      {Object.entries(extensions).map(([key, Extension]) => (
        <Extension
          key={key}
          variationId={variationId}
          modelId={modelId}
          state={state}
        />
      ))}
    </>
  );
}

export default React.memo(SettingsPanelExtensions);
