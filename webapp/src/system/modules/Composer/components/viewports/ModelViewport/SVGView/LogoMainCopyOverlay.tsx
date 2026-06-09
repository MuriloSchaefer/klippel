import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import { useVariationActions } from "../../../../hooks/useVariationActions";
import type { DocumentNode, LogoMainCopy, LogoNode } from "../../../../typings";

// Select a logo in the Logos accordion by focusing its row (id === node.id).
// The row's `:focus` styling is the selection indicator. Expands the containing
// accordion first if it's collapsed so the highlighted row is actually visible.
const focusLogoRow = (nodeId: string) => {
  const row = document.getElementById(nodeId);
  if (!row) return;
  const summary = row
    .closest(".MuiAccordion-root")
    ?.querySelector<HTMLElement>(".MuiAccordionSummary-root");
  if (summary && summary.getAttribute("aria-expanded") === "false") {
    summary.click();
  }
  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: "nearest" });
};

type LiveDrag = {
  nodeId: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  orig: LogoMainCopy;
  aspect: number;
  rect: LogoMainCopy;
};

/**
 * Renders each logo's "main copy" as a draggable / resizable overlay box on top
 * of the SVG editor (DOM layer — screen/editor-pixel space, does not zoom with
 * the drawing). Move + aspect-locked resize only; no rotation. The committed
 * in-content placements are handled separately by the svgtoolbox.
 */
function LogoMainCopyOverlay({
  variationId,
}: Readonly<{ variationId: string }>) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const { actions } = useVariationActions({ variationId });

  const logos = useAppSelector((s: any): LogoNode[] => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return [];
    return (Object.values(nodes) as any[]).filter(
      (n): n is LogoNode => n.type === "LOGO" && !!n.mainCopy,
    );
  }, shallowEqual);

  const docs = useAppSelector((s: any): Record<string, DocumentNode> => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return {};
    const out: Record<string, DocumentNode> = {};
    for (const n of Object.values(nodes) as any[]) {
      if (n.type === "DOCUMENT") out[n.documentId] = n;
    }
    return out;
  }, shallowEqual);

  const [drag, setDrag] = useState<LiveDrag | null>(null);
  const aspectRef = useRef<Record<string, number>>({});

  // Map every in-content placement element id → its owning logo node id, so a
  // click on a placement <use> (or its clip wrapper) can select the logo's row
  // in the accordion. Covers all logos, not just those with a main copy.
  const allLogos = useAppSelector((s: any): LogoNode[] => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return [];
    return (Object.values(nodes) as any[]).filter(
      (n): n is LogoNode => n.type === "LOGO",
    );
  }, shallowEqual);

  const placementRowMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const logo of allLogos) {
      for (const p of logo.placements ?? []) {
        map[`logo-${logo.logoId}-${p.placementId}`] = logo.id;
        map[`logo-clipwrap-${logo.logoId}-${p.placementId}`] = logo.id;
      }
    }
    return map;
  }, [allLogos]);

  // Delegated click-to-select for placements: they live inside the editor SVG
  // (not this DOM overlay), so listen on #svg-editor and walk up from the target
  // to the first element whose id maps to a logo.
  useEffect(() => {
    const svg = document.getElementById("svg-editor");
    if (!svg) return;
    const onPointerDown = (e: PointerEvent) => {
      let el = e.target as Element | null;
      while (el && el !== svg) {
        const owner = el.id ? placementRowMap[el.id] : undefined;
        if (owner) {
          focusLogoRow(owner);
          return;
        }
        el = el.parentElement;
      }
    };
    svg.addEventListener("pointerdown", onPointerDown);
    return () => svg.removeEventListener("pointerdown", onPointerDown);
  }, [placementRowMap]);

  const srcFor = (logo: LogoNode): string | undefined => {
    const doc = docs[logo.source.documentId];
    if (!doc) return undefined;
    return `data:${doc.mime};base64,${doc.data}`;
  };

  const aspectFor = (logo: LogoNode): number =>
    aspectRef.current[logo.id] ??
    (logo.mainCopy!.width / logo.mainCopy!.height || 1);

  const onPointerDown = (
    e: React.PointerEvent,
    logo: LogoNode,
    mode: "move" | "resize",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    focusLogoRow(logo.id);
    setDrag({
      nodeId: logo.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: logo.mainCopy!,
      aspect: aspectFor(logo),
      rect: logo.mainCopy!,
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    let rect: LogoMainCopy;
    if (drag.mode === "move") {
      rect = { ...drag.orig, x: drag.orig.x + dx, y: drag.orig.y + dy };
    } else {
      const width = Math.max(24, drag.orig.width + dx);
      rect = { ...drag.orig, width, height: Math.max(24, width / drag.aspect) };
    }
    setDrag({ ...drag, rect });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag) {
      actions.updateLogoMainCopy(drag.nodeId, drag.rect);
      setDrag(null);
    }
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  if (logos.length === 0) return null;

  return (
    <>
      {logos.map((logo) => {
        const rect =
          drag && drag.nodeId === logo.id ? drag.rect : logo.mainCopy!;
        const src = srcFor(logo);
        return (
          <Box
            key={logo.id}
            data-testid="logo-main-copy"
            data-logo-label={logo.label}
            onPointerDown={(e) => onPointerDown(e, logo, "move")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            sx={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              border: "1px dashed",
              borderColor: "primary.main",
              boxSizing: "border-box",
              cursor: "move",
              touchAction: "none",
              zIndex: 5,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {src ? (
              <img
                src={src}
                alt={logo.label}
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const a =
                    (img.naturalWidth || 1) / (img.naturalHeight || 1) || 1;
                  aspectRef.current[logo.id] = a;
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            ) : null}
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                top: -18,
                left: 0,
                whiteSpace: "nowrap",
                color: "primary.main",
              }}
            >
              {logo.label}
            </Typography>
            {/* resize handle (aspect-locked) */}
            <Box
              data-testid="logo-main-copy-handle"
              onPointerDown={(e) => onPointerDown(e, logo, "resize")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
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
        );
      })}
    </>
  );
}

export default React.memo(LogoMainCopyOverlay);
