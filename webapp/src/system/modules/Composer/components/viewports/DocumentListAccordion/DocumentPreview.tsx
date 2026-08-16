import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { sanitizeSvg } from "@kernel/modules/SVG/utils/sanitizeSvg";

/**
 * Inline preview for the types worth previewing.
 *
 * Only three shapes render, and each is handled by what it can do rather than
 * by what it claims to be:
 *
 * - **SVG** is markup, and markup an attachment carries is untrusted — it may
 *   contain `<script>`, event handlers, or external references. It goes through
 *   the same `sanitizeSvg` the editor uses before it is shown, and is rendered
 *   from a sanitized `blob:` URL in an `<img>`, which does not run script even
 *   if something slipped through.
 * - **Raster images** render as an `<img>` off a `blob:` URL.
 * - **PDF** renders in a sandboxed `<iframe>`. The sandbox attribute is
 *   deliberately empty: no scripts, no same-origin, no top-level navigation.
 *
 * Everything else gets no preview. Guessing at a renderer for an arbitrary
 * binary is how you end up executing it.
 */
const isImage = (mime: string) =>
  mime.startsWith("image/") && mime !== "image/svg+xml";

export default function DocumentPreview({
  bytes,
  mime,
}: Readonly<{ bytes: ArrayBuffer; mime: string }>) {
  const [url, setUrl] = useState<string | null>(null);

  const kind = useMemo(() => {
    if (mime === "image/svg+xml") return "svg" as const;
    if (isImage(mime)) return "image" as const;
    if (mime === "application/pdf") return "pdf" as const;
    return "none" as const;
  }, [mime]);

  useEffect(() => {
    if (kind === "none") {
      setUrl(null);
      return;
    }
    let blob: Blob;
    if (kind === "svg") {
      const markup = new TextDecoder().decode(bytes);
      blob = new Blob([sanitizeSvg(markup)], { type: "image/svg+xml" });
    } else {
      blob = new Blob([bytes], { type: mime });
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    // Revoking on unmount matters here: these are whole files, and a leaked
    // object URL pins the bytes in memory for the life of the document.
    return () => URL.revokeObjectURL(next);
  }, [bytes, mime, kind]);

  if (kind === "none") {
    return (
      <Typography
        data-testid="document-preview-unavailable"
        variant="caption"
        color="text.secondary"
      >
        Sem pré-visualização para {mime}
      </Typography>
    );
  }
  if (!url) return null;

  return (
    <Box
      data-testid="document-preview"
      data-preview-kind={kind}
      sx={{ mt: 1, maxWidth: 420 }}
    >
      {kind === "pdf" ? (
        <iframe
          title="document-preview"
          src={url}
          sandbox=""
          style={{ width: "100%", height: 400, border: 0 }}
        />
      ) : (
        <img
          alt="document-preview"
          src={url}
          style={{ maxWidth: "100%", maxHeight: 320, display: "block" }}
        />
      )}
    </Box>
  );
}
