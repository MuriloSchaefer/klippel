import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  IconButton,
  ListItem,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowDownward,
  ArrowUpward,
  CancelSharp,
  DeleteOutlineSharp,
  ModeEditOutlineSharp,
  SaveSharp,
} from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { debounce } from "@kernel/utils";
import useVariation from "../../../hooks/useVariation";
import type { GraduationNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";

export default function GraduationItem({
  node,
  variationId,
  index,
  moveUp,
  moveDown,
  canMoveUp,
  canMoveDown,
}: {
  node: GraduationNode;
  variationId: string;
  garmentId: string;
  index: number;
  moveUp: () => void;
  moveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const variation = useVariation({ variationId });
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const [isEditing, setIsEditing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [form, setForm] = useState(() => ({
    label: node.label ?? "",
    amount: node.amount ?? 0,
  }));

  const rowRef = useRef<HTMLLIElement | null>(null);
  const refocusAfterEditRef = useRef(false);

  useEffect(() => {
    setForm({ label: node.label ?? "", amount: node.amount ?? 0 });
  }, [node.id, node.label, node.amount]);

  useEffect(() => {
    if (!isEditing && refocusAfterEditRef.current) {
      refocusAfterEditRef.current = false;
      rowRef.current?.focus();
    }
  }, [isEditing]);

  const debouncedSave = useMemo(
    () =>
      debounce(
        (changes: Partial<GraduationNode>) =>
          variation.actions.updateGraduation(node.id, changes),
        400,
      ),
    [node.id],
  );

  const handleAmountChange = (value: number) => {
    const sanitized =
      Number.isFinite(value) && value >= 0 ? Math.max(0, Math.round(value)) : 0;
    setForm((s) => ({ ...s, amount: sanitized }));
    debouncedSave({ amount: sanitized });
  };

  const handleSave = () => {
    variation.actions.updateGraduation(node.id, {
      label: form.label,
      amount: form.amount,
    });
    refocusAfterEditRef.current = true;
    setIsEditing(false);
  };

  const handleCancel = () => {
    setForm({ label: node.label ?? "", amount: node.amount ?? 0 });
    refocusAfterEditRef.current = true;
    setIsEditing(false);
  };

  return (
    <ListItem
      ref={rowRef}
      id={node.id}
      data-node-id={node.id}
      data-testid="graduation-item"
      data-graduation-label={node.label}
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
        mb: 0.5,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
        border: "2px solid transparent",
        borderRadius: 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:focus, &:focus-visible, &:focus-within": {
          outline: "none",
          borderColor: "primary.main",
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
        },
      }}
    >
      {!isEditing ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexGrow: 1,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ width: 28 }} />
          <Box sx={{ display: "flex", flexDirection: "column", minWidth: 200 }}>
            <Typography sx={{ fontWeight: 500 }}>{node.label}</Typography>
            <Typography color="text.secondary">
              Ordem: {node.order ?? index}
            </Typography>
          </Box>
          <TextField
            label="Quantidade"
            size="small"
            type="number"
            value={form.amount}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            sx={{ width: 120 }}
          />
        </Box>
      ) : (
        <Box
          data-testid="edit-graduation-form"
          sx={{ display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}
        >
          <TextField
            data-testid="edit-graduation-label"
            label="Nome"
            size="small"
            autoFocus
            value={form.label}
            onChange={(e) =>
              setForm((s) => ({ ...s, label: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <TextField
            data-testid="edit-graduation-amount"
            label="Quantidade"
            size="small"
            type="number"
            value={form.amount}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                amount:
                  Number.isFinite(Number(e.target.value)) &&
                  Number(e.target.value) >= 0
                    ? Math.max(0, Math.round(Number(e.target.value)))
                    : 0,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            sx={{ width: 120 }}
          />
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {!isEditing ? (
          <>
            <ShortcutHint
              placement="top-center"
              shortcutId={`${MODULE_NAME}/GraduationItem/deleteGraduation`}
              alwaysShow={isFocused}
            >
              <IconButton
                data-testid="graduation-item-delete"
                aria-label="delete-graduation"
                sx={{ "&:hover": { color: "error.main" } }}
                onClick={() => variation.actions.removeGraduation(node.id)}
              >
                <DeleteOutlineSharp color="error" />
              </IconButton>
            </ShortcutHint>
            <ShortcutHint
              placement="bottom-center"
              shortcutId={`${MODULE_NAME}/GraduationItem/editGraduation`}
              alwaysShow={isFocused}
            >
              <IconButton
                data-testid="graduation-item-edit"
                aria-label="edit-graduation"
                sx={{ "&:hover": { color: "primary.main" } }}
                onClick={() => setIsEditing(true)}
              >
                <ModeEditOutlineSharp color="info" />
              </IconButton>
            </ShortcutHint>
            <ShortcutHint
              placement="top-center"
              shortcutId={`${MODULE_NAME}/GraduationItem/moveUp`}
              alwaysShow={isFocused}
            >
              <IconButton
                data-testid="graduation-item-move-up"
                aria-label="move-up"
                disabled={!canMoveUp}
                onClick={moveUp}
              >
                <ArrowUpward fontSize="small" />
              </IconButton>
            </ShortcutHint>
            <ShortcutHint
              placement="bottom-center"
              shortcutId={`${MODULE_NAME}/GraduationItem/moveDown`}
              alwaysShow={isFocused}
            >
              <IconButton
                data-testid="graduation-item-move-down"
                aria-label="move-down"
                disabled={!canMoveDown}
                onClick={moveDown}
              >
                <ArrowDownward fontSize="small" />
              </IconButton>
            </ShortcutHint>
          </>
        ) : (
          <>
            <IconButton
              data-testid="graduation-item-save"
              aria-label="save-graduation"
              sx={{ "&:hover": { color: "primary.main" } }}
              onClick={handleSave}
            >
              <SaveSharp />
            </IconButton>
            <IconButton
              data-testid="graduation-item-cancel"
              aria-label="cancel-edit-graduation"
              sx={{ "&:hover": { color: "error.main" } }}
              onClick={handleCancel}
            >
              <CancelSharp />
            </IconButton>
          </>
        )}
      </Box>
    </ListItem>
  );
}
