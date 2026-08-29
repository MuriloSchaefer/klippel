import React, { useMemo } from "react";
import { Box, Divider, Link, Typography } from "@mui/material";

import useMaterialTypes from "../../../hooks/useMaterialTypes";
import useUnitLabel from "../../../hooks/useUnitLabel";
import type { MaterialState } from "../../../store/materials/state";
import { resolveTypeSchema } from "../../../store/materialTypes/resolveTypeSchema";

interface Props {
  material: MaterialState;
}

const isHex = (v: unknown): v is string =>
  typeof v === "string" && /^#?[0-9a-fA-F]{3,8}$/.test(v);

const hexOf = (v: unknown): string | undefined => {
  const o = (v ?? {}) as Record<string, unknown>;
  if (!isHex(o.hex)) return undefined;
  const raw = String(o.hex);
  return raw.startsWith("#") ? raw : `#${raw}`;
};

/**
 * Render one attribute value. Values come from a type schema, so they are
 * heterogeneous by design: scalars, `{ label, hex }` colours, and
 * `{ amount, unit }` measures all appear side by side.
 */
const renderValue = (value: unknown): React.ReactNode => {
  if (value == null || value === "") return "—";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const hex = hexOf(o);
    if (hex) {
      return (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          <Box
            component="span"
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.5,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: hex,
              flex: "0 0 auto",
            }}
          />
          <span>{typeof o.label === "string" && o.label ? o.label : hex}</span>
        </Box>
      );
    }
    if (typeof o.label === "string") return o.label;
    if (typeof o.amount === "number" && typeof o.unit === "string") {
      return `${o.amount} ${o.unit}`;
    }
  }
  return JSON.stringify(value);
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ wordBreak: "break-word" }}>
      {children}
    </Typography>
  </Box>
);

/**
 * Read-only detail card for the row selected in the stock table. Editing
 * still routes through the Update form in the row's actions column — this
 * panel exists so the columns the table has to clip (description, full
 * attribute map, composition, supplier links) are readable somewhere.
 */
const MaterialDetails: React.FC<Props> = ({ material }) => {
  const materialTypes = useMaterialTypes();
  const unitLabel = useUnitLabel();

  const type = materialTypes?.[material.type];
  const schema = useMemo(
    () =>
      material.schemaVersion
        ? type?.schemas?.[material.schemaVersion] ??
          resolveTypeSchema(type, material.schemaVersion)
        : resolveTypeSchema(type, material.schemaVersion),
    [type, material.schemaVersion],
  );

  const title =
    material.attributes?.nome ??
    material.attributes?.categoria ??
    material.externalId ??
    material.id;

  const attributes = useMemo(
    () => Object.entries(material.attributes ?? {}).filter(([, v]) => v != null),
    [material.attributes],
  );

  const composition = useMemo(
    () => Object.entries(material.composition ?? {}).filter(([, v]) => v != null),
    [material.composition],
  );

  const caracteristics = useMemo(
    () =>
      Object.entries(material.caracteristics ?? {}).filter(([, v]) => v != null),
    [material.caracteristics],
  );

  const suppliers = (material.suppliers ?? []).filter(
    (s) => s && s !== material.industry,
  );

  return (
    <Box
      data-testid="material-details"
      data-material-id={material.id}
      sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", minWidth: 0 }}>
        {material.imageURL && (
          <Box
            component="img"
            src={material.imageURL}
            alt={String(title)}
            sx={{
              width: 64,
              height: 64,
              objectFit: "cover",
              borderRadius: 0.5,
              border: "1px solid",
              borderColor: "divider",
              flex: "0 0 auto",
            }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ wordBreak: "break-word" }}>
            {String(title)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {type?.label ?? material.type}
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 1,
        }}
      >
        <Field label="Estoque">
          {`${(material.stock?.amount ?? 0).toLocaleString()} ${unitLabel(
            material.stock?.unit,
          )}`.trim()}
        </Field>
        {schema?.consumptionUnit && (
          <Field label="Un. consumo">{unitLabel(schema.consumptionUnit)}</Field>
        )}
        <Field label="Indústria">{material.industry || "—"}</Field>
        {suppliers.length > 0 && (
          <Field label="Fornecedores">{suppliers.join(", ")}</Field>
        )}
        <Field label="ID">{material.id}</Field>
        {material.externalId && (
          <Field label="Código externo">
            {material.externalURL ? (
              <Link
                href={material.externalURL}
                target="_blank"
                rel="noreferrer"
                underline="hover"
              >
                {material.externalId}
              </Link>
            ) : (
              material.externalId
            )}
          </Field>
        )}
      </Box>

      {material.description && (
        <>
          <Divider />
          <Field label="Descrição">{material.description}</Field>
        </>
      )}

      {attributes.length > 0 && (
        <>
          <Divider />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 1,
            }}
          >
            {attributes.map(([key, value]) => (
              <Field key={key} label={key}>
                {renderValue(value)}
              </Field>
            ))}
          </Box>
        </>
      )}

      {composition.length > 0 && (
        <>
          <Divider />
          <Field label="Composição">
            {composition.map(([fiber, pct]) => `${fiber} ${pct}%`).join(" · ")}
          </Field>
        </>
      )}

      {caracteristics.length > 0 && (
        <>
          <Divider />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 1,
            }}
          >
            {caracteristics.map(([key, value]) => (
              <Field key={key} label={key}>
                {renderValue(value)}
              </Field>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default React.memo(MaterialDetails);
