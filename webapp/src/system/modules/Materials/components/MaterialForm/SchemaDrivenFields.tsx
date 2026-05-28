import React from "react";
import { Box, FormControl, TextField, Typography } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IConverterModule } from "@system/modules/Converter";
import type { AttributeTypes } from "../../store/materialTypes/state";

interface Props {
  /** Attribute definitions keyed by name, value is the declared
   *  `AttributeTypes` (or — for legacy schemas — a string like
   *  `"unitValue"` / `"compoundValue"`). */
  attributes: Record<string, string>;
  /** Current values keyed by attribute name. */
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  /**
   * Dot-prefix used when this block is rendered for a nested object
   * attribute — keeps `data-testid` ids unique across depth.
   */
  pathPrefix?: string;
}

const stringValue = (v: unknown): string =>
  v === undefined || v === null ? "" : String(v);

const numberValue = (v: unknown): string =>
  v === undefined || v === null || Number.isNaN(v as number)
    ? ""
    : String(v);

/**
 * Renders one input per attribute declared in a `MaterialTypeSchema`,
 * switching on `AttributeTypes`:
 *   string  → TextField
 *   number  → numeric TextField
 *   color   → hex TextField + swatch
 *   date    → date TextField
 *   unitValue → numeric amount + Converter `UnitSelector`
 *   object  → recursive nested block
 *
 * `compoundValue` falls back to a JSON TextField for now — the full
 * compound editor (quotient/dividend pickers) lands with the rest of
 * the Phase 3 schema-driven form.
 */
const SchemaDrivenFields: React.FC<Props> = ({
  attributes,
  values,
  onChange,
  pathPrefix = "",
}) => {
  const converterModule = useModule<IConverterModule>("Converter");
  const { UnitSelector, CompoundSelector } = converterModule.components;

  const entries = Object.entries(attributes);
  if (entries.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Este tipo não possui atributos definidos.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {entries.map(([name, declared]) => {
        const t = declared as AttributeTypes | "unitValue" | "compoundValue";
        const current = values?.[name];
        const tid = `material-attr-${pathPrefix}${name}`;

        if (t === "string") {
          return (
            <FormControl key={name} size="small">
              <TextField
                data-testid={tid}
                label={name}
                size="small"
                value={stringValue(current)}
                onChange={(e) => onChange(name, e.target.value)}
              />
            </FormControl>
          );
        }
        if (t === "number") {
          return (
            <FormControl key={name} size="small">
              <TextField
                data-testid={tid}
                label={name}
                size="small"
                type="number"
                value={numberValue(current)}
                onChange={(e) =>
                  onChange(
                    name,
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </FormControl>
          );
        }
        if (t === "color") {
          const color = (current as { hex?: string; label?: string }) ?? {};
          return (
            <Box key={name} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 0.5,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: color.hex ?? "transparent",
                }}
                aria-label={`${name}-swatch`}
              />
              <FormControl size="small" sx={{ flex: 1 }}>
                <TextField
                  data-testid={`${tid}-hex`}
                  label={`${name} (hex)`}
                  size="small"
                  value={color.hex ?? ""}
                  onChange={(e) =>
                    onChange(name, { ...color, hex: e.target.value })
                  }
                />
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <TextField
                  data-testid={`${tid}-label`}
                  label={`${name} (rótulo)`}
                  size="small"
                  value={color.label ?? ""}
                  onChange={(e) =>
                    onChange(name, { ...color, label: e.target.value })
                  }
                />
              </FormControl>
            </Box>
          );
        }
        if (t === "date") {
          return (
            <FormControl key={name} size="small">
              <TextField
                data-testid={tid}
                label={name}
                size="small"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={stringValue(current)}
                onChange={(e) => onChange(name, e.target.value)}
              />
            </FormControl>
          );
        }
        if (t === "unitValue") {
          const v = (current as { amount?: number; unit?: string }) ?? {};
          return (
            <Box key={name} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography variant="caption" sx={{ minWidth: 80 }}>
                {name}
              </Typography>
              <FormControl size="small" sx={{ flex: 1 }}>
                <TextField
                  data-testid={`${tid}-amount`}
                  label="Quantidade"
                  size="small"
                  type="number"
                  value={numberValue(v.amount)}
                  onChange={(e) =>
                    onChange(name, {
                      ...v,
                      amount:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </FormControl>
              <UnitSelector
                data-testid={`${tid}-unit`}
                value={v.unit ?? ""}
                onChange={(e) =>
                  onChange(name, { ...v, unit: String(e.target.value) })
                }
              />
            </Box>
          );
        }
        if (t === "compoundValue") {
          const current_ = current as
            | {
                quotient?: { amount?: number; unit?: string };
                dividend?: { amount?: number; unit?: string };
              }
            | undefined;
          // Default both halves to a numeric-but-empty state so the
          // CompoundSelector's controlled inputs never read undefined.
          const compoundValue = {
            quotient: {
              amount: current_?.quotient?.amount ?? Number.NaN,
              unit: current_?.quotient?.unit ?? "",
            },
            dividend: {
              amount: current_?.dividend?.amount ?? Number.NaN,
              unit: current_?.dividend?.unit ?? "",
            },
          };
          return (
            <Box
              key={name}
              data-testid={tid}
              sx={{ display: "flex", gap: 1, alignItems: "center" }}
            >
              <Typography variant="caption" sx={{ minWidth: 80 }}>
                {name}
              </Typography>
              <CompoundSelector
                value={compoundValue as never}
                onChange={(v) => onChange(name, v)}
              />
            </Box>
          );
        }
        if (t === "object") {
          const nested =
            (current as Record<string, unknown> | undefined) ?? {};
          return (
            <Box
              key={name}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {name}
              </Typography>
              <SchemaDrivenFields
                attributes={{}}
                values={nested}
                onChange={(k, val) =>
                  onChange(name, { ...nested, [k]: val })
                }
                pathPrefix={`${pathPrefix}${name}.`}
              />
            </Box>
          );
        }

        // Fallback: unknown / compoundValue → JSON-edit affordance.
        return (
          <FormControl key={name} size="small">
            <TextField
              data-testid={tid}
              label={`${name} (${t})`}
              size="small"
              multiline
              minRows={1}
              value={current === undefined ? "" : JSON.stringify(current)}
              onChange={(e) => {
                try {
                  onChange(name, JSON.parse(e.target.value));
                } catch {
                  // keep partial input until it parses
                  onChange(name, e.target.value);
                }
              }}
            />
          </FormControl>
        );
      })}
    </Box>
  );
};

export default SchemaDrivenFields;
