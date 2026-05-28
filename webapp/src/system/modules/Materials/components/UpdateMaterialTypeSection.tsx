import React, { useCallback, useEffect, useState } from "react";
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
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";
import EditNoteSharpIcon from "@mui/icons-material/EditNoteSharp";
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
 * Ribbon entry point for **editing** an existing `MaterialType`.
 *
 * Schema versions are immutable in the catalog (see
 * `docs/architecture/graph-semantics.md` → "Schema versioning
 * rules"), so "update" here really means "register a new version
 * derived from the current latest one". The form pre-fills from the
 * type's latest schema, bumps the version's patch component by
 * default, and on Confirm dispatches `registerMaterialTypeVersion`
 * with `predecessorId` pointing at the previous version so the
 * `succeedsVersion` edge is created.
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
  rowId: string;
  name: string;
  kind: AttrTypeOption;
}

let attrRowSeq = 0;
const rowId = () => `update-attr-row-${++attrRowSeq}`;

/**
 * Bump the patch component of an `x.y.z` semver-ish string. Falls
 * back to `0.0.1` when the input doesn't parse — we never refuse to
 * suggest a successor.
 */
function bumpPatch(version: string): string {
  const parts = version.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "0.0.1";
  parts[2] += 1;
  return parts.join(".");
}

const UpdateMaterialTypeSection: React.FC = () => {
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

  const [selectedType, setSelectedType] = useState<string>("");
  const [version, setVersion] = useState("0.0.2");
  const [principal, setPrincipal] = useState("nome");
  const [extra, setExtra] = useState("cor");
  const [stockUnit, setStockUnit] = useState("");
  const [attrs, setAttrs] = useState<AttrRow[]>([]);

  // Pre-fill from the selected type's latest schema. Re-runs whenever
  // the user picks a different type, or when the underlying catalog
  // mutates (a peer registers a new version while this modal is
  // closed — we want the next open to see the latest baseline).
  useEffect(() => {
    if (!selectedType) {
      setVersion("0.0.2");
      setPrincipal("nome");
      setExtra("cor");
      setStockUnit("");
      setAttrs([]);
      return;
    }
    const t = materialTypes?.[selectedType];
    if (!t) return;
    const latest = t.schemas?.[t.latestSchema];
    if (!latest) return;
    setVersion(bumpPatch(t.latestSchema));
    setPrincipal(latest.selector?.principal ?? "nome");
    setExtra(latest.selector?.extra ?? "cor");
    setStockUnit(latest.stockUnit ?? "");
    setAttrs(
      Object.entries(latest.attributes ?? {}).map(([name, kind]) => ({
        rowId: rowId(),
        name,
        kind: (ATTRIBUTE_TYPE_OPTIONS.includes(kind as AttrTypeOption)
          ? kind
          : "string") as AttrTypeOption,
      })),
    );
  }, [selectedType, materialTypes]);

  const reset = useCallback(() => {
    setSelectedType("");
  }, []);

  const updateAttr = useCallback(
    (id: string, patch: Partial<Omit<AttrRow, "rowId">>) => {
      setAttrs((prev) =>
        prev.map((row) => (row.rowId === id ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const removeAttr = useCallback((id: string) => {
    setAttrs((prev) => prev.filter((row) => row.rowId !== id));
  }, []);

  const addAttr = useCallback(() => {
    setAttrs((prev) => [...prev, { rowId: rowId(), name: "", kind: "string" }]);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedType) return;
    const t = materialTypes?.[selectedType];
    if (!t) return;
    if (t.schemas?.[version]) {
      // Refuse to overwrite an existing version — schema versions are
      // immutable. The user must bump the version string first.
      // eslint-disable-next-line no-alert
      window.alert(
        `A versão "${version}" de "${selectedType}" já existe. Use uma versão nova.`,
      );
      return;
    }

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
    };
    dispatch(
      registerMaterialTypeVersion({
        name: selectedType,
        version,
        schemaJson: JSON.stringify(schema),
        predecessorId: `${selectedType}@${t.latestSchema}`,
      }),
    );
    reset();
  }, [
    dispatch,
    selectedType,
    version,
    principal,
    extra,
    stockUnit,
    attrs,
    materialTypes,
    reset,
  ]);

  const typeOptions = Object.values(materialTypes ?? {});

  return (
    <PointerContainer
      onClose={reset}
      component={
        <Box
          data-testid="update-material-type-form"
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
            <InputLabel id="update-material-type-select-label">Tipo</InputLabel>
            <Select
              labelId="update-material-type-select-label"
              data-testid="update-material-type-select"
              label="Tipo"
              value={selectedType}
              onChange={(e) => setSelectedType(String(e.target.value))}
            >
              {typeOptions.map((t) => (
                <MenuItem key={t.name} value={t.name}>
                  {t.label} ({t.latestSchema})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedType && (
            <>
              <FormControl fullWidth size="small">
                <TextField
                  data-testid="update-material-type-version"
                  label="Nova versão"
                  size="small"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  helperText={`Sucede ${selectedType}@${materialTypes?.[selectedType]?.latestSchema ?? ""}`}
                />
              </FormControl>
              <Box sx={{ display: "flex", gap: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <TextField
                    data-testid="update-material-type-principal"
                    label="Atributo principal"
                    size="small"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                  />
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <TextField
                    data-testid="update-material-type-extra"
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
                  data-testid="update-material-type-stock-unit"
                  value={stockUnit}
                  onChange={(e) => setStockUnit(String(e.target.value))}
                />
              </Box>

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
                      data-testid="update-material-type-attr-add"
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
                        data-testid={`update-material-type-attr-name-${idx}`}
                        label="Nome"
                        size="small"
                        value={row.name}
                        onChange={(e) =>
                          updateAttr(row.rowId, { name: e.target.value })
                        }
                      />
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel
                        id={`update-material-type-attr-kind-label-${idx}`}
                      >
                        Tipo
                      </InputLabel>
                      <Select
                        labelId={`update-material-type-attr-kind-label-${idx}`}
                        data-testid={`update-material-type-attr-kind-${idx}`}
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
                          data-testid={`update-material-type-attr-remove-${idx}`}
                          aria-label="remove-attribute"
                          size="small"
                          onClick={() => removeAttr(row.rowId)}
                        >
                          <DeleteSharpIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="update-material-type-confirm"
          disabled={!selectedType || !version.trim()}
          handleConfirm={handleConfirm}
        >
          Salvar nova versão
        </ConfirmAndCloseButton>,
      ]}
    >
      <Tooltip title="Editar tipo de material">
        <IconButton
          id="open-update-material-type"
          data-testid="open-update-material-type"
          aria-label="update-material-type"
          color="primary"
        >
          <ShortcutHint
            shortcutId={`${MODULE_NAME}/TiposDeMateriais/updateType`}
            placement="bottom-center"
          >
            <EditNoteSharpIcon />
          </ShortcutHint>
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
};

export default UpdateMaterialTypeSection;
