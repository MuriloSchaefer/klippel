import { Box, IconProps } from "@mui/material";
import { CompoundValue } from "../typings";

interface CoumpoundUnitProps {
  icon?: React.ReactElement<IconProps>;
  value: CompoundValue;
}

export const CompoundUnit = ({ icon, value }: CoumpoundUnitProps) => {
  return (
    <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
      {icon && <div role="coumpound-value-icon">{icon}</div>}
      <div role="coumpound-value-value">
        {value.quotient.amount} {value.quotient.unit} / {value.dividend.amount}{" "}
        {value.dividend.unit}
      </div>
    </Box>
  );
};

export default CompoundUnit