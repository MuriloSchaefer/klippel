import _ from "lodash";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import {
  CONFIRM_MODEL_SELECTION_SHORTCUT_ID,
  MODEL_SELECTION_MODAL_CONTEXT_ID,
} from "../../constants";

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

  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutProvider, ShortcutHint } = keyboardShortcutsModule.components;

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
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const acceptInputRef = useRef(false);
  // Mirror of acceptInputRef as state, so the input can expose its readiness
  // via `data-accepts-input` for tests / drivers to wait on.
  const [acceptsInput, setAcceptsInput] = useState(false);

  const selectOption = useCallback((model: Model)=>{
    if (model.svg){
      svgManager.functions.loadSVG(model.svg, model.id)
    }
    setSelectedOption(model)
  }, [svgManager.functions, setSelectedOption])

  const confirmSelection = useCallback(() => {
    if (!selectedOption) return;
    onModelSelection(selectedOption);
    closeModal?.();
  }, [selectedOption, onModelSelection, closeModal]);

  const filteredModels = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return models;
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.id ?? "").toLowerCase().includes(term),
    );
  }, [models, search]);

  useEffect(() => {
    // Autofocus the search field on mount so users can type immediately.
    // The trigger key (e.g. "w") may still be in flight when the modal mounts;
    // ignore any input events until the originating keystroke has settled,
    // then clear whatever leaked through and start accepting real input.
    const id = window.setTimeout(() => {
      searchInputRef.current?.focus();
      setSearch("");
      acceptInputRef.current = true;
      setAcceptsInput(true);
    }, 50);
    return () => window.clearTimeout(id);
  }, []);

  const moveSelection = useCallback(
    (delta: 1 | -1) => {
      if (filteredModels.length === 0) return;
      const currentIndex = selectedOption
        ? filteredModels.findIndex((m) => m.name === selectedOption.name)
        : -1;
      const nextIndex =
        currentIndex === -1
          ? delta === 1
            ? 0
            : filteredModels.length - 1
          : (currentIndex + delta + filteredModels.length) % filteredModels.length;
      selectOption(filteredModels[nextIndex]);
    },
    [filteredModels, selectedOption, selectOption],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
      }
    },
    [moveSelection],
  );

  return (
    <ShortcutProvider contextId={MODEL_SELECTION_MODAL_CONTEXT_ID}>
    <Paper
      elevation={6}
      id="open-model-modal"
      onKeyDown={handleKeyDown}
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
          <Input
            id="open-model-search"
            inputRef={searchInputRef}
            placeholder="Buscar modelo..."
            value={search}
            onChange={(e) => {
              if (!acceptInputRef.current) return;
              setSearch(e.target.value);
            }}
            inputProps={{ 'data-accepts-input': acceptsInput ? 'true' : 'false' }}
            autoFocus
          />
          {/* <Input endAdornment={<SearchSharp />}/> */}
          {filteredModels.map((m) => {
            const isSelected = selectedOption?.name === m.name;
            return (
              <ListItem
                key={_.uniqueId()}
                disableGutters
                aria-selected={isSelected}
                sx={{
                  width: "fit-content",
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'transparent',
                  borderRadius: 1,
                  px: 1,
                }}
              >
                <ListItemText
                  primary={<Box sx={{}}>{m.name}</Box>}
                  secondary={m.id}
                  id={m.name}
                  color={isSelected ? "primary" : "secondary"}
                  onClick={() => selectOption(m)}
                  sx={{
                    cursor: "pointer",
                  }}
                />
              </ListItem>
            );
          })}
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
          <ShortcutHint
            shortcutId={CONFIRM_MODEL_SELECTION_SHORTCUT_ID}
            placement="bottom-right"
          >
            <Button
              disabled={!selectedOption}
              variant="contained"
              aria-label="confirm-model-selection"
              onClick={confirmSelection}
            >
              Selecionar
            </Button>
          </ShortcutHint>
        </Box>
      </StyledModal>
    </Paper>
    </ShortcutProvider>
  );
};

export default ModelSelectionModal;
