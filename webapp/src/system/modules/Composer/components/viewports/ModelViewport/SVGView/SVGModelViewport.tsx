import type { ISVGModule } from "@kernel/modules/SVG";
import useModule from "@kernel/hooks/useModule";
import useVariation from "../../../../hooks/useVariation";
import React, { useMemo } from "react";
import { debounce } from "@kernel/utils";
import { zoomIdentity, ZoomTransform } from "d3";

export default function SVGModelViewport({
  variationId,
}: Readonly<{ variationId: string }>) {
  const {
    hooks: { useSVGEditor, useSVG },
    d3Components: { Grid },
  } = useModule<ISVGModule>("SVG");

  const variation = useVariation({ variationId });
  const svg = useSVG(variation.state.svg!, variationId);
  const editor = useSVGEditor({
    svgPath: variation.state.svg!,
    instanceName: variationId,
    beforeInjection: (svg) => svg,
  });

  const debouncedSaveZoom = useMemo(
    () => debounce((transform: ZoomTransform) => svg?.saveZoom(transform), 700),
    [svg]
  );

  editor.container.underlays([
    Grid({
      xSettings: {
        range: [-1, editor.width + 1],
        domain: [-1, editor.width + 1],
      },
      ySettings: {
        range: [-1, editor.height + 1],
        domain: [-1, editor.height + 1],
      },
      dimensions: [editor.width, editor.height],
    })
      .transformZoom((root, zoomFunc) => {
        if (
          svg?.state.instance.zoom !== undefined &&
          svg?.state.instance.pan !== undefined
        ) {
          zoomFunc.transform(
            root,
            zoomIdentity
              .translate(svg.state.instance.pan[0], svg.state.instance.pan[1])
              .scale(svg.state.instance.zoom)
          );
        } else {
          zoomFunc.translateBy(root, editor.width / 2, editor.height / 2);
        }
      })
      .onZoom(debouncedSaveZoom).build,
  ]);

  return (
    <div
      ref={editor.wrapperRef}
      id="svg-editor-wrapper"
      style={{ height: "100%", width: "100%", minWidth: 500 }}
    >
      <svg ref={editor.svgRef} id={`svg-editor`} width="100%" height="100%" />
    </div>
  );
}
