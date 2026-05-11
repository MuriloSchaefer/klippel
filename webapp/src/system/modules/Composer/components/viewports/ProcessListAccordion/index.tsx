import { Box, List, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import AddProcessButton from "./AddProcessButton";
import ProcessItem from "./ProcessItem";

export default function ProcessListAccordion({
  variationId,
}: Readonly<{ variationId: string; parentId: string }>) {
  const graphModule = useModule<IGraphModule>("Graph");
  const theme = useTheme();

  const processNodes = graphModule.hooks.useGraph(variationId, (g) =>
    Object.values(g?.nodes ?? {}).filter((n) => n.type === "PROCESS"),
  );

  return (
    <Box data-testid="process-list">
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddProcessButton variationId={variationId} />
      </Box>
      {!processNodes.state || processNodes.state.length === 0 ? (
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
          {processNodes.state.map((process) => (
            <ProcessItem
              key={process.id}
              variationId={variationId}
              nodeId={process.id}
            />
          ))}
        </List>
      )}
    </Box>
  );
}
