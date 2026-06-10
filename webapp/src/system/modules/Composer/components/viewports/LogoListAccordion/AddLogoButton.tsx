import { useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { IConverterModule } from "@system/modules/Converter";
import type { UnitValue } from "@system/modules/Converter/typings";
import { sanitizeSvg } from "@kernel/modules/SVG/utils/sanitizeSvg";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";
import type { LogoMethod } from "../../../typings";
import LogoCutTool from "./LogoCutTool";
import { applyCrop, FULL_CROP, type CropRect } from "./logoCut";

// Length-scale (comprimento) unit ids from the conversion graph.
const LENGTH_UNIT_IDS = ["centimetros7", "milimetros9", "metros5", "kilometros8"];
const DEFAULT_UNIT = "centimetros7"; // cm

// btoa over UTF-8 text (sanitized SVG markup).
const utf8ToBase64 = (text: string): string =>
  btoa(unescape(encodeURIComponent(text)));

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export default function AddLogoButton({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const converterModule = useModule<IConverterModule>("Converter");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { UnitAmountSelector } = converterModule.components;
  const lengthUnits = converterModule.hooks.useUnits(LENGTH_UNIT_IDS);

  const { actions } = useVariationActions({ variationId });
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(
    `logo-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [method, setMethod] = useState<LogoMethod>("embroidery");
  const [colors, setColors] = useState(1);
  const [widthValue, setWidthValue] = useState<UnitValue>({
    unit: DEFAULT_UNIT,
    amount: 8,
  });
  const [heightValue, setHeightValue] = useState<UnitValue>({
    unit: DEFAULT_UNIT,
    amount: 8,
  });
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState<"svg" | "raster" | "">("");
  const [fileData, setFileData] = useState("");
  const [fileMime, setFileMime] = useState("");
  const [cropRect, setCropRect] = useState<CropRect>(FULL_CROP);
  const [fileToken, setFileToken] = useState(0);

  const unitMenuItems = Object.values(lengthUnits ?? {}).map((u: any) => (
    <MenuItem key={u.id} value={u.id}>
      {u.abbreviation}
    </MenuItem>
  ));

  const resetForm = () => {
    setName(`logo-${Math.random().toString(36).slice(2, 8)}`);
    setMethod("embroidery");
    setColors(1);
    setWidthValue({ unit: DEFAULT_UNIT, amount: 8 });
    setHeightValue({ unit: DEFAULT_UNIT, amount: 8 });
    setFileName("");
    setFileKind("");
    setFileData("");
    setFileMime("");
    setCropRect(FULL_CROP);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setCropRect(FULL_CROP);
    setFileToken((t) => t + 1);
    const isSvg =
      file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (isSvg) {
      const raw = await readFileAsText(file);
      const sanitized = sanitizeSvg(raw);
      setFileKind("svg");
      setFileMime("image/svg+xml");
      setFileData(utf8ToBase64(sanitized));
    } else {
      // Raster: stored as-is for now (baseline quantization IPC pending).
      const b64 = await readFileAsBase64(file);
      setFileKind("raster");
      setFileMime(file.type || "image/png");
      setFileData(b64);
    }
  };

  const canConfirm = !!name && !!fileKind && !!fileData && colors >= 1;

  return (
    <PointerContainer
      onClose={resetForm}
      component={
        <Box data-testid="add-logo-form" sx={{ minWidth: 360, padding: 2, gap: 4 }}>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <TextField
              data-testid="add-logo-name"
              label="Nome do Logo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
            />
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel id="add-logo-method-label">Método</InputLabel>
            <Select
              labelId="add-logo-method-label"
              label="Método"
              data-testid="add-logo-method"
              inputProps={{ "data-testid": "add-logo-method-input" }}
              value={method}
              onChange={(e) => setMethod(e.target.value as LogoMethod)}
            >
              <MenuItem value="embroidery" data-testid="add-logo-method-option-embroidery">
                Bordado
              </MenuItem>
              <MenuItem value="silkscreen" data-testid="add-logo-method-option-silkscreen">
                Serigrafia
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <TextField
              data-testid="add-logo-colors"
              label="Cores"
              type="number"
              value={colors}
              onChange={(e) =>
                setColors(
                  Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                )
              }
              size="small"
            />
          </FormControl>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ minWidth: 56 }}>
                Largura
              </Typography>
              <UnitAmountSelector
                data-testid="add-logo-width"
                value={widthValue}
                onChange={setWidthValue}
              >
                {unitMenuItems}
              </UnitAmountSelector>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ minWidth: 56 }}>
                Altura
              </Typography>
              <UnitAmountSelector
                data-testid="add-logo-height"
                value={heightValue}
                onChange={setHeightValue}
              >
                {unitMenuItems}
              </UnitAmountSelector>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            O custo é definido por posição, na lista de posições do logo.
          </Typography>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Button
              data-testid="add-logo-file"
              variant="outlined"
              size="small"
              onClick={() => fileRef.current?.click()}
            >
              Selecionar arquivo
            </Button>
            <Typography variant="caption" data-testid="add-logo-file-name">
              {fileName || "Nenhum arquivo"}
            </Typography>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              style={{ display: "none" }}
              data-testid="add-logo-file-input"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Box>
          {fileKind === "raster" ? (
            <Typography
              variant="caption"
              color="warning.main"
              data-testid="add-logo-pending-vector-warning"
            >
              Forneça um SVG para produção
            </Typography>
          ) : null}

          {fileKind && fileData ? (
            <LogoCutTool
              key={fileToken}
              kind={fileKind}
              data={fileData}
              mime={fileMime}
              aspect={widthValue.amount / heightValue.amount}
              rect={cropRect}
              onRectChange={setCropRect}
            />
          ) : null}
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="add-logo-confirm"
          disabled={!canConfirm}
          handleConfirm={async () => {
            if (!canConfirm) return;
            const cropped = await applyCrop(
              { kind: fileKind as "svg" | "raster", data: fileData, mime: fileMime },
              cropRect,
            );
            actions.addLogo({
              name,
              method,
              colors,
              defaultSize: {
                width: widthValue,
                height: heightValue,
              },
              source:
                fileKind === "raster"
                  ? { kind: "raster", pendingVector: true }
                  : { kind: "svg" },
              document: {
                data: cropped.data,
                mime: cropped.mime,
                filename: fileName,
              },
              garmentId,
            });
            resetForm();
          }}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button
        id="composer-add-logo"
        data-testid="add-logo"
        aria-label="add-logo"
        variant="outlined"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/LogoList/addLogo`}
        >
          <Typography>Adicionar Logo</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
