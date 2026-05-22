import React from "react";
import { Box, List, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import AddProcessButton from "./AddProcessButton";
import ProcessItem from "./ProcessItem";

function ProcessListAccordion({
  variationId,
}: Readonly<{ variationId: string; parentId: string }>) {
  const storeModule = useModule<Store>("Store");
  const theme = useTheme();
  const { useAppSelector } = storeModule.hooks;

  const processNodeIds = useAppSelector(
    (s: any): string[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[])
        .filter((n) => n.type === "PROCESS")
        .map((n) => n.id as string);
    },
    shallowEqual,
  );

  return (
    <Box data-testid="process-list">
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddProcessButton variationId={variationId} />
      </Box>
      {processNodeIds.length === 0 ? (
        <>Nenhum processo adicionado</>
      ) : (
        <List
          sx={{
            "& > div:nth-of-type(2n+1)": {
              borderBottom: "1px solid rgba(0,0,0,0.5)",
              backgroundColor: theme.palette.action.hover,
            },
            "& > div:last-child": {
              borderBottom: undefined,
            },
          }}
        >
          {processNodeIds.map((id) => (
            <ProcessItem
              key={id}
              variationId={variationId}
              nodeId={id}
            />
          ))}
        </List>
      )}
    </Box>
  );
}

export default React.memo(ProcessListAccordion);
