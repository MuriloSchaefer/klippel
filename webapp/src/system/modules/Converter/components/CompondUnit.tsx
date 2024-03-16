import { Box, IconProps } from "@mui/material";
import { CompoundValue } from "../typings";
import useUnits from "../hooks/useUnits";

interface CoumpoundUnitProps {
  icon?: React.ReactElement<IconProps>;
  value: CompoundValue;
}

export const CompoundUnit = ({ icon, value }: CoumpoundUnitProps) => {

  const units = useUnits([value.quotient.unit, value.dividend.unit])

  if (!units) return <></> // TODO: add error handling

  return (
    <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
      {icon && <div role="coumpound-value-icon">{icon}</div>}
      <div role="coumpound-value-value">
        {value.quotient.amount} {units[value.quotient.unit].abbreviation} / {value.dividend.amount}{" "}
        {units[value.dividend.unit].abbreviation}
      </div>
    </Box>
  );
};

export default CompoundUnit