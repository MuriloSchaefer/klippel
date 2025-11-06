import type { ISVGModule } from "@kernel/modules/SVG";
import useModule from "@kernel/hooks/useModule";
import useVariation from "../../../hooks/useVariation";
import { useTheme, Box, Typography, Button } from "@mui/material";
import DragAndDropSVG from "./assets/animated-drag-n-drop/DragAndDrop.svg";
import React, { useRef, useCallback, useState } from "react";
import { uploadSVG } from "../../../../Composer/store/variations/actions";
import { Store } from "@kernel/modules/Store";

export function SVGModelViewport({ variationId }: Readonly<{ variationId: string }>) {
  const {
    hooks: { useSVGEditor, useSVG },
    d3Components: { Grid }
  } = useModule<ISVGModule>("SVG");


  const variation = useVariation({ variationId });
  const svg = useSVG(variation.state.svg!, variationId);
  const editor = useSVGEditor({
    svgPath: variation.state.svg!,
    instanceName: variationId,
    beforeInjection: (svg) => svg,
  });
  editor.container.underlays([
    Grid({
        xSettings: { range: [-1, editor.width + 1], domain: [-1,editor.width + 1] },
        ySettings: { range: [-1, editor.height + 1], domain: [-1, editor.height + 1] },
        dimensions: [editor.width, editor.height],
    }).transformZoom((root, zoomFunc) => {
        zoomFunc.translateBy(root, editor.width / 2, editor.height / 2);
      }).build
  ])

  return (
    <div
      ref={editor.wrapperRef}
      id="svg-editor-wrapper"
      style={{ height: "100%", width: "100%" }}
    >
      <svg ref={editor.svgRef} id={`svg-editor`} width="100%" height="100%" />
    </div>
  );
}

export default function SVGView({ variationId }: Readonly<{ variationId: string }>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const theme = useTheme();
  
  const storeModule = useModule<Store>("Store");  
  const variation = useVariation({ variationId });
  
  const dispatch = storeModule.hooks.useAppDispatch();

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (!files || !files.length || files.length > 1) throw new Error("Please upload a single SVG file.");
    const file  = files[0];
    const blob = new Blob([file], { type: "image/svg+xml" });
    blob.text().then(svgContent =>dispatch(uploadSVG({ variationId, svgContent })));

  }, []);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !files.length || files.length > 1) throw new Error("Please upload a single SVG file.");
      const file  = files[0];
      const blob = new Blob([file], { type: "image/svg+xml" });
      blob.text().then(svgContent =>dispatch(uploadSVG({ variationId, svgContent })));
    },
    []
  );

  if (!variation.state.svg) {
    return (
      <Box
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
                // CSS palette variables for SVG
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
        <Button variant="contained" color="primary" onClick={handleButtonClick}>
          Fazer upload de SVG
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/svg+xml"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>
    );
  }

  return <SVGModelViewport variationId={variationId} />;
}
