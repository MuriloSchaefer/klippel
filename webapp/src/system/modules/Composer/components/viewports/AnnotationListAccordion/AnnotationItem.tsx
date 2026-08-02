import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton, ListItem, TextField, useTheme } from "@mui/material";
import { DeleteOutlineSharp, OpenWithOutlined } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { ISVGModule } from "@kernel/modules/SVG";
import { useVariationActions } from "../../../hooks/useVariationActions";
import type { AnnotationNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";
import AnnotationLinkElectiveButton from "./AnnotationLinkElectiveButton";

// Matches the injected text-element id built in useVariationActions.
const annotationTextId = (annotationId: string) =>
  `annotation-text-${annotationId}`;

function AnnotationItem({
  node,
  variationId,
}: Readonly<{ node: AnnotationNode; variationId: string }>) {
  const theme = useTheme();
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const svgModule = useModule<ISVGModule>("SVG");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const svgToolkit = svgModule.hooks.useSVGEditorToolkit();
  const { actions } = useVariationActions({ variationId });

  const [isFocused, setIsFocused] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);

  // Locally-echoed field values. The inputs dispatch to the store on every
  // keystroke, so the store value round-trips back through the node prop. Without
  // a guard, that echo re-runs the sync effect and can revert local state to a
  // stale in-flight value mid-edit, dropping characters under fast typing/paste.
  // Track the last value we sent and only re-sync when the node changes from
  // elsewhere (i.e. the incoming value isn't our own echo).
  const [label, setLabel] = useState(node.label);
  const [text, setText] = useState(node.text);
  const lastSentLabel = useRef(node.label);
  const lastSentText = useRef(node.text);
  useEffect(() => {
    if (node.label !== lastSentLabel.current) {
      lastSentLabel.current = node.label;
      setLabel(node.label);
    }
  }, [node.label]);
  useEffect(() => {
    if (node.text !== lastSentText.current) {
      lastSentText.current = node.text;
      setText(node.text);
    }
  }, [node.text]);

  // Select the label in the drawing and wire move/scale (no rotate) back to the
  // transform action. The target point is dragged directly in the overlay.
  const selectInDrawing = () => {
    svgToolkit.selectManipulable(annotationTextId(node.annotationId), {
      handles: ["move", "scale"],
      onTransform: (_id, t) =>
        actions.updateAnnotationTransform(node.id, {
          x: t.x,
          y: t.y,
          scale: t.scale,
        }),
    });
  };

  return (
    <ListItem
      ref={rowRef}
      id={node.id}
      data-testid="annotation-item"
      data-annotation-label={node.label}
      tabIndex={0}
      onFocus={(e) => {
        if (e.currentTarget === e.target) setIsFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      sx={{
        mb: 0.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 0.5,
        p: 1,
        border: "2px solid transparent",
        borderRadius: 1,
        "&:focus, &:focus-visible, &:focus-within": {
          outline: "none",
          borderColor: "primary.main",
          boxShadow: (t) => `0 0 0 2px ${t.palette.primary.light}`,
        },
      }}
    >
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
        <TextField
          size="small"
          fullWidth
          value={label}
          data-testid="annotation-name"
          onChange={(e) => {
            const value = e.target.value;
            lastSentLabel.current = value;
            setLabel(value);
            actions.renameAnnotation(node.id, value);
          }}
        />
        <IconButton
          size="small"
          data-testid="annotation-item-select"
          aria-label="select-annotation"
          title="Editar no desenho (mover/escalar)"
          color="primary"
          onClick={selectInDrawing}
        >
          <ShortcutHint
            placement="top-center"
            shortcutId={`${MODULE_NAME}/AnnotationItem/editInDrawing`}
            alwaysShow={isFocused}
          >
            <OpenWithOutlined fontSize="small" />
          </ShortcutHint>
        </IconButton>
        <AnnotationLinkElectiveButton
          node={node}
          variationId={variationId}
          isFocused={isFocused}
        />
        <IconButton
          size="small"
          data-testid="annotation-item-delete"
          aria-label="delete-annotation"
          sx={{ "&:hover": { color: theme.palette.error.main } }}
          onClick={() => {
            const row = rowRef.current;
            const next =
              (row?.nextElementSibling as HTMLElement | null) ??
              (row?.previousElementSibling as HTMLElement | null) ??
              null;
            const fallback = document.getElementById(
              "composer-add-annotation",
            ) as HTMLElement | null;
            const target =
              next && next.matches('[data-testid="annotation-item"]')
                ? next
                : fallback;
            actions.removeAnnotation(node.id);
            if (target) setTimeout(() => target.focus(), 0);
          }}
        >
          <ShortcutHint
            placement="top-center"
            shortcutId={`${MODULE_NAME}/AnnotationItem/delete`}
            alwaysShow={isFocused}
          >
            <DeleteOutlineSharp fontSize="small" color="error" />
          </ShortcutHint>
        </IconButton>
      </Box>

      <TextField
        size="small"
        fullWidth
        multiline
        minRows={2}
        label="Texto"
        value={text}
        data-testid="annotation-text"
        onChange={(e) => {
          const value = e.target.value;
          lastSentText.current = value;
          setText(value);
          actions.updateAnnotationText(node.id, value);
        }}
      />
    </ListItem>
  );
}

export default React.memo(AnnotationItem);
