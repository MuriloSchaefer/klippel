import type { ISVGModule } from "@kernel/modules/SVG";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { ComposerModuleState } from "../../../../typings";
import React, { useMemo, useRef } from "react";
import { debounce } from "@kernel/utils";
import { zoomIdentity, zoomTransform, ZoomTransform } from "d3";

export default function SVGModelViewport({
  variationId,
}: Readonly<{ variationId: string }>) {
  const {
    hooks: { useSVGEditor, useSVG },
    d3Components: { Grid },
  } = useModule<ISVGModule>("SVG");

  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const svgPath = useAppSelector(
    (s: { Composer: ComposerModuleState }) => s.Composer?.variations?.[variationId]?.svg,
  ) as string;

  const svg = useSVG(svgPath, variationId);
  const editor = useSVGEditor({
    svgPath,
    instanceName: variationId,
    beforeInjection: (svg) => svg,
  });

  const debouncedSaveZoom = useMemo(
    () => debounce((transform: ZoomTransform) => svg?.saveZoom(transform), 700),
    [svg]
  );

  // Holds the live d3 zoom transform. Grid() creates a fresh zoom behavior on
  // every chart rebuild (proxy changes, tool toggles, resizes…) and that resets
  // d3's internal `__zoom` to identity — so we have to re-seed it ourselves.
  // We re-seed from this ref (the on-screen transform), not from Redux, because
  // Redux is only debounce-saved and is stale during/right-after a pan.
  const liveTransformRef = useRef<ZoomTransform | null>(null);

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
        if (liveTransformRef.current) {
          // Re-seed the freshly-created zoom behavior with the actual on-screen
          // transform so rebuilds don't reset the view.
          zoomFunc.transform(root, liveTransformRef.current);
          return;
        }
        // First mount for this instance — seed from persisted state if any.
        if (
          svg?.state.instance.zoom !== undefined &&
          svg?.state.instance.pan !== undefined
        ) {
          const initial = zoomIdentity
            .translate(svg.state.instance.pan[0], svg.state.instance.pan[1])
            .scale(svg.state.instance.zoom);
          zoomFunc.transform(root, initial);
          liveTransformRef.current = initial;
        } else {
          zoomFunc.translateBy(root, editor.width / 2, editor.height / 2);
          const node = root.node();
          if (node) liveTransformRef.current = zoomTransform(node);
        }
      })
      .onZoom((transform) => {
        liveTransformRef.current = transform;
        debouncedSaveZoom(transform);
      }).build,
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
