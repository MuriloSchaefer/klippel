import { useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { EditOutlined } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { IConverterModule } from "@system/modules/Converter";
import type { UnitValue } from "@system/modules/Converter/typings";
import { sanitizeSvg } from "@kernel/modules/SVG/utils/sanitizeSvg";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";
import type { DocumentNode, LogoMethod, LogoNode } from "../../../typings";
import LogoCutTool from "./LogoCutTool";
import { applyCrop, FULL_CROP, type CropRect } from "./logoCut";

const LENGTH_UNIT_IDS = ["centimetros7", "milimetros9", "metros5", "kilometros8"];

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

export default function LogoEditButton({
  node,
  variationId,
  isFocused,
  onClose,
}: Readonly<{
  node: LogoNode;
  variationId: string;
  isFocused: boolean;
  onClose?: () => void;
}>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const converterModule = useModule<IConverterModule>("Converter");
  const storeModule = useModule<Store>("Store");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { UnitAmountSelector } = converterModule.components;
  const { useAppSelector } = storeModule.hooks;
  const lengthUnits = converterModule.hooks.useUnits(LENGTH_UNIT_IDS);

  const { actions } = useVariationActions({ variationId });
  const fileRef = useRef<HTMLInputElement>(null);

  // The logo's current stored document (base64) — lets the user re-crop the
  // existing asset, not only a freshly-uploaded replacement.
  const existingDoc = useAppSelector((s: any): DocumentNode | undefined => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return undefined;
    return (Object.values(nodes) as any[]).find(
      (n): n is DocumentNode =>
        n.type === "DOCUMENT" && n.documentId === node.source.documentId,
    );
  });

  const [method, setMethod] = useState<LogoMethod>(node.method);
  const [colors, setColors] = useState(node.colors);
  const [widthValue, setWidthValue] = useState<UnitValue>(node.defaultSize.width);
  const [heightValue, setHeightValue] = useState<UnitValue>(
    node.defaultSize.height,
  );

  // Optional source-file replacement (left empty unless the user picks a new file).
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

  const resetFile = () => {
    setFileName("");
    setFileKind("");
    setFileData("");
    setFileMime("");
    setCropRect(FULL_CROP);
    setFileToken((t) => t + 1);
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
      setFileKind("svg");
      setFileMime("image/svg+xml");
      setFileData(utf8ToBase64(sanitizeSvg(raw)));
    } else {
      const b64 = await readFileAsBase64(file);
      setFileKind("raster");
      setFileMime(file.type || "image/png");
      setFileData(b64);
    }
  };

  // The file the cut tool previews/operates on: the replacement if one was
  // picked, otherwise the logo's existing stored document.
  const activeFile =
    fileKind && fileData
      ? { kind: fileKind as "svg" | "raster", data: fileData, mime: fileMime }
      : existingDoc?.data
        ? {
            kind: node.source.kind as "svg" | "raster",
            // Logo assets store their bytes inline. `data` is optional on
            // `DocumentNode` because user attachments keep theirs in a
            // fileStream instead, so a logo document without it is a broken
            // one — fall through to `null` and let the picker replace it.
            data: existingDoc.data,
            mime: existingDoc.mime,
          }
        : null;

  return (
    <PointerContainer
      onClose={() => {
        resetFile();
        onClose?.();
      }}
      component={
        <Box data-testid="logo-edit-form" sx={{ minWidth: 320, padding: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel id={`logo-edit-method-${node.id}`}>Método</InputLabel>
            <Select
              labelId={`logo-edit-method-${node.id}`}
              label="Método"
              data-testid="logo-edit-method"
              inputProps={{ "data-testid": "logo-edit-method-input" }}
              value={method}
              onChange={(e) => setMethod(e.target.value as LogoMethod)}
            >
              <MenuItem value="embroidery">Bordado</MenuItem>
              <MenuItem value="silkscreen">Serigrafia</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <TextField
              size="small"
              type="number"
              label="Cores"
              value={colors}
              data-testid="logo-edit-colors"
              onChange={(e) =>
                setColors(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
              }
            />
          </FormControl>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ minWidth: 56 }}>
                Largura
              </Typography>
              <UnitAmountSelector
                data-testid="logo-edit-width"
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
                data-testid="logo-edit-height"
                value={heightValue}
                onChange={setHeightValue}
              >
                {unitMenuItems}
              </UnitAmountSelector>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              data-testid="logo-edit-file"
              variant="outlined"
              size="small"
              onClick={() => fileRef.current?.click()}
            >
              Substituir arquivo
            </Button>
            <Typography variant="caption" data-testid="logo-edit-file-name">
              {fileName || "Manter atual"}
            </Typography>
            {fileName ? (
              <IconButton
                size="small"
                aria-label="clear-replacement-file"
                data-testid="logo-edit-file-clear"
                onClick={resetFile}
              >
                ×
              </IconButton>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              style={{ display: "none" }}
              data-testid="logo-edit-file-input"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Box>

          {activeFile ? (
            <LogoCutTool
              key={fileToken}
              kind={activeFile.kind}
              data={activeFile.data}
              mime={activeFile.mime}
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
          data-testid="logo-edit-confirm"
          handleConfirm={async () => {
            const replaced = !!(fileKind && fileData);
            const cropChanged =
              cropRect.x > 0.001 ||
              cropRect.y > 0.001 ||
              cropRect.w < 0.999 ||
              cropRect.h < 0.999;
            let docChanges = {};
            if (activeFile && (replaced || cropChanged)) {
              const cropped = await applyCrop(activeFile, cropRect);
              const kind = replaced ? activeFile.kind : node.source.kind;
              docChanges = {
                source:
                  kind === "raster"
                    ? {
                        kind: "raster",
                        documentId: node.source.documentId,
                        pendingVector: true,
                      }
                    : { kind: "svg", documentId: node.source.documentId },
                document: {
                  data: cropped.data,
                  mime: cropped.mime,
                  filename: replaced ? fileName : existingDoc?.filename,
                },
              };
            }
            actions.updateLogo(node.id, {
              method,
              colors,
              defaultSize: { width: widthValue, height: heightValue },
              ...docChanges,
            });
            resetFile();
          }}
        >
          Salvar
        </ConfirmAndCloseButton>,
      ]}
    >
      <IconButton
        data-testid="logo-item-edit"
        aria-label="edit-logo"
        sx={{ "&:hover": { color: "primary.main" } }}
      >
        <ShortcutHint
          placement="bottom-center"
          shortcutId={`${MODULE_NAME}/LogoItem/editLogo`}
          alwaysShow={isFocused}
        >
          <EditOutlined color="info" />
        </ShortcutHint>
      </IconButton>
    </PointerContainer>
  );
}
