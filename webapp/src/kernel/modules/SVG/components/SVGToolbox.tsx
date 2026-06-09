import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  RotateRightOutlined,
  AspectRatioOutlined,
  ContentCutOutlined,
} from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import useSVGEditorToolkit from "../hooks/useSVGEditorToolkit";
import {
  SVG_TOOLBOX_CONTEXT_ID,
  SVG_TOOLBOX_ROTATE_SHORTCUT_ID,
  SVG_TOOLBOX_SCALE_SHORTCUT_ID,
  SVG_TOOLBOX_CLIP_SHORTCUT_ID,
} from "../constants";

/**
 * The svgtoolbox overlay: spatial-editing controls (rotate / scale / clip) for
 * the currently selected injected element. Drag (move) is pointer-native (no
 * key). Placement lifecycle (create/rename/delete) is the host's concern.
 *
 * The bindings are registered once in the SVG module's postBootInitialization
 * (kernelCalls.ts). This component only renders while an element is selected,
 * and its ShortcutProvider activates the SVG/Toolbox context for exactly that
 * window (pushed on mount, popped on unmount).
 */
function SVGToolbox() {
  const keyboard = useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint, ShortcutProvider } = keyboard.components;
  const { state, setManipulateMode } = useSVGEditorToolkit();
  const { enabled, mode } = state.tools.manipulate;

  if (!enabled) return null;

  const toggle = (next: "rotate" | "scale" | "clip") =>
    setManipulateMode(mode === next ? "idle" : next);

  return (
    <ShortcutProvider contextId={SVG_TOOLBOX_CONTEXT_ID}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={mode === "idle" ? null : mode}
        data-testid="svgtoolbox"
        aria-label="ferramentas de posição"
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          bgcolor: "background.paper",
          boxShadow: 3,
        }}
      >
        <ShortcutHint
          placement="bottom-center"
          shortcutId={SVG_TOOLBOX_ROTATE_SHORTCUT_ID}
        >
          <ToggleButton
            value="rotate"
            data-testid="svgtoolbox-rotate"
            aria-label="rotate-placement"
            onClick={() => toggle("rotate")}
          >
            <RotateRightOutlined fontSize="small" />
          </ToggleButton>
        </ShortcutHint>
        <ShortcutHint
          placement="bottom-center"
          shortcutId={SVG_TOOLBOX_SCALE_SHORTCUT_ID}
        >
          <ToggleButton
            value="scale"
            data-testid="svgtoolbox-scale"
            aria-label="scale-placement"
            onClick={() => toggle("scale")}
          >
            <AspectRatioOutlined fontSize="small" />
          </ToggleButton>
        </ShortcutHint>
        <ShortcutHint
          placement="bottom-center"
          shortcutId={SVG_TOOLBOX_CLIP_SHORTCUT_ID}
        >
          <ToggleButton
            value="clip"
            data-testid="svgtoolbox-clip"
            aria-label="clip-placement"
            onClick={() => toggle("clip")}
          >
            <ContentCutOutlined fontSize="small" />
          </ToggleButton>
        </ShortcutHint>
      </ToggleButtonGroup>
    </ShortcutProvider>
  );
}

export default React.memo(SVGToolbox);
