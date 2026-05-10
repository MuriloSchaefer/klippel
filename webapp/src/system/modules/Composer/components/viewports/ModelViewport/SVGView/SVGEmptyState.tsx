import { useTheme, Box, Typography, Button } from "@mui/material";
import React, { useRef, useCallback, useState } from "react";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import DragAndDropSVG from "../assets/animated-drag-n-drop/DragAndDrop.svg";
import { uploadSVG } from "../../../../store/variations/actions";
import {
  SVG_EMPTY_STATE_CONTEXT_ID,
  UPLOAD_SVG_SHORTCUT_ID,
} from "../../../../constants";

export const SVG_EMPTY_STATE_TESTID = "svg-empty-state";
export const UPLOAD_SVG_BUTTON_TESTID = "upload-svg-button";
export const UPLOAD_SVG_INPUT_TESTID = "upload-svg-input";

export default function SVGEmptyState({
  variationId,
}: Readonly<{ variationId: string }>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const theme = useTheme();

  const storeModule = useModule<Store>("Store");
  const dispatch = storeModule.hooks.useAppDispatch();

  const keyboardShortcuts = useModule<IKeyboardShortcutsModule>(
    "KeyboardShortcuts"
  );
  const { ShortcutProvider, ShortcutHint } = keyboardShortcuts.components;

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const files = e.dataTransfer.files;
      if (!files || !files.length || files.length > 1)
        throw new Error("Please upload a single SVG file.");
      const file = files[0];
      const blob = new Blob([file], { type: "image/svg+xml" });
      blob
        .text()
        .then((svgContent) => dispatch(uploadSVG({ variationId, svgContent })));
    },
    [dispatch, variationId]
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !files.length || files.length > 1)
        throw new Error("Please upload a single SVG file.");
      const file = files[0];
      const blob = new Blob([file], { type: "image/svg+xml" });
      blob
        .text()
        .then((svgContent) => dispatch(uploadSVG({ variationId, svgContent })));
    },
    [dispatch, variationId]
  );

  return (
    <ShortcutProvider contextId={SVG_EMPTY_STATE_CONTEXT_ID}>
      <Box
        data-testid={SVG_EMPTY_STATE_TESTID}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: theme.palette.background.default,
          color: theme.palette.text.primary,
          borderRadius: 2,
          border: `2px dashed ${
            dragActive ? theme.palette.primary.main : theme.palette.divider
          }`,
          p: 4,
          gap: 2,
          transition: "border-color 0.2s",
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <Box sx={{ mb: 2 }}>
          <img
            src={DragAndDropSVG}
            alt="Drag and Drop SVG"
            style={
              {
                width: 150,
                height: 150,
                display: "block",
                margin: "0 auto",
                "--drop-area-bg":
                  theme.palette.mode === "dark"
                    ? theme.palette.grey[900]
                    : theme.palette.primary.light,
                "--drop-area-stroke": theme.palette.primary.main,
                "--file-bg":
                  theme.palette.mode === "dark"
                    ? theme.palette.grey[800]
                    : theme.palette.background.paper,
                "--file-stroke": theme.palette.primary.main,
                "--file-bar": theme.palette.primary.main,
                "--drag-dots":
                  theme.palette.mode === "dark"
                    ? theme.palette.secondary.light
                    : theme.palette.primary.main,
              } as React.CSSProperties
            }
          />
        </Box>
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
          Nenhum SVG carregado para o modelo.
          <br />
          Por favor arraste e solte um arquivo SVG ou faça upload através do
          botão.
        </Typography>
        <ShortcutHint shortcutId={UPLOAD_SVG_SHORTCUT_ID} placement="bottom-right">
          <Button
            data-testid={UPLOAD_SVG_BUTTON_TESTID}
            variant="contained"
            color="primary"
            onClick={handleButtonClick}
          >
            Fazer upload de SVG
          </Button>
        </ShortcutHint>
        <input
          ref={fileInputRef}
          data-testid={UPLOAD_SVG_INPUT_TESTID}
          type="file"
          accept="image/svg+xml"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>
    </ShortcutProvider>
  );
}
