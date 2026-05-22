import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AccessTimeSharp,
  AttachMoneySharp,
  DeleteOutlineSharp,
} from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { IConverterModule } from "@system/modules/Converter";
import { IMaterialsModule } from "@system/modules/Materials";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import {
  ConsumesEdge,
  ElectiveNode,
  MaterialNode,
  ProcessNode,
} from "../../../typings";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";
import ProcessEditButton from "./ProcessEditButton";
import ProcessElectiveButton from "./ProcessElectiveButton";
import ProcessMaterialUsageButton from "./processMaterialUsageButton";

function ProcessItem({
  variationId,
  nodeId,
}: {
  variationId: string;
  nodeId: string;
}) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const converterModule = useModule<IConverterModule>("Converter");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { useAppSelector } = storeModule.hooks;

  const { actions } = useVariationActions({ variationId });
  const { useUnits } = converterModule.hooks;
  const { useMaterials, useMaterialTypes } = materialsModule.hooks;

  // Custom equality: ignore computed write-back fields so computation middleware
  // (which adds computedTimePerUnit/timeAudit) doesn't trigger unnecessary re-renders.
  const node = useAppSelector(
    (s: any) =>
      s.Graph?.graphs?.[variationId]?.nodes?.[nodeId] as ProcessNode | undefined,
    (prev, next) => {
      if (prev === next) return true;
      if (!prev || !next) return false;
      return (
        prev.id === next.id &&
        prev.label === next.label &&
        prev.electiveNodeId === next.electiveNodeId &&
        prev.costTime === next.costTime &&
        prev.costMoney === next.costMoney
      );
    },
  );

  const linkedElective = useAppSelector((s: any): ElectiveNode | null => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return null;
    const n = nodes[nodeId] as ProcessNode | undefined;
    if (!n?.electiveNodeId) return null;
    return (nodes[n.electiveNodeId] as ElectiveNode) ?? null;
  });

  const materialsConsumptions = useAppSelector(
    (s: any): ConsumesEdge[] => {
      const edges = s.Graph?.graphs?.[variationId]?.edges;
      if (!edges) return [];
      return (Object.values(edges) as any[]).filter(
        (e): e is ConsumesEdge => e.type === "CONSUMES" && e.sourceId === nodeId,
      );
    },
    shallowEqual,
  );

  const graphMaterialNodes = useAppSelector(
    (s: any): Record<string, MaterialNode> => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return {};
      const result: Record<string, MaterialNode> = {};
      for (const n of Object.values(nodes) as any[]) {
        if (n.type === "MATERIAL") result[n.id] = n as MaterialNode;
      }
      return result;
    },
    shallowEqual,
  );

  const units = useUnits();
  const materials = useMaterials();
  const materialTypes = useMaterialTypes();

  const [isFocused, setIsFocused] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const refocusAfterEditRef = useRef(false);
  const handleClose = useCallback(() => {
    refocusAfterEditRef.current = true;
  }, []);

  useEffect(() => {
    if (refocusAfterEditRef.current) {
      refocusAfterEditRef.current = false;
      rowRef.current?.focus();
    }
  });

  if (!units || !node) return null;

  return (
    <Box
      ref={rowRef}
      id={node.id}
      data-testid="process-item"
      data-process-label={node.label}
      tabIndex={0}
      onFocus={(e) => {
        if (e.currentTarget === e.target) setIsFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      sx={{
        display: "flex",
        gap: 1,
        border: "2px solid transparent",
        borderRadius: 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:focus, &:focus-visible, &:focus-within": {
          outline: "none",
          borderColor: "primary.main",
          boxShadow: (t) => `0 0 0 2px ${t.palette.primary.light}`,
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography sx={{ fontWeight: "bold" }}>{node.label}</Typography>
          {linkedElective && (
            <Chip
              data-testid="process-item-elective-chip"
              data-elective-label={linkedElective.label}
              label={linkedElective.label}
              size="small"
              color={linkedElective.value ? "success" : "default"}
              sx={{ height: 20 }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <AccessTimeSharp />
            <Typography>
              {node.costTime?.quotient.amount}{" "}
              {units![node.costTime!.quotient.unit].abbreviation} /
              {node.costTime?.dividend.amount}{" "}
              {units![node.costTime!.dividend.unit].abbreviation}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <AttachMoneySharp />
            <Typography>
              {node.costMoney?.quotient.amount}{" "}
              {units![node.costMoney!.quotient.unit].abbreviation} /
              {node.costMoney?.dividend.amount}{" "}
              {units![node.costMoney!.dividend.unit].abbreviation}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexGrow: 1, alignItems: "center" }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowY: "hidden",
              overflowX: "auto",
            }}
          >
            {materialsConsumptions.map((mc) => {
              const matNode = graphMaterialNodes[mc.targetId];
              if (!matNode || !materials) return null;
              const mat = materials[matNode.materialId];
              if (!mat) return null;
              const matType = materialTypes[mat.type];
              const schema = matType.schemas[mat.schemaVersion];
              const extraAttr = mat.attributes[schema.selector.extra];

              return (
                <Chip
                  key={mc.id}
                  sx={{
                    height: "auto",
                    "& .MuiChip-label": {
                      display: "block",
                      whiteSpace: "normal",
                    },
                    p: 1,
                  }}
                  label={
                    <Box>
                      <Typography>
                        {mat.attributes[schema.selector.principal]} (
                        {schema.attributes[schema.selector.extra] === "color"
                          ? extraAttr.label
                          : extraAttr}
                        )
                      </Typography>
                      <Typography>
                        {mc.amount.quotient.amount}{" "}
                        {units![mc.amount.quotient.unit].abbreviation} /
                        {mc.amount.dividend.amount}{" "}
                        {units![mc.amount.dividend.unit].abbreviation}
                      </Typography>
                    </Box>
                  }
                />
              );
            })}
          </Box>
        </Box>
      </Box>
      <Box
        id={`process-${nodeId}-actions`}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/ProcessItem/deleteProcess`}
          alwaysShow={isFocused}
        >
          <IconButton
            data-testid="process-item-delete"
            aria-label="delete-process"
            sx={{ "&:hover": { color: theme.palette.error.main } }}
            onClick={() => {
              const row = rowRef.current;
              const next =
                (row?.nextElementSibling as HTMLElement | null) ??
                (row?.previousElementSibling as HTMLElement | null) ??
                null;
              const fallback = document.getElementById(
                "composer-add-process",
              ) as HTMLElement | null;
              const target =
                next && next.matches('[data-testid="process-item"]')
                  ? next
                  : fallback;
              actions.removeProcess(node.id);
              if (target) {
                setTimeout(() => target.focus(), 0);
              }
            }}
          >
            <DeleteOutlineSharp color="error" />
          </IconButton>
        </ShortcutHint>
        <ProcessEditButton
          variationId={variationId}
          processNode={node}
          isFocused={isFocused}
          onClose={handleClose}
        />
        <ProcessElectiveButton
          variationId={variationId}
          processNode={node}
          isFocused={isFocused}
          onClose={handleClose}
        />
        <ProcessMaterialUsageButton
          variationId={variationId}
          processNodeId={node.id}
          isFocused={isFocused}
          onClose={handleClose}
        />
      </Box>
      <Divider />
    </Box>
  );
}

export default React.memo(ProcessItem);
