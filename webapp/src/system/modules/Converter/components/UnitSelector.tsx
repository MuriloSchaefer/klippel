import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import { ConversionGraph, NodeNScale, ScaleNode, UnitNode } from "../typings";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { useMemo } from "react";
import FormControl, { FormControlProps } from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectProps } from "@mui/material/Select";
import { ListSubheader, Typography } from "@mui/material";

type UnitSelectorProps = SelectProps<string> & {
  value?: string;
  filterUnits?: (unit: UnitNode, scale?: ScaleNode) => boolean;
  formControlProps?: FormControlProps;
};

type NotGrouped = { type: "WITHOUT_SCALE"; name: "Diversos"; id: "noScale" };

const UnitSelector = ({
  value,
  onChange,
  filterUnits = () => true,
  formControlProps,
  ...props
}: UnitSelectorProps) => {
  const graphModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphModule.hooks;

  const storedState = useGraph<ConversionGraph, NodeNScale[]>(
    CONVERSION_GRAPH_NAME,
    (g) =>
      Object.values(g?.nodes ?? {})
        .filter(
          (n): n is UnitNode => n.type === "UNIT" || n.type === "COMPOUND_UNIT"
        )
        .map((node) => ({
          ...node,
          scale: Object.values(g?.nodes ?? {})
            .filter((n): n is ScaleNode => n.type === "SCALE")
            .find((s) =>
              g?.adjacencyList[node.id].outputs.includes(
                `${node.id} -> ${s.id}`
              )
            ),
        }))
  );

  const filteredUnits = useMemo(
    () =>
      storedState?.state?.filter((unit) => filterUnits(unit, unit.scale)) ?? [],
    [storedState.state, filterUnits]
  );
  const groupedUnits = useMemo(() => {
    return filteredUnits.reduce(
      (acc, curr) => {
        let group = curr.scale
          ? curr.scale
          : ({
              type: "WITHOUT_SCALE",
              name: "Diversos",
              id: "noScale",
            } as NotGrouped);

        return {
          ...acc,
          groups: {
            ...acc.groups,
            [group.id]: group,
          },
          groupedUnits: {
            ...acc.groupedUnits,
            [group.id]: { ...acc.groupedUnits[group.id], [curr.id]: curr },
          },
        };
      },
      { groups: {}, groupedUnits: {} } as {
        groups: {
          [id: string]: ScaleNode | NotGrouped;
        };
        groupedUnits: { [scaleId: string]: { [unitId: string]: UnitNode } };
      }
    );
  }, [filteredUnits]);

  return (
    <FormControl {...formControlProps}>
      <Select
        id="unit-selector"
        inputProps={{ id: "unit" }}
        size="small"
        sx={{ width: "max(min-content, 100px)", minWidth: 100 }}
        onChange={(e, c) => {
          console.log(e);
          onChange?.(e, c);
        }}
        value={value}
        {...props}
      >
        {Object.values(groupedUnits.groups).map(({ id, name }) => [
          <ListSubheader key={`name-${id}`}>{name}</ListSubheader>,
          Object.values(groupedUnits.groupedUnits[id]).map(
            ({ id, name, abbreviation, label }) => (
              <MenuItem key={id} value={id} sx={{display: 'flex', gap:1, alignItems: 'center'}}>
                <Typography>{abbreviation}</Typography>
                <Typography sx={{ fontSize: 12, opacity: 0.5 }}>
                  ({name})
                </Typography>
              </MenuItem>
            )
          ),
        ])}
      </Select>
    </FormControl>
  );
};

export default UnitSelector;