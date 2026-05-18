import DOMPurify from "dompurify";

/**
 * Sanitize untrusted SVG markup before it enters Redux / the DOM.
 *
 * Rationale: SVGs can carry `<script>`, `onload=`-style handlers, and
 * `<foreignObject>` payloads. They reach Klippel from two paths: user
 * uploads (`uploadSVG`) and Jazz-synced workspaces (`jazz.loadModelSvg`).
 * Both are considered untrusted — the renderer must scrub them before
 * mounting. This is the single chokepoint upstream of the SVG slice.
 *
 * `<use>` allow: DOMPurify's svg profile strips `<use>` by default because
 * `xlink:href` to an external document can pull in scripted SVG content.
 * Inkscape catalog files we ship rely on `<use xlink:href="#…">` to
 * instantiate label patterns, so we re-add `<use>` and its href attrs and
 * enforce same-document refs (must start with `#`) in an
 * `uponSanitizeAttribute` hook — external / `javascript:` / `data:` refs
 * are stripped.
 */

let hookInstalled = false;

function installSameDocumentUseHook() {
  if (hookInstalled) return;
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (!node || (node as Element).tagName?.toLowerCase() !== "use") return;
    const name = data.attrName;
    if (name !== "href" && name !== "xlink:href") return;
    const v = data.attrValue?.trim() ?? "";
    if (!v.startsWith("#")) {
      data.keepAttr = false;
    }
  });
  hookInstalled = true;
}

export function sanitizeSvg(input: string): string {
  if (!input) return input;
  installSameDocumentUseHook();
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"],
    ADD_ATTR: ["href", "xlink:href"],
    FORBID_TAGS: ["script", "foreignObject"],
    FORBID_ATTR: ["onload", "onclick", "onerror", "onmouseover"],
  });
}

// Test bridge: e2e tests need to exercise the *same* sanitizer the renderer
// uses, but `import('dompurify')` from a `page.evaluate` body fails because
// the renderer isn't a bare-module resolver. Exposing the function on
// `window` lets tests call the bundled implementation directly. Harmless in
// production — it's a single named property.
if (typeof globalThis !== "undefined") {
  (globalThis as unknown as { __klippelSanitizeSvg?: typeof sanitizeSvg })
    .__klippelSanitizeSvg = sanitizeSvg;
}
