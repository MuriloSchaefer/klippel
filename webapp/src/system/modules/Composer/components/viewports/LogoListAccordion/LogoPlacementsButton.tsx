import {
  Box,
  Button,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import {
  DeleteOutlineSharp,
  LayersOutlined,
  OpenWithOutlined,
} from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { ISVGModule } from "@kernel/modules/SVG";
import { IConverterModule } from "@system/modules/Converter";
import type { UnitValue } from "@system/modules/Converter/typings";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME, LOGO_PLACEMENTS_CONTEXT_ID } from "../../../constants";
import type { LogoNode } from "../../../typings";

const LENGTH_UNIT_IDS = ["centimetros7", "milimetros9", "metros5", "kilometros8"];

// Matches the injected placement-container id built in useVariationActions.
const placementElementId = (logoId: string, placementId: string) =>
  `logo-${logoId}-${placementId}`;

export default function LogoPlacementsButton({
  node,
  variationId,
  isFocused,
}: Readonly<{ node: LogoNode; variationId: string; isFocused: boolean }>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const converterModule = useModule<IConverterModule>("Converter");
  const svgModule = useModule<ISVGModule>("SVG");
  const { PointerContainer } = pointerModule.components;
  const { ShortcutHint, FocusShortcutProvider } =
    keyboardShortcutsModule.components;
  const { UnitAmountSelector } = converterModule.components;
  const lengthUnits = converterModule.hooks.useUnits(LENGTH_UNIT_IDS);
  const svgToolkit = svgModule.hooks.useSVGEditorToolkit();

  const { actions } = useVariationActions({ variationId });

  const unitMenuItems = Object.values(lengthUnits ?? {}).map((u: any) => (
    <MenuItem key={u.id} value={u.id}>
      {u.abbreviation}
    </MenuItem>
  ));

  // Select this placement's in-content element in the svgtoolbox and wire its
  // move/rotate/scale + clip back to the placement actions.
  const selectPlacement = (placementId: string) => {
    const elementId = placementElementId(node.logoId, placementId);
    svgToolkit.selectManipulable(elementId, {
      onTransform: (_id, t) =>
        actions.updateLogoPlacement(node.id, placementId, t),
      onClip: (_id, clipTargetId) =>
        actions.clipLogoPlacement(node.id, placementId, clipTargetId),
      // Clip targets: any content element with an id except the placement itself.
      getSelectables: (root: SVGSVGElement) =>
        Array.from(root.querySelectorAll<SVGElement>("[id]")).filter(
          (el) => el.id !== elementId && !el.id.startsWith("logo-"),
        ),
    });
  };

  return (
    <PointerContainer
      component={
        <FocusShortcutProvider contextId={LOGO_PLACEMENTS_CONTEXT_ID}>
          <Box data-testid="logo-placements" sx={{ p: 2, minWidth: 360 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Posições
            </Typography>

            {node.placements.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Nenhuma posição. Adicione uma cópia no desenho.
              </Typography>
            ) : null}

            {node.placements.map((p) => (
              <Box
                key={p.placementId}
                data-testid="logo-placement-item"
                data-placement-id={p.placementId}
                tabIndex={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  p: 1,
                  mb: 0.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={p.name}
                    data-testid="logo-placement-name"
                    onChange={(e) =>
                      actions.renameLogoPlacement(
                        node.id,
                        p.placementId,
                        e.target.value,
                      )
                    }
                  />
                  <IconButton
                    size="small"
                    data-testid="logo-placement-select"
                    aria-label="select-placement"
                    title="Editar no desenho (mover/girar/escalar/recortar)"
                    color="primary"
                    onClick={() => selectPlacement(p.placementId)}
                  >
                    <OpenWithOutlined fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    data-testid="logo-placement-delete"
                    aria-label="delete-placement"
                    onClick={() =>
                      actions.removeLogoPlacement(node.id, p.placementId)
                    }
                  >
                    <DeleteOutlineSharp fontSize="small" color="error" />
                  </IconButton>
                </Box>

                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  <Typography variant="caption" sx={{ minWidth: 36 }}>
                    L×A
                  </Typography>
                  <UnitAmountSelector
                    data-testid="logo-placement-width"
                    value={p.size.width}
                    onChange={(v: UnitValue) =>
                      actions.resizeLogoPlacement(node.id, p.placementId, {
                        width: v,
                        height: p.size.height,
                      })
                    }
                  >
                    {unitMenuItems}
                  </UnitAmountSelector>
                  <UnitAmountSelector
                    data-testid="logo-placement-height"
                    value={p.size.height}
                    onChange={(v: UnitValue) =>
                      actions.resizeLogoPlacement(node.id, p.placementId, {
                        width: p.size.width,
                        height: v,
                      })
                    }
                  >
                    {unitMenuItems}
                  </UnitAmountSelector>
                </Box>
              </Box>
            ))}

            <Button
              size="small"
              variant="outlined"
              data-testid="logo-placement-add"
              onClick={() => {
                const placementId = actions.addLogoPlacement(node.id);
                if (placementId) selectPlacement(placementId);
              }}
            >
              <ShortcutHint
                placement="top-center"
                shortcutId={`${MODULE_NAME}/LogoPlacements/addPlacement`}
              >
                <Typography variant="body2">Adicionar posição</Typography>
              </ShortcutHint>
            </Button>
          </Box>
        </FocusShortcutProvider>
      }
      actions={[]}
    >
      <IconButton data-testid="logo-item-placements" aria-label="logo-placements">
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/LogoItem/openPlacements`}
          alwaysShow={isFocused}
        >
          <LayersOutlined />
        </ShortcutHint>
      </IconButton>
    </PointerContainer>
  );
}
