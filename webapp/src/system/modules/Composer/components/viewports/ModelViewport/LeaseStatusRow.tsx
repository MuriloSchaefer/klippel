import React from "react";
import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { ComposerModuleState } from "../../../typings";
import useEditLease from "../../../hooks/useEditLease";
import SaveModelButton from "./SaveModelButton";
import LeaseBanner from "./LeaseBanner";
import { Box } from "@mui/material";

const LeaseStatusRow = React.memo(function LeaseStatusRow({
  variationId,
}: {
  variationId: string;
}) {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ViewportNotificationsTray } = layoutModule.components;

  const variationStateId = storeModule.hooks.useAppSelector(
    (s: { Composer: ComposerModuleState }) => s.Composer?.variations?.[variationId]?.id,
  );
  const leaseStatus = useEditLease(variationStateId);

  return (
    <Box sx={{position:'relative'}}>
        <SaveModelButton
          variationId={variationId}
          disabled={leaseStatus.kind === "held_by_other"}
        />
      <LeaseBanner status={leaseStatus} />
    </Box>
  );
});

export default LeaseStatusRow;
