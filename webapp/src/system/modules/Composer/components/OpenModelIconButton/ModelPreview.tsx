import Box, { type BoxProps } from "@mui/material/Box";
import { Model } from "../../typings";
import { ISVGModule } from "@kernel/modules/SVG";
import useModule from "@kernel/hooks/useModule";

function ModelPreview({
  model,
  ...props
}: BoxProps & { model: Model & { svg: string } }) {
  const {
    hooks: { useSVGEditor },
  } = useModule<ISVGModule>("SVG");

  const editor = useSVGEditor({
    svgPath: model.svg,
    instanceName: model.id,
  });
  return (
    <Box {...props}>
      <div ref={editor.wrapperRef} style={{ height: "100%", width: "100%" }}>
        <svg ref={editor.svgRef} id={`svg-editor`} width="100%" height="100%" />
      </div>
    </Box>
  );
}

export default function ModelPreviewLoader({
  model,
  ...props
}: BoxProps & { model: Model }) {
  if (!model.svg) return <>Prévia não disponível</>;

  return <ModelPreview {...props} model={{ ...model, svg: model.svg! }} />;
}
