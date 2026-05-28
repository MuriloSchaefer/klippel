import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Alert,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import FileUploadSharpIcon from "@mui/icons-material/FileUploadSharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../constants";
import { loadMaterialsCatalog } from "../store/materials/actions";

type SkipEntry = { kind: "type" | "material"; id: string; reason: string };
type ErrorEntry = { sheet: string; row: number; message: string };

interface ImportFinishedPayload {
  jobId: string;
  ok: boolean;
  addedTypes: number;
  addedMaterials: number;
  skipped: SkipEntry[];
  errors: ErrorEntry[];
  errorCode?: string;
  errorMessage?: string;
}

type Status = "idle" | "queued" | "finished";

/**
 * Ribbon entry point for the xlsx catalog importer. The work happens
 * in the main process (see `Materials/main/importer/`); the renderer
 * just hands over the file bytes, shows a "queued" hint, and waits
 * for the `materials:import-finished` push to surface the summary.
 *
 * The DataGrid fills in as `jazz-materials:changed` ticks land from
 * the existing catalog subscription; on a successful import we also
 * dispatch `loadMaterialsCatalog` directly so lists refresh even if
 * the change event is missed.
 */
const ImportCatalogSection: React.FC = () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const [fileName, setFileName] = useState<string>("");
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [jobId, setJobId] = useState<string>("");
  const [summary, setSummary] = useState<ImportFinishedPayload | null>(null);
  const [snackbar, setSnackbar] = useState<ImportFinishedPayload | null>(null);

  const dispatch = useDispatch();

  // Subscribe once on mount; the main process push channel fans out to
  // every renderer that subscribed, so the listener stays valid across
  // workspace switches.
  useEffect(() => {
    const api = (window as any).electron?.jazz?.materials;
    if (!api?.onImportFinished) return;
    const off = api.onImportFinished((payload: ImportFinishedPayload) => {
      setSummary(payload);
      setStatus("finished");
      setSnackbar(payload);
      if (payload.ok) dispatch(loadMaterialsCatalog());
    });
    return off;
  }, [dispatch]);

  const reset = useCallback(() => {
    setFileName("");
    setBuffer(null);
    setStatus("idle");
    setJobId("");
    setSummary(null);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setBuffer(await file.arrayBuffer());
    setStatus("idle");
    setSummary(null);
  }, []);

  const handleFixtureClick = useCallback(async () => {
    try {
      const res = await fetch("/materials/materials.xlsx");
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      setFileName("materials.xlsx (fixture)");
      setBuffer(buf);
      setStatus("idle");
      setSummary(null);
    } catch (err) {
      console.error("[ImportCatalogSection] fixture fetch failed", err);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!buffer) return;
    const api = (window as any).electron?.jazz?.materials;
    if (!api?.importXlsx) {
      console.error("[ImportCatalogSection] importXlsx IPC missing");
      return;
    }
    try {
      const { jobId: id } = await api.importXlsx(buffer);
      setJobId(id);
      setStatus("queued");
    } catch (err) {
      console.error("[ImportCatalogSection] importXlsx failed", err);
    }
  }, [buffer]);

  return (
    <>
      <PointerContainer
        onClose={() => {
          // Reset only when nothing is in flight; keep the popup state
          // around so a re-open shows the last summary.
          if (status === "finished") reset();
        }}
        component={
          <Box
            data-testid="import-catalog-form"
            sx={{
              minWidth: 360,
              padding: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Typography variant="subtitle1">Importar catálogo</Typography>
            <Typography variant="body2" color="text.secondary">
              Tipos e materiais são importados em segundo plano. Você pode
              continuar usando o app — a tabela atualiza sozinha.
            </Typography>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Button
                variant="outlined"
                component="label"
                size="small"
                data-testid="import-catalog-pick-file"
              >
                Escolher arquivo
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
              </Button>
              <Button
                variant="text"
                size="small"
                data-testid="import-catalog-use-fixture"
                onClick={handleFixtureClick}
              >
                Usar fixture
              </Button>
            </Box>

            {fileName && (
              <Typography variant="caption" color="text.secondary">
                Arquivo: {fileName}
              </Typography>
            )}

            {status === "queued" && (
              <Box>
                <Typography variant="caption">
                  Importação em andamento (job {jobId.slice(0, 8)}…)
                </Typography>
                <LinearProgress sx={{ mt: 0.5 }} />
              </Box>
            )}

            {status === "finished" && summary && (
              <Alert
                severity={summary.ok ? "success" : "error"}
                data-testid="import-catalog-summary"
                data-result={summary.ok ? "success" : "error"}
                sx={{ alignItems: "flex-start" }}
              >
                {summary.ok ? (
                  <>
                    +{summary.addedTypes} tipos · +{summary.addedMaterials}{" "}
                    materiais · {summary.skipped.length} ignorados ·{" "}
                    {summary.errors.length} erros
                  </>
                ) : (
                  <>
                    Falha: {summary.errorCode ?? "unknown"} —{" "}
                    {summary.errorMessage ?? ""}
                  </>
                )}
              </Alert>
            )}
          </Box>
        }
        actions={[
          <ConfirmAndCloseButton
            key="confirm"
            data-testid="import-catalog-confirm"
            disabled={!buffer || status === "queued"}
            handleConfirm={handleConfirm}
          >
            Importar
          </ConfirmAndCloseButton>,
        ]}
      >
        <Tooltip title="Importar tipos e materiais de xlsx">
          <IconButton
            id="open-import-catalog"
            data-testid="open-import-catalog"
            aria-label="import-catalog"
            color="primary"
          >
            <ShortcutHint
              shortcutId={`${MODULE_NAME}/Estoque/importCatalog`}
              placement="bottom-center"
            >
              <FileUploadSharpIcon />
            </ShortcutHint>
          </IconButton>
        </Tooltip>
      </PointerContainer>
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {snackbar ? (
          <Alert
            severity={snackbar.ok ? "success" : "error"}
            onClose={() => setSnackbar(null)}
            data-testid="import-catalog-summary"
            data-result={snackbar.ok ? "success" : "error"}
          >
            {snackbar.ok
              ? `Importação concluída — +${snackbar.addedTypes} tipos, +${snackbar.addedMaterials} materiais`
              : `Falha de importação: ${snackbar.errorCode ?? "unknown"}`}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
};

export default ImportCatalogSection;
