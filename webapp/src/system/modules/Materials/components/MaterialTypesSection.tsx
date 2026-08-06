import React, { useCallback, useState } from "react";
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
import AddSharpIcon from "@mui/icons-material/AddSharp";
import CategorySharpIcon from "@mui/icons-material/CategorySharp";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IConverterModule } from "@system/modules/Converter";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { MODULE_NAME } from "../constants";
import { registerMaterialTypeVersion } from "../store/materials/actions";
import type { MaterialTypeSchema } from "../store/materialTypes/state";
import useMaterialTypes from "../hooks/useMaterialTypes";

/**
 * Allowed declared attribute types. Mirrors `AttributeTypes` from
 * `materialTypes/state.ts` with the two compound shapes the existing
 * fixtures use (`unitValue`, `compoundValue`). `SchemaDrivenFields`
 * renders one input per kind.
 */
const ATTRIBUTE_TYPE_OPTIONS = [
  "string",
  "number",
  "color",
  "date",
  "unitValue",
  "compoundValue",
  "object",
] as const;
type AttrTypeOption = (typeof ATTRIBUTE_TYPE_OPTIONS)[number];

interface AttrRow {
  /** Local key — stable across re-renders even before the user types
   *  a name, so removing one row doesn't reorder the others. */
  rowId: string;
  name: string;
  kind: AttrTypeOption;
}

let attrRowSeq = 0;
const newRow = (): AttrRow => ({
  rowId: `attr-row-${++attrRowSeq}`,
  name: "",
  kind: "string",
});

/**
 * Ribbon entry point for registering a new `MaterialType` schema
 * version. Submitting dispatches `registerMaterialTypeVersion`, which
 * the materials middleware persists through the Jazz IPC surface.
 *
 * Authoring scope: type name, version, the two selector keys, and
 * the list of attributes (name + kind). Attribute kinds drive the
 * inputs the Add-material form renders for materials of this type.
 */
