import { sanitizeSvg } from "@kernel/modules/SVG/utils/sanitizeSvg";

// Normalized crop rectangle (fractions 0..1 of the natural image / svg viewBox).
export type CropRect = { x: number; y: number; w: number; h: number };

export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

const utf8ToBase64 = (text: string): string =>
  btoa(unescape(encodeURIComponent(text)));

const base64ToUtf8 = (b64: string): string => {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    try {
      return atob(b64);
    } catch {
      return "";
    }
  }
};

const isFullFrame = (r: CropRect): boolean =>
  r.x <= 0.001 && r.y <= 0.001 && r.w >= 0.999 && r.h >= 0.999;

/**
 * Apply the crop to the stored document bytes:
 *  - raster → pixel crop via <canvas>, re-encoded as PNG.
 *  - svg → re-origin the sub-rect to [0,0] and clip-path the content to it
 *    (survives the editor's raw <use> render, which ignores the root viewBox).
 * No-op (returns the input) when the rect is the full frame.
 */
export async function applyCrop(
  file: { kind: "svg" | "raster"; data: string; mime: string },
  rect: CropRect,
): Promise<{ data: string; mime: string }> {
  if (!file.data || isFullFrame(rect)) {
    return { data: file.data, mime: file.mime };
  }
  return file.kind === "raster"
    ? cropRaster(file.data, file.mime, rect)
    : cropSvg(file.data, rect);
}

function cropRaster(
  base64: string,
  mime: string,
  rect: CropRect,
): Promise<{ data: string; mime: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const sx = Math.max(0, Math.round(rect.x * nw));
      const sy = Math.max(0, Math.round(rect.y * nh));
      const sw = Math.max(1, Math.round(rect.w * nw));
      const sh = Math.max(1, Math.round(rect.h * nh));
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ data: base64, mime });
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const url = canvas.toDataURL("image/png");
      resolve({
        data: url.includes(",") ? url.split(",")[1] : url,
        mime: "image/png",
      });
    };
    img.onerror = () => resolve({ data: base64, mime });
    img.src = `data:${mime};base64,${base64}`;
  });
}

const SVG_NS = "http://www.w3.org/2000/svg";

function cropSvg(
  base64: string,
  rect: CropRect,
): { data: string; mime: string } {
  const fallback = { data: base64, mime: "image/svg+xml" };
  const text = base64ToUtf8(base64);
  if (!text) return fallback;
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return fallback;

  // Resolve the base viewBox (synthesise one from width/height when absent).
  let vbX = 0;
  let vbY = 0;
  let vbW = 0;
  let vbH = 0;
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const parts = vb.split(/[ ,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      [vbX, vbY, vbW, vbH] = parts;
    }
  }
  if (!vbW || !vbH) {
    vbW = parseFloat(svg.getAttribute("width") || "") || 0;
    vbH = parseFloat(svg.getAttribute("height") || "") || 0;
  }
  if (!vbW || !vbH) return fallback;

  const nx = vbX + rect.x * vbW;
  const ny = vbY + rect.y * vbH;
  const nW = rect.w * vbW;
  const nH = rect.h * vbH;

  // Re-origin the crop to [0,0] and clip the content to it. A narrowed root
  // viewBox alone crops the <img> (main copy) but NOT an in-content <use>
  // placement: the editor's <use> renders the symbol's raw content and ignores
  // the root <svg> viewBox/width/height. A clip-path *does* propagate through
  // <use>, so wrapping the (re-origined) content in a clipped <g> makes the
  // crop hold in both the main copy and every placement. The clip id is also the
  // signal the manipulation handles use to box the placement to the crop rect
  // (getBBox still reports the full, unclipped geometry). See logos/svgtoolbox
  // change docs.
  const clipId = `logo-crop-${Math.random().toString(36).slice(2, 8)}`;
  const clip = doc.createElementNS(SVG_NS, "clipPath");
  clip.setAttribute("id", clipId);
  const clipRect = doc.createElementNS(SVG_NS, "rect");
  clipRect.setAttribute("x", "0");
  clipRect.setAttribute("y", "0");
  clipRect.setAttribute("width", String(nW));
  clipRect.setAttribute("height", String(nH));
  clip.appendChild(clipRect);

  const clipped = doc.createElementNS(SVG_NS, "g");
  clipped.setAttribute("clip-path", `url(#${clipId})`);
  const reorigin = doc.createElementNS(SVG_NS, "g");
  reorigin.setAttribute("transform", `translate(${-nx},${-ny})`);
  while (svg.firstChild) reorigin.appendChild(svg.firstChild);
  clipped.appendChild(reorigin);
  svg.appendChild(clip);
  svg.appendChild(clipped);

  svg.setAttribute("viewBox", `0 0 ${nW} ${nH}`);
  svg.setAttribute("width", String(nW));
  svg.setAttribute("height", String(nH));

  const serialized = new XMLSerializer().serializeToString(svg);
  return { data: utf8ToBase64(sanitizeSvg(serialized)), mime: "image/svg+xml" };
}
