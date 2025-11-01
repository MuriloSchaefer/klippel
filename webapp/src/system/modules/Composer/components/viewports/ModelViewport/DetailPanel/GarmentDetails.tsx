import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import { Box, FormControl, Input, InputLabel } from "@mui/material";
import  { IGraphModule } from "@kernel/modules/Graphs";
import { debounce } from "@kernel/utils";
import { useMemo, useState } from "react";
import InfoSharpIcon from '@mui/icons-material/InfoSharp';

export default function GarmentDetails({
  variationId,
  selectedPart = "garment",
}: {
  variationId: string;
  selectedPart: string;
}) {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ViewportNotificationsTray, SettingsPanel, Accordion, DetailsPanel } =
    layoutModule.components;

  const graphModule = useModule<IGraphModule>("Graph");
  const selectedNode = graphModule.hooks.useGraph(
    variationId,
    (g) => g?.nodes[selectedPart]
  );
  const [detailsForm, setDetailsForm] = useState<{ garmentName: string }>({
    garmentName: selectedNode?.state?.label || "",
  });
  const debouncedChange = useMemo(()=> debounce(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNode?.state) return;

      selectedNode.actions.updateNode({
        ...selectedNode.state,
        label: e.target.value,
      });
    },
    1000
  ), []);

  if (!selectedNode) return <>Nodo não encontrado</>;

  return (
    <Box>
      <Accordion
        name="Detalhes da Peça"
        icon={<InfoSharpIcon />}
        summary="Configura meta informações da peça"
        defaultExpanded
      >
        <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
          <InputLabel id={`label`}>Nome da Peça</InputLabel>
          <Input
            id={`garment-name`}
            value={detailsForm.garmentName}
            onChange={(e) =>{
              setDetailsForm((form) => ({
                ...form,
                garmentName: e.target.value,
              }))
              debouncedChange(e);
            }
            }
          />
        </FormControl>
      </Accordion>
      <Accordion
        name="Opicionais da Peça"
        icon={undefined}
        summary="Configura opicionais da peça"
        defaultExpanded
      >
        <></>
      </Accordion>
    </Box>
  );
}