const MaterialTypesSection: React.FC = () => {
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

  const [name, setName] = useState("");
  const [version, setVersion] = useState("0.0.1");
  const [principal, setPrincipal] = useState("nome");
  const [extra, setExtra] = useState("cor");
  const [stockUnit, setStockUnit] = useState("");
  const [consumptionUnit, setConsumptionUnit] = useState("");
  const [attrs, setAttrs] = useState<AttrRow[]>([
    { rowId: "attr-row-default-1", name: "nome", kind: "string" },
  ]);

  const reset = useCallback(() => {
    setName("");
    setVersion("0.0.1");
    setPrincipal("nome");
    setExtra("cor");
    setStockUnit("");
    setConsumptionUnit("");
    setAttrs([{ rowId: "attr-row-default-1", name: "nome", kind: "string" }]);
  }, []);

  const updateAttr = useCallback(
    (rowId: string, patch: Partial<Omit<AttrRow, "rowId">>) => {
      setAttrs((prev) =>
        prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const removeAttr = useCallback((rowId: string) => {
    setAttrs((prev) => prev.filter((row) => row.rowId !== rowId));
  }, []);

  const addAttr = useCallback(() => {
    setAttrs((prev) => [...prev, newRow()]);
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Deduplicate by attribute name (last-write-wins) and drop empty
    // rows so an unfilled draft row never poisons the schema.
    const attributes: { [k: string]: string } = {};
    for (const row of attrs) {
      const key = row.name.trim();
      if (!key) continue;
      attributes[key] = row.kind;
    }

    const schema: MaterialTypeSchema = {
      version,
      attributes,
      selector: { principal, extra },
      stockUnit: stockUnit || undefined,
      consumptionUnit: consumptionUnit || undefined,
    };
    const predecessor = materialTypes?.[trimmed]?.latestSchema;
    dispatch(
      registerMaterialTypeVersion({
        name: trimmed,
        version,
        schemaJson: JSON.stringify(schema),
        predecessorId: predecessor ? `${trimmed}@${predecessor}` : undefined,
      }),
    );
    reset();
  }, [
    dispatch,
    name,
    version,
    principal,
    extra,
    stockUnit,
    consumptionUnit,
    attrs,
    materialTypes,
    reset,
  ]);

  return (
    <PointerContainer
      onClose={reset}
      component={
        <Box
          data-testid="add-material-type-form"
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
              data-testid="add-material-type-name"
              label="Nome do tipo (ex. malha)"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </FormControl>
          <FormControl fullWidth size="small">
            <TextField
              data-testid="add-material-type-version"
              label="Versão (ex. 0.0.1)"
              size="small"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </FormControl>
          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <TextField
                data-testid="add-material-type-principal"
                label="Atributo principal"
                size="small"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <TextField
                data-testid="add-material-type-extra"
                label="Atributo extra"
                size="small"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </FormControl>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" sx={{ minWidth: 110 }}>
              Unidade de estoque
            </Typography>
            <UnitSelector
              data-testid="add-material-type-stock-unit"
              value={stockUnit}
              onChange={(e) => setStockUnit(String(e.target.value))}
            />
          </Box>
          {/*
            Target unit for usage calculations. Left blank, Composer
            converts consumption into the stock unit — the behaviour
            that predates this field.
          */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" sx={{ minWidth: 110 }}>
              Unidade de consumo
            </Typography>
            <UnitSelector
              data-testid="add-material-type-consumption-unit"
              value={consumptionUnit}
              onChange={(e) => setConsumptionUnit(String(e.target.value))}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Em branco: usa a unidade de estoque.
          </Typography>

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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Atributos
              </Typography>
              <Tooltip title="Adicionar atributo">
                <IconButton
                  data-testid="add-material-type-attr-add"
                  aria-label="add-attribute"
                  size="small"
                  onClick={addAttr}
                >
                  <AddSharpIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {attrs.map((row, idx) => (
              <Box
                key={row.rowId}
                sx={{ display: "flex", gap: 1, alignItems: "center" }}
              >
                <FormControl size="small" sx={{ flex: 1.4 }}>
                  <TextField
                    data-testid={`add-material-type-attr-name-${idx}`}
                    label="Nome"
                    size="small"
                    value={row.name}
                    onChange={(e) =>
                      updateAttr(row.rowId, { name: e.target.value })
                    }
                  />
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel id={`add-material-type-attr-kind-label-${idx}`}>
                    Tipo
                  </InputLabel>
                  <Select
                    labelId={`add-material-type-attr-kind-label-${idx}`}
                    data-testid={`add-material-type-attr-kind-${idx}`}
                    label="Tipo"
                    value={row.kind}
                    onChange={(e) =>
                      updateAttr(row.rowId, {
                        kind: String(e.target.value) as AttrTypeOption,
                      })
                    }
                  >
                    {ATTRIBUTE_TYPE_OPTIONS.map((k) => (
                      <MenuItem key={k} value={k}>
                        {k}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Tooltip title="Remover">
                  <span>
                    <IconButton
                      data-testid={`add-material-type-attr-remove-${idx}`}
                      aria-label="remove-attribute"
                      size="small"
                      onClick={() => removeAttr(row.rowId)}
                      disabled={attrs.length <= 1}
                    >
                      <DeleteSharpIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            ))}
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="add-material-type-confirm"
          disabled={!name.trim() || !version.trim()}
          handleConfirm={handleConfirm}
        >
          Salvar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Tooltip title="Novo tipo de material">
        <IconButton
          id="open-add-material-type"
          data-testid="open-add-material-type"
          aria-label="add-material-type"
          color="primary"
        >
          <ShortcutHint
            shortcutId={`${MODULE_NAME}/TiposDeMateriais/addType`}
            placement="bottom-center"
          >
            <CategorySharpIcon />
          </ShortcutHint>
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
};

export default MaterialTypesSection;
