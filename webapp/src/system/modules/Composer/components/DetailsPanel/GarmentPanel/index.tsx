import { useCallback, useState } from "react";

import SettingsIcon from "@mui/icons-material/Settings";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import RotateLeftSharpIcon from "@mui/icons-material/RotateLeftSharp";
import PreviewSharpIcon from "@mui/icons-material/PreviewSharp";
import ListSharpIcon from "@mui/icons-material/ListSharp";

import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { GarmentNode } from "../../../store/composition/state";
import type { IMarkdownModule } from "@kernel/modules/Markdown";

import GraduationAccordion from "./GraduationAccordion";
import MaterialsList from "../MaterialSection/MaterialsList";
import ProcessesList from "../ProcessesSection/ProcessesList";
import useComposition from "../../../hooks/useComposition";
import { CompositionInfo } from "../../../interfaces";

type PropertiesForm = {
  name: string;
  description: string;
};

export default ({
  node,
  graphId,
  selectedPart,
  compositionName,
}: CompositionInfo & {
  node: GarmentNode;
}) => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const markdownModule = useModule<IMarkdownModule>("Markdown");

  const {
    components: { MarkdownReader },
  } = markdownModule;

  const { DetailsPanel, Accordion, CustomTextArea, SystemModal } =
    layoutModule.components;

  const [propertiesForm, setPropertiesForm] = useState<PropertiesForm>({
    name: node.label ?? "Nova peça",
    description: node.description ?? "",
  });

  const composition = useComposition({compositionName}, (c) => c);

  const handleSaveProperties = useCallback(() => {
    composition.actions.changeProperties(
      propertiesForm.name,
      propertiesForm.description
    );
  }, [compositionName, propertiesForm.name, propertiesForm.description]);

  return (
    <DetailsPanel title={node.label} id="gamerment-panel" key="garment-panel">
      <Accordion
        name="Propriedades"
        icon={<SettingsIcon />}
        summary="Propriedades da peça"
        sx={{ flexGrow: 1 }}
      >
        <Paper
          variant="outlined"
          square
          sx={{
            width: "100%",
            padding: 1,
            "&:div + div": {
              borderTop: 0,
            },
            display: "flex",
            justifyContent: "space-between",
          }}
          role="garment-properties"
          id="garment-properties"
          key="garment-properties"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 1,
            }}
          >
            <TextField
              id="garment-name"
              label="Nome"
              variant="standard"
              sx={{ width: "100%" }}
              value={propertiesForm?.name}
              onChange={(v) =>
                setPropertiesForm(
                  (curr) => curr && { ...curr, name: v.target.value }
                )
              }
            />
            <CustomTextArea
              id="description"
              wrapperProps={{ sx: { width: "100%" } }}
              minRows={3}
              name="Outlined"
              placeholder="Descrição"
              color="neutral"
              value={propertiesForm.description}
              onChange={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                setPropertiesForm(
                  (curr) => curr && { ...curr, description: evt.target.value }
                );
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              padding: 0,
              gap: 1,
              justifyContent: "space-between",
              alignContent: "space-evenly",
            }}
            role="actions"
          >
            <IconButton
              color="success"
              key="save"
              id="save-properties"
              onClick={(e) => handleSaveProperties()}
            >
              <SaveSharpIcon />
            </IconButton>
            <SystemModal
              component={
                <MarkdownReader content={propertiesForm.description} />
              }
              button={
                <IconButton
                  color="warning"
                  key="preview"
                  id="preview-description"
                  // onClick={(e) => saveProperties()}
                >
                  <PreviewSharpIcon />
                </IconButton>
              }
            ></SystemModal>

            <IconButton
              color="info"
              key="reset"
              id="reset-properties"
              onClick={(e) =>
                setPropertiesForm({
                  name: node.label,
                  description: node.description,
                })
              }
            >
              <RotateLeftSharpIcon />
            </IconButton>
          </Box>
        </Paper>
      </Accordion>
      <GraduationAccordion
        graphId={graphId}
        compositionName={compositionName}
        selectedPart={selectedPart}
      />
      <Accordion
        name="Materiais"
        icon={<ListSharpIcon />}
        summary="Lista de materiais"
        sx={{ flexGrow: 1 }}
      >
        <MaterialsList
          graphId={graphId}
          selectedPart={selectedPart}
          compositionName={compositionName}
        />
      </Accordion>
      <Accordion
        name="Processos"
        icon={<ListSharpIcon />}
        summary="Lista de processos"
        sx={{ flexGrow: 1 }}
      >
        <ProcessesList
          graphId={graphId}
          selectedPart={selectedPart}
          compositionName={compositionName}
        />
      </Accordion>
    </DetailsPanel>
  );
};
