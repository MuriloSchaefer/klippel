import useModule from "@kernel/hooks/useModule";
import { type ILayoutModule } from "@kernel/modules/Layout";
import {
  Box,
  Button,
  Paper,
  styled,
  Typography,
  useTheme,
} from "@mui/material";
import { ISVGModule } from "@kernel/modules/SVG";
import { useLayoutEffect, useRef, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import useVariation from "@system/modules/Composer/hooks/useVariation";
import { ModelVariation } from "@system/modules/Composer/typings";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

function SVGViewport({ variation }: { variation: ModelVariation }) {
  const {
    hooks: { useResizeObserver },
  } = useModule<ILayoutModule>("Layout");

  const {
    hooks: { useD3Container, useSVG },
    d3Components: { Grid },
  } = useModule<ISVGModule>("SVG");

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(wrapperRef);

  const theme = useTheme();
  const [shallTranslate, setShallTranslate] = useState(true);
  const [width, height] = [dimensions?.width ?? 700, dimensions?.height ?? 700];

  const svg = useSVG(variation.svg!, variation.variationId);

  const container = useD3Container<any>()
    .width(width)
    .height(height)
    .underlays([
      Grid<any>({
        xSettings: { range: [-1, width + 1], domain: [-1, width + 1] },
        ySettings: { range: [-1, height + 1], domain: [-1, height + 1] },
        dimensions: [width, height],
      }).transformZoom((root, zoomFunc) => {
        if (shallTranslate) {
          // @ts-ignore TODO: fix typing
          zoomFunc.translateBy(root, width / 4, height / 4);
          setShallTranslate(false);
        }
      }).build,
    ])
    .content([
      (
        root,
        selection,
        data,
      ) => {
        const dom = svg?.state.DOMroot
        if (dom)
          selection.node()?.append(dom)
      },
    ]);

  useLayoutEffect(() => {
    if (!dimensions || !svgRef.current) return;
    container.render(null, svgRef.current);
  }, [dimensions]);


  return (
    <div
      ref={wrapperRef}
      role="conversion-graph-viewer"
      style={{ height: "100%", width: "100%" }}
    >
      <svg ref={svgRef} id={`svg-render`} width="100%" height="100%" />
    </div>
  );
}

export default function VisualView({ variationId }: { variationId: string }) {
  const variation = useVariation(variationId);

  return (
    <Box
      sx={{
        padding: 1,
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {!variation.state.svg ? (
        <Paper
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            padding: 3,
            transform: "translate(-50%, -50%)",
          }}
          elevation={3}
        >
          <Typography>
            <strong>Não há nenhuma visualização adicionada</strong>
          </Typography>

          <Box>
            <Typography>Faça upload de um SVG o modelo</Typography>
            <Button
              component="label"
              role={undefined}
              variant="contained"
              tabIndex={-1}
              startIcon={<CloudUploadIcon />}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Upload files
              <VisuallyHiddenInput
                type="file"
                onChange={(event) =>
                  event.target.files &&
                  variation.actions.uploadView(event.target.files[0])
                }
                multiple
              />
            </Button>
          </Box>
        </Paper>
      ) : (
        <SVGViewport variation={variation.state}></SVGViewport>
      )}
    </Box>
  );
}
