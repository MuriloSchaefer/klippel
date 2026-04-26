import { Box, IconButton, TextField, Typography } from "@mui/material";
import { EditSharp } from "@mui/icons-material";
import { useState } from "react";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { IPointerModule } from "@kernel/modules/Pointer";
import { IConverterModule } from "@system/modules/Converter";
import { CompoundValue } from "@system/modules/Converter/typings";
import { ProcessNode } from "../../../typings";

export default function ProcessEditButton({
  variationId,
  processNode,
}: {
  variationId: string;
  processNode: ProcessNode;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const converterModule = useModule<IConverterModule>("Converter");
  const graphModule = useModule<IGraphModule>("Graph");
  const graph = graphModule.hooks.useGraph(variationId);
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { CompoundSelector } = converterModule.components;
  // Ensure costTime and costMoney are always defined (fallback to a default CompoundValue if missing)
  const defaultCompound: CompoundValue = {
    quotient: { amount: 1, unit: "unitario18" },
    dividend: { amount: 1, unit: "minutos249" },
  };
  const defaultMoney: CompoundValue = {
    quotient: { amount: 1, unit: "reais11" },
    dividend: { amount: 1, unit: "unitario18" },
  };
  const [form, setForm] = useState({
    name: processNode.label,
    costTime: processNode.costTime ?? defaultCompound,
    costMoney: processNode.costMoney ?? defaultMoney,
  });
  return (
    <PointerContainer
      component={
        <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <TextField
            label="Nome"
            value={form.name}
            onChange={e => setForm(curr => ({ ...curr, name: e.target.value }))}
            size="small"
            sx={{ width: "100%", flexGrow: 1 }}
          />
          <Box>
            <Typography>Tempo necessário</Typography>
            <CompoundSelector
              filterDividends={(u, s) => s?.id === "temporal247"}
              filterQuotients={(u, s) => u.id === "unitario18"}
              value={form.costTime}
              onChange={v => setForm(curr => ({ ...curr, costTime: v }))}
            />
          </Box>
          <Box>
            <Typography>Dinheiro necessário (mão de obra)</Typography>
            <CompoundSelector
              filterQuotients={(u, s) => s?.id === "monetaria10"}
              filterDividends={(u, s) =>
                u.id === "unitario18" || s?.id === "temporal247"
              }
              value={form.costMoney}
              onChange={v => setForm(curr => ({ ...curr, costMoney: v }))}
            />
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          handleConfirm={() => {
            if (!processNode.id) return;
            const updatedNode = {
              ...processNode,
              label: form.name,
              costTime: form.costTime,
              costMoney: form.costMoney,
            };
            graph.actions.updateNode(updatedNode);
          }}
        />,
      ]}
    >
      <IconButton>
        <EditSharp color="info" />
      </IconButton>
    </PointerContainer>
  );
}
