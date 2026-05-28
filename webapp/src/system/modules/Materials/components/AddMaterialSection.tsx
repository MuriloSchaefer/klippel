import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddBoxSharpIcon from "@mui/icons-material/AddBoxSharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IConverterModule } from "@system/modules/Converter";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { MODULE_NAME } from "../constants";
import useMaterialTypes from "../hooks/useMaterialTypes";
import { addMaterial } from "../store/materials/actions";
import { encodeAttributeMap } from "../store/materials/catalogAdapter";
import SchemaDrivenFields from "./MaterialForm/SchemaDrivenFields";

/**
 * Ribbon entry point for adding a new `Material`. Identity block
 * (id, type, stock) sits above the schema-driven block, which renders
 * one input per attribute declared in the chosen type's latest
 * schema. Switching `type` rebuilds the schema-driven block and
 * resets attribute state — this mirrors the Phase 3
 * `MaterialFormContainer` decision tree at a smaller scope.
 */
const AddMaterialSection: React.FC = () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const storeModule = useModule<Store>("Store");
  const converterModule = useModule<IConverterModule>("Converter");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { UnitSelector } = converterModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const dispatch = storeModule.hooks.useAppDispatch();

  const materialTypes = useMaterialTypes();
  const typeOptions = useMemo(
    () => Object.values(materialTypes ?? {}),
    [materialTypes],
  );

  const [id, setId] = useState("");
  const [type, setType] = useState<string>("");
  const [stockAmount, setStockAmount] = useState<string>("0");
  const [stockUnit, setStockUnit] = useState("");
  const [industry, setIndustry] = useState("");
  const [externalId, setExternalId] = useState("");
  const [attrValues, setAttrValues] = useState<Record<string, unknown>>({});

  const selectedSchema = useMemo(() => {
    const t = materialTypes?.[type];
    if (!t) return undefined;
    return t.schemas?.[t.latestSchema];
  }, [materialTypes, type]);

  // Reset attribute values whenever the type changes — old values
  // belong to the previous schema and would lie about provenance if
  // carried over. Also seed the stock unit from the type's declared
  // `stockUnit`, since the type is the source of truth for how this
  // material's stock is measured.
  useEffect(() => {
    setAttrValues({});
    if (selectedSchema?.stockUnit) {
      setStockUnit(selectedSchema.stockUnit);
    }
  }, [type, selectedSchema]);

  const reset = useCallback(() => {
    setId("");
    setType("");
    setStockAmount("0");
    setStockUnit("");
    setIndustry("");
    setExternalId("");
    setAttrValues({});
  }, []);

  const handleAttrChange = useCallback((name: string, value: unknown) => {
    setAttrValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmedId = id.trim();
    const trimmedType = type.trim();
    if (!trimmedId || !trimmedType) return;
    const matType = materialTypes?.[trimmedType];
    const version = matType?.latestSchema ?? "0.0.1";
    dispatch(
      addMaterial({
        material: {
          id: trimmedId,
          type: trimmedType,
          attributes: encodeAttributeMap(attrValues),
          stock: {
            amount: Number(stockAmount) || 0,
            unit: stockUnit || "",
          },
          schemaVersion: version,
          updatedAt: Date.now(),
          position: { x: 0, y: 0 },
          externalId: externalId.trim() || undefined,
        },
        industryId: industry.trim() || undefined,
        sellerIds: [],
        typeVersion: `${trimmedType}@${version}`,
      }),
    );
    reset();
  }, [
    dispatch,
    id,
    type,
    stockAmount,
    stockUnit,
    industry,
    externalId,
    attrValues,
    materialTypes,
    reset,
  ]);

  return (
    <PointerContainer
      onClose={reset}
      component={
        <Box
          data-testid="add-material-form"
          sx={{
            minWidth: 420,
            maxHeight: "70vh",
            overflowY: "auto",
            padding: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <FormControl fullWidth size="small">
            <TextField
              data-testid="add-material-id"
              label="ID (slug único)"
              size="small"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoFocus
            />
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="add-material-type-label">Tipo</InputLabel>
            <Select
              labelId="add-material-type-label"
              data-testid="add-material-type"
              label="Tipo"
              value={type}
              onChange={(e) => setType(String(e.target.value))}
            >
              {typeOptions.map((t) => (
                <MenuItem key={t.name} value={t.name}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" sx={{ minWidth: 80 }}>
              Estoque
            </Typography>
            <FormControl size="small" sx={{ flex: 1 }}>
              <TextField
                data-testid="add-material-stock-amount"
                label="Quantidade"
                size="small"
                type="number"
                value={stockAmount}
                onChange={(e) => setStockAmount(e.target.value)}
              />
            </FormControl>
            {/*
              Stock unit is owned by the type schema — the user can't
              flip it per-material, since mixing units inside one
              catalog row would break aggregation in the SummaryBar.
              The selector still renders so the user sees which unit
              applies, but it's disabled.
            */}
            <UnitSelector
              data-testid="add-material-stock-unit"
              value={stockUnit}
              disabled
            />
          </Box>

          <FormControl fullWidth size="small">
            <TextField
              data-testid="add-material-industry"
              label="Indústria (opcional)"
              size="small"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth size="small">
            <TextField
              data-testid="add-material-external-id"
              label="ID externo (do fornecedor)"
              size="small"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              helperText="Usado pelo Composer para agrupar variações (cores/tamanhos) do mesmo produto."
            />
          </FormControl>

          {type && (
            <Box
              sx={{
                mt: 1,
                pt: 1,
                borderTop: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Atributos do tipo
              </Typography>
              <SchemaDrivenFields
                attributes={selectedSchema?.attributes ?? {}}
                values={attrValues}
                onChange={handleAttrChange}
              />
            </Box>
          )}
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="add-material-confirm"
          disabled={!id.trim() || !type.trim()}
          handleConfirm={handleConfirm}
        >
          Adicionar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Tooltip title="Novo material">
        <IconButton
          id="open-add-material"
          data-testid="open-add-material"
          aria-label="add-material"
          color="primary"
        >
          <ShortcutHint
            shortcutId={`${MODULE_NAME}/Estoque/addMaterial`}
            placement="bottom-center"
          >
            <AddBoxSharpIcon />
          </ShortcutHint>
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
};

export default AddMaterialSection;
