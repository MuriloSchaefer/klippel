import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  FormControl,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditSharpIcon from "@mui/icons-material/EditSharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IConverterModule } from "@system/modules/Converter";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { MODULE_NAME } from "../../../constants";
import useMaterialTypes from "../../../hooks/useMaterialTypes";
import { updateMaterial } from "../../../store/materials/actions";
import { encodeAttributeMap } from "../../../store/materials/catalogAdapter";
import type { MaterialState } from "../../../store/materials/state";
import SchemaDrivenFields from "../../MaterialForm/SchemaDrivenFields";

/**
 * Per-row Update trigger. Wraps the edit icon in a `PointerContainer`
 * (mirrors `DeleteMaterialButton`) so the form opens anchored at the
 * click/keyboard point. The schema-driven block renders one input per
 * attribute declared in the material's **pinned** `schemaVersion` — not
 * the type's latest schema — so editing never silently migrates a row to
 * a newer schema. `type` and stock unit are fixed (changing them is the
 * job of a type-migration flow, not a field edit).
 */
const UpdateMaterialButton: React.FC<{
  material: MaterialState;
  selected?: boolean;
}> = ({ material, selected = false }) => {
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
  const id = String(material.id);

  const type = materialTypes?.[material.type];
  const typeLabel = type?.label ?? material.type;
  // Match the material's pinned schema version; fall back to the type's
  // latest only if that exact version is no longer registered.
  const schema = useMemo(() => {
    if (!type) return undefined;
    return type.schemas?.[material.schemaVersion] ?? type.schemas?.[type.latestSchema];
  }, [type, material.schemaVersion]);

  const [stockAmount, setStockAmount] = useState<string>(
    String(material.stock?.amount ?? 0),
  );
  const [industry, setIndustry] = useState(material.industry ?? "");
  const [externalId, setExternalId] = useState(material.externalId ?? "");
  const [attrValues, setAttrValues] = useState<Record<string, unknown>>(
    () => ({ ...(material.attributes ?? {}) }),
  );

  const reset = useCallback(() => {
    setStockAmount(String(material.stock?.amount ?? 0));
    setIndustry(material.industry ?? "");
    setExternalId(material.externalId ?? "");
    setAttrValues({ ...(material.attributes ?? {}) });
  }, [material]);

  const handleAttrChange = useCallback((name: string, value: unknown) => {
    setAttrValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleConfirm = useCallback(() => {
    dispatch(
      updateMaterial({
        id,
        patch: {
          attributes: encodeAttributeMap(attrValues),
          stock: {
            amount: Number(stockAmount) || 0,
            unit: material.stock?.unit ?? "",
          },
          schemaVersion: material.schemaVersion,
          externalId: externalId.trim() || undefined,
          updatedAt: Date.now(),
        },
        // Industry edge: "" deletes it, a value sets it. `sellerIds` is
        // intentionally omitted so existing supplier edges are preserved.
        industryId: industry.trim(),
      }),
    );
  }, [dispatch, id, attrValues, stockAmount, industry, externalId, material]);

  return (
    <PointerContainer
      onClose={reset}
      component={
        <Box
          data-testid={`update-material-form-${id}`}
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
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="subtitle2">{id}</Typography>
            <Typography variant="caption" color="text.secondary">
              {typeLabel} @ {material.schemaVersion}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" sx={{ minWidth: 80 }}>
              Estoque
            </Typography>
            <FormControl size="small" sx={{ flex: 1 }}>
              <TextField
                data-testid={`update-material-stock-amount-${id}`}
                label="Quantidade"
                size="small"
                type="number"
                value={stockAmount}
                onChange={(e) => setStockAmount(e.target.value)}
                autoFocus
              />
            </FormControl>
            {/* Stock unit is owned by the type schema (see AddMaterialSection). */}
            <UnitSelector
              data-testid={`update-material-stock-unit-${id}`}
              value={material.stock?.unit ?? ""}
              disabled
            />
          </Box>

          <FormControl fullWidth size="small">
            <TextField
              data-testid={`update-material-industry-${id}`}
              label="Indústria (opcional)"
              size="small"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth size="small">
            <TextField
              data-testid={`update-material-external-id-${id}`}
              label="ID externo (do fornecedor)"
              size="small"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
            />
          </FormControl>

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
              attributes={schema?.attributes ?? {}}
              values={attrValues}
              onChange={handleAttrChange}
            />
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid={`update-material-confirm-${id}`}
          handleConfirm={handleConfirm}
        >
          Salvar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Tooltip title="Atualizar">
        <IconButton
          size="small"
          id={`material-row-update-${id}`}
          data-testid={`material-row-update-${id}`}
          aria-label={`update-material-${id}`}
        >
          {selected ? (
            <ShortcutHint
              shortcutId={`${MODULE_NAME}/MaterialStockViewport/editSelected`}
              placement="bottom-center"
            >
              <EditSharpIcon fontSize="small" />
            </ShortcutHint>
          ) : (
            <EditSharpIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
};

// Memoized: this renders an entire edit form per row, so re-rendering it for
// every visible row on each grid selection change is the dominant cost. Only
// rows whose `selected` flips need to re-render; `material` is referentially
// stable across selection changes (same rows array).
export default React.memo(UpdateMaterialButton);
