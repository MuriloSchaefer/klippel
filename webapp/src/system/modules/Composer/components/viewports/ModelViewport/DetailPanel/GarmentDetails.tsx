import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Box, FormControl, Input, InputLabel, Typography } from "@mui/material";
import { IGraphModule } from "@kernel/modules/Graphs";
import { debounce } from "@kernel/utils";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { useEffect, useMemo, useState } from "react";
import InfoSharpIcon from "@mui/icons-material/InfoSharp";
import {
  ELECTIVE_LIST_CONTEXT_ID,
  GRADUATION_LIST_CONTEXT_ID,
  MODULE_NAME,
  VISUALIZATION_LIST_CONTEXT_ID,
} from "../../../../constants";
import ElectiveListAccordion from "../../../viewports/ElectiveListAccordion";
import ProcessListAccordion from "../../../viewports/ProcessListAccordion";
import VisualizationListAccordion from "../../VisualizationListAccordion";
import GraduationListAccordion from "../../../viewports/GraduationListAccordion";

export default function GarmentDetails({
  variationId,
  selectedPart = "garment",
}: Readonly<{
  variationId: string;
  selectedPart: string;
}>) {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { Accordion } = layoutModule.components;

  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint, FocusShortcutProvider } = keyboardShortcutsModule.components;

  const graphModule = useModule<IGraphModule>("Graph");
  const selectedNode = graphModule.hooks.useGraph(
    variationId,
    (g) => g?.nodes[selectedPart],
  );
  const [detailsForm, setDetailsForm] = useState<{ garmentName: string }>({
    garmentName: selectedNode?.state?.label || "",
  });
  useEffect(() => {
    setDetailsForm({ garmentName: selectedNode?.state?.label || "" });
  }, [variationId, selectedPart, selectedNode?.state?.label]);
  const debouncedChange = useMemo(
    () =>
      debounce((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedNode?.state) return;

        selectedNode.actions.updateNode({
          ...selectedNode.state,
          label: e.target.value,
        });
      }, 1000),
    [selectedNode?.state?.id, variationId],
  );

  if (!selectedNode) return <>Nodo não encontrado</>;

  return (
    <Box>
      <Accordion
        name="Detalhes da Peça"
        icon={<InfoSharpIcon />}
        shortcutHint={`${MODULE_NAME}/ModelViewport/openGarmentDetails`}
        summary={
          <Typography sx={{ width: "100%" }}>
            Informações básicas da peça
          </Typography>
        }
        defaultExpanded
      >
        <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
          <InputLabel id={`label`}>Nome da Peça</InputLabel>
          <Input
            id={`garment-name`}
            value={detailsForm.garmentName}
            endAdornment={
              <ShortcutHint
                shortcutId={`${MODULE_NAME}/ModelViewport/renameGarment`}
                placement="bottom-right"
              >
                <Box
                  component="span"
                  sx={{ width: 16, height: 16, display: "inline-block" }}
                />
              </ShortcutHint>
            }
            onChange={(e) => {
              setDetailsForm((form) => ({
                ...form,
                garmentName: e.target.value,
              }));
              debouncedChange(e);
            }}
          />
        </FormControl>
      </Accordion>
      <FocusShortcutProvider contextId={GRADUATION_LIST_CONTEXT_ID}>
        <Accordion
          name="Graduações da Peça"
          icon={<OpenInFullIcon />}
          shortcutHint={`${MODULE_NAME}/GraduationList/focus`}
          summary={
            <Typography sx={{ width: "100%" }}>
              Graduações vinculadas diretamente à peça
            </Typography>
          }
        >
          <GraduationListAccordion
            variationId={variationId}
            garmentId={selectedPart}
          />
        </Accordion>
      </FocusShortcutProvider>
      <FocusShortcutProvider contextId={VISUALIZATION_LIST_CONTEXT_ID}>
        <Accordion
          name="Visualização"
          icon={undefined}
          shortcutHint={`${MODULE_NAME}/VisualizationList/focus`}
          summary="Víncule materiais com objetos na arte."
        >
          <VisualizationListAccordion
            variationId={variationId}
            garmentId={selectedPart}
          />
        </Accordion>
      </FocusShortcutProvider>
      <FocusShortcutProvider contextId={ELECTIVE_LIST_CONTEXT_ID}>
        <Accordion
          name="Eletivos da Peça"
          icon={undefined}
          shortcutHint={`${MODULE_NAME}/ElectiveList/focus`}
          summary="Cada eletivo representa uma variação opcional dentro da peça"
          defaultExpanded
        >
          <ElectiveListAccordion
            variationId={variationId}
            garmentId={selectedPart}
          />
        </Accordion>
      </FocusShortcutProvider>
      <Accordion
        name="Processos da Peça"
        icon={undefined}
        summary="Processos associados à peça (tempo e custo)"
        defaultExpanded
      >
        <ProcessListAccordion
          variationId={variationId}
          parentId={selectedPart}
        />
      </Accordion>
    </Box>
  );
}
