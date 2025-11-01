import _ from "lodash";
import { useCallback, useLayoutEffect, useState } from "react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import { styled } from "@mui/system";

import useModule from "@kernel/hooks/useModule";
import type { SystemModalProps } from "@kernel/modules/Layout/components/SystemModal";

import { IMarkdownModule } from "@kernel/modules/Markdown";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { Model } from "../../typings";
import useModelsManager from "../../hooks/useModelsManager";
import useModelsList from "../../hooks/useModelsList";
import ModelPreview from "./ModelPreview";
import { ISVGModule } from "@kernel/modules/SVG";
import { Input } from "@mui/material";

type ModelSelectionModalProps = SystemModalProps & {
  onModelSelection: (model: Model) => void;
};

const StyledModal = styled(Box)`
  display: flex;
  flex-direction: row;
  max-height: 85vh;

  @media (orientation: portrait) {
    flex-direction: column;
  }
`;

const StyledList = styled(List)`
  overflow: auto;
  display: block;
  width: min-content;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;

  @media (orientation: portrait) {
    height: 200px;
    flex-wrap: wrap;
    width: 100%;
    gap: 0px 16px;
  }
`;

const ModelSelectionModal = ({
  closeModal,
  onModelSelection,
}: ModelSelectionModalProps) => {
  const markdownModule = useModule<IMarkdownModule>("Markdown");

  const {
    hooks: { useSVGManager },
  } = useModule<ISVGModule>("SVG");
  const svgManager = useSVGManager()

  const {
    components: { MarkdownReader },
  } = markdownModule;

  const modelsManager = useModelsManager()

  useLayoutEffect(()=>{
    modelsManager.listModels()
  }, [])

  const models: Model[] = useModelsList(); // modelsManager.listModels()

  const [selectedOption, setSelectedOption] = useState<Model | undefined>(
    undefined
  );

  const selectOption = useCallback((model: Model)=>{
    if (model.svg){
      svgManager.functions.loadSVG(model.svg, model.id)
    }
    setSelectedOption(model)
  }, [svgManager.functions, setSelectedOption])

  return (
    <Paper
      elevation={6}
      id="open-model-modal"
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        bgcolor: "background.paper",
        width: "85vw",
        overflow: "hidden",
        maxHeight: "85vh",
        minHeight: "50vh",

        p: 2,
      }}
    >
      <StyledModal
        role="model-selector-container"
        sx={{ gap: 1, display: "flex" }}
      >
        <StyledList
          role="list-options"
          sx={{
            gap: 1,
            width: "30%",
            border: '1px solid rgba(0,0,0,0.5)',
            p:5
          }}
        >
          <Input />
          {/* <Input endAdornment={<SearchSharp />}/> */}
          {models.map((m) => (
            <ListItem
              key={_.uniqueId()}
              disableGutters
              sx={{ width: "fit-content" }}
            >
              <ListItemText
                primary={<Box sx={{}}>{m.name}</Box>}
                secondary={m.id}
                id={m.name}
                color={
                  selectedOption?.name === m.name ? "primary" : "secondary"
                }
                onClick={() => selectOption(m)}
                sx={{
                  cursor: "pointer",
                }}
              />
            </ListItem>
          ))}
        </StyledList>

        <Box sx={{ overflow: "auto", width: "100%", display: 'flex', gap:2 }}>
          {selectedOption ? (
            <ModelPreview
              model={selectedOption}
              sx={{
                width: '50%',
                p: 1,
                border: '1px solid rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            <Box
              sx={{
                p: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span>Selecione um modelo</span>
            </Box>
          )}
          {selectedOption?.description && (
            <Box
              role="model-description"
              sx={{
                flexGrow: 1,
                p: 1,
                gridArea: "description",
                overflowY: "auto",
                height: "min-content",
                border: '1px solid rgba(0,0,0,0.5)',
              }}
            >
              <MarkdownReader path={selectedOption.description} />
            </Box>
          )}
        </Box>
        <Box
          role="actions"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            // width: 'min-content',
            flexDirection: "row-reverse",
          }}
        >
          <Button
            disabled={!selectedOption}
            variant="contained"
            onClick={() => {
              if (!selectedOption) return;
              onModelSelection(selectedOption);
              closeModal?.();
            }}
          >
            Selecionar
          </Button>
        </Box>
      </StyledModal>
    </Paper>
  );
};

export default ModelSelectionModal;
