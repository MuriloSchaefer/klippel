import _ from "lodash";
import { useState } from "react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import { styled } from "@mui/system";

import useModule from "@kernel/hooks/useModule";
import type { SystemModalProps } from "@kernel/modules/Layout/components/SystemModal";

import { useCompositionsList } from "../hooks/useCompositionsList";
import ModelPreview from "./ModelPreview";
import { IMarkdownModule } from "@kernel/modules/Markdown";
import { ListItem, ListItemText } from "@mui/material";

type ModelSelectionModalProps = SystemModalProps & {
  onModelSelection: (name: string, path: string) => void;
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
  display:block;
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
    components: { MarkdownReader },
  } = markdownModule;

  const compositions = useCompositionsList();
  console.log(compositions)

  const [selectedOption, setSelectedOption] = useState<
    { name: string; path: string; descriptionPath?: string } | undefined
  >(undefined);

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
      <StyledModal role="model-selector-container" sx={{ gap: 1,  display:'flex', }}>
        <StyledList
          role="list-options"
          sx={{
            gap: 1,
            width:'30%'
          }}
        >
          {compositions.map((c) => (
            <ListItem
              key={_.uniqueId()}
              disableGutters
              sx={{ width: "fit-content" }}
            >
              <ListItemText
                primary={<Box sx={{  }}>{c.name}</Box>}
                secondary={null}
                id={c.name}
                color={
                  selectedOption?.name === c.name ? "primary" : "secondary"
                }
                onClick={() =>
                  setSelectedOption({
                    name: c.name,
                    path: c.svgPath,
                    descriptionPath: c.descriptionPath,
                  })
                }
                sx={{
                  cursor: "pointer",
                }}
              />
            </ListItem>
          ))}
        </StyledList>

        <Box sx={{ overflow: "auto", width: "100%" }}>
          {selectedOption ? (
            <ModelPreview
              instanceName={selectedOption.name}
              path={selectedOption.path}
              sx={{
                gridArea: "preview",
                p: 1,
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
          {selectedOption?.descriptionPath && (
            <Box
              role="model-description"
              sx={{
                flexGrow: 1,
                p: 1,
                gridArea: "description",
                overflowY: "auto",
                height: "min-content",
              }}
            >
              <MarkdownReader path={selectedOption.descriptionPath} />
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
              onModelSelection(selectedOption.name, selectedOption.path);
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
