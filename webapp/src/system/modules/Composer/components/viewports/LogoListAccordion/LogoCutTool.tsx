import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import type { CropRect } from "./logoCut";

// Preview is bounded by both a max width (the available panel width) and a max
// height so a tall/portrait image never overflows or gets clipped. The image is
// "contained" inside these bounds; the container is sized to match the rendered
// image exactly so the percentage-based crop overlay stays aligned.
const MAX_PREVIEW_W = 360;
const MAX_PREVIEW_H = 240;

/**
 * Interactive crop/clip selector. Shows a preview of the uploaded file with a
 * rectangle whose on-screen proportions match the logo's physical dimensions
 * (width:height). The user drags the rectangle to move it and drags the corner
 * handle to scale it; the selection is reported in normalized coordinates and
 * applied (raster crop / svg viewBox clip) by the caller on confirmation.
 */
export default function LogoCutTool({
  kind,
  data,
  mime,
  aspect,
  rect,
  onRectChange,
}: Readonly<{
  kind: "svg" | "raster" | "";
  data: string;
  mime: string;
  aspect: number; // physical width / height
  rect: CropRect;
  onRectChange: (r: CropRect) => void;
}>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageAspect, setImageAspect] = useState(1); // natural width / height
  const [availW, setAvailW] = useState(MAX_PREVIEW_W); // measured panel width
  const initializedRef = useRef(false);
  const dragRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    orig: CropRect;
  } | null>(null);

  const safeAspect = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;

  // h such that (w*nw)/(h*nh) === physical aspect → h = w * imageAspect / aspect.
  const enforceH = (w: number) => (w * imageAspect) / safeAspect;

  const clampRect = (r: CropRect): CropRect => {
    let w = Math.min(1, Math.max(0.05, r.w));
    let h = enforceH(w);
    if (h > 1) {
      h = 1;
      w = (h * safeAspect) / imageAspect;
    }
    const x = Math.min(Math.max(0, r.x), 1 - w);
    const y = Math.min(Math.max(0, r.y), 1 - h);
    return { x, y, w, h };
  };

  // The largest centered rect that fits [0,1]² while keeping the physical
  // aspect — start with the maximum size allowed.
  const maxFit = (ia: number): CropRect => {
    let w = 1;
    let h = (w * ia) / safeAspect;
    if (h > 1) {
      h = 1;
      w = (h * safeAspect) / ia;
    }
    return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
  };

  // Fit the maximum rect once the image aspect is known.
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || img.width || 1;
    const nh = img.naturalHeight || img.height || 1;
    const ia = nw / nh || 1;
    setImageAspect(ia);
    if (!initializedRef.current) {
      initializedRef.current = true;
      onRectChange(maxFit(ia));
    }
  };

  // Re-maximize when the physical aspect changes after initialization.
  const lastAspectRef = useRef(safeAspect);
  useEffect(() => {
    if (!initializedRef.current) return;
    if (lastAspectRef.current === safeAspect) return;
    lastAspectRef.current = safeAspect;
    onRectChange(maxFit(imageAspect));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeAspect, imageAspect]);

  // Track the available width so the contained preview can fill it (bounded by
  // MAX_PREVIEW_W) without ever overflowing the panel.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () =>
      setAvailW(Math.min(el.clientWidth || MAX_PREVIEW_W, MAX_PREVIEW_W));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Contain the image within (availW × MAX_PREVIEW_H), preserving its natural
  // aspect; the container is sized to these exact dimensions so the crop overlay
  // (positioned in % of the container) lines up with the rendered pixels.
  let dispW = availW;
  let dispH = dispW / imageAspect;
  if (dispH > MAX_PREVIEW_H) {
    dispH = MAX_PREVIEW_H;
    dispW = dispH * imageAspect;
  }

  const onPointerDownBody = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode: "move",
      startX: e.clientX,
      startY: e.clientY,
      orig: rect,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerDownHandle = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode: "resize",
      startX: e.clientX,
      startY: e.clientY,
      orig: rect,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const dx = (e.clientX - drag.startX) / box.width;
    const dy = (e.clientY - drag.startY) / box.height;
    if (drag.mode === "move") {
      onRectChange(
        clampRect({ ...drag.orig, x: drag.orig.x + dx, y: drag.orig.y + dy }),
      );
    } else {
      const w = drag.orig.w + dx;
      onRectChange(clampRect({ ...drag.orig, w }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  if (!kind || !data) return null;
  const src = `data:${mime};base64,${data}`;

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Recorte ({safeAspect.toFixed(2)}:1) — arraste para mover, alça para
        redimensionar
      </Typography>
      <Box
        ref={wrapperRef}
        sx={{
          mt: 0.5,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box
          ref={containerRef}
          data-testid="logo-cut-tool"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          sx={{
            position: "relative",
            width: dispW,
            height: dispH,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
            userSelect: "none",
            touchAction: "none",
            background:
              "repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%) 50% / 16px 16px",
          }}
        >
          <img
            src={src}
            onLoad={onImgLoad}
            alt="preview"
            draggable={false}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "fill",
              pointerEvents: "none",
            }}
          />
          {/* dim overlay outside the crop */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35) inset",
              clipPath: `polygon(
              0 0, 100% 0, 100% 100%, 0 100%, 0 0,
              ${rect.x * 100}% ${rect.y * 100}%,
              ${rect.x * 100}% ${(rect.y + rect.h) * 100}%,
              ${(rect.x + rect.w) * 100}% ${(rect.y + rect.h) * 100}%,
              ${(rect.x + rect.w) * 100}% ${rect.y * 100}%,
              ${rect.x * 100}% ${rect.y * 100}%
            )`,
            }}
          />
          {/* crop rectangle */}
          <Box
            data-testid="logo-cut-rect"
            onPointerDown={onPointerDownBody}
            sx={{
              position: "absolute",
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              border: "2px solid",
              borderColor: "primary.main",
              boxSizing: "border-box",
              cursor: "move",
            }}
          >
            <Box
              data-testid="logo-cut-handle"
              onPointerDown={onPointerDownHandle}
              sx={{
                position: "absolute",
                right: -6,
                bottom: -6,
                width: 12,
                height: 12,
                borderRadius: "2px",
                backgroundColor: "primary.main",
                cursor: "nwse-resize",
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
