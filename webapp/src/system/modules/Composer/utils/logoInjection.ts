/**
 * Id and markup builders for the logo presentation layer.
 *
 * A logo renders through elements the editor mounts on top of the artwork: a
 * `<symbol>`/`<image>` in defs, one `<use>` container per placement, and a
 * `<clipPath>` per clipped placement. None of it lives in the stored SVG — it
 * is derived from the graph and rebuilt into `svgState.injected` every time the
 * document is mounted.
 *
 * That makes two callers: `useVariationActions` (when the user creates or edits
 * a logo) and `useVariationRehydration` (when a saved variation is opened).
 * They must agree on every id, because the ids are the join between them — a
 * placement `<use href="#logo-sym-…">` written by one and a symbol id written
 * by the other. Keeping the builders here is what makes that agreement
 * structural instead of a convention two files happen to share.
 */
import type { LogoPlacement, LogoSource } from "../typings";
import type { UnitValue } from "@system/modules/Converter/typings";

export const logoSymbolId = (logoId: string) => `logo-sym-${logoId}`;

export const logoContainerId = (logoId: string, placementId: string) =>
  `logo-${logoId}-${placementId}`;

// Outer, untransformed wrapper that carries the clip-path. The clip is kept off
// the transformed container because a `clipPathUnits="userSpaceOnUse"` clip is
// resolved in the element's *post-transform* user space — so a clip on the
// transformed <use> would push the (root-space) target geometry through the
// placement transform and miss the logo entirely (the logo would vanish).
export const logoClipWrapId = (logoId: string, placementId: string) =>
  `logo-clipwrap-${logoId}-${placementId}`;

export const logoClipId = (placementId: string) => `logo-clip-${placementId}`;

export const decodeBase64 = (data: string): string => {
  try {
    if (typeof atob !== "undefined") return atob(data);
    return Buffer.from(data, "base64").toString("binary");
  } catch {
    return "";
  }
};

// Proxy transform string. Rotation pivot (cx,cy) is appended by the manipulation
// handles once a bbox is known; the initial form is enough to place the element.
export const buildLogoTransform = (t: LogoPlacement["transform"]): string =>
  `translate(${t.x},${t.y}) rotate(${t.rotation}) scale(${t.scale})`;

// defs markup for the logo source: the decoded (already-sanitized) SVG for svg
// sources, or an <image> with a data-URL href for rasters. id is (re)applied at
// mount by the editor, but set here too for clarity.
export const sourceDefsMarkup = (
  logoId: string,
  source: LogoSource,
  doc: { mime: string; data: string },
  size?: { width: UnitValue; height: UnitValue },
): string => {
  const id = logoSymbolId(logoId);
  if (source.kind === "raster") {
    // <image> needs explicit width/height to render; seed from the logo's
    // physical size (user units). The placement transform scales from there.
    const w = size?.width.amount || 100;
    const h = size?.height.amount || 100;
    return `<image id="${id}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:${doc.mime};base64,${doc.data}" />`;
  }
  const decoded = decodeBase64(doc.data);
  return decoded || `<g id="${id}"></g>`;
};

export const placementContainerMarkup = (
  logoId: string,
  placementId: string,
): string => {
  const ref = logoSymbolId(logoId);
  const wrapId = logoClipWrapId(logoId, placementId);
  const id = logoContainerId(logoId, placementId);
  // Outer <g> (wrapId) holds the clip-path and stays untransformed; the inner
  // <use> (id) carries the placement transform. The editor stamps the fragment
  // root (the <g>) with the injection id, so wrapId is the injection key.
  return `<g id="${wrapId}"><use id="${id}" href="#${ref}" xlink:href="#${ref}" /></g>`;
};

export const clipPathMarkup = (
  placementId: string,
  clipTargetId: string,
): string =>
  `<clipPath id="${logoClipId(placementId)}" clipPathUnits="userSpaceOnUse"><use href="#${clipTargetId}" xlink:href="#${clipTargetId}" /></clipPath>`;
