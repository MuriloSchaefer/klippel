import React from "react";
import useVariation from "../../../../hooks/useVariation";
import SVGEmptyState from "./SVGEmptyState";
import SVGModelViewport from "./SVGModelViewport";

export default function SVGView({
  variationId,
}: Readonly<{ variationId: string }>) {
  const variation = useVariation({ variationId });

  if (!variation.state?.svg) {
    return <SVGEmptyState variationId={variationId} />;
  }

  return <SVGModelViewport variationId={variationId} />;
}
