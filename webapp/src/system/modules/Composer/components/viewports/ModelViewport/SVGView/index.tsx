import React from "react";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { ComposerModuleState } from "../../../../typings";
import SVGEmptyState from "./SVGEmptyState";
import SVGModelViewport from "./SVGModelViewport";

export default function SVGView({
  variationId,
}: Readonly<{ variationId: string }>) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const hasSvg = useAppSelector(
    (s: { Composer: ComposerModuleState }) => !!s.Composer?.variations?.[variationId]?.svg,
  );

  if (!hasSvg) {
    return <SVGEmptyState variationId={variationId} />;
  }

  return <SVGModelViewport variationId={variationId} />;
}
