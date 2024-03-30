import List from "@mui/material/List";
import CallReceivedSharpIcon from "@mui/icons-material/CallReceivedSharp";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";

import useConverterManager from "../../../../../hooks/useConverterManager";
import useUnits from "../../../../../hooks/useUnits";
import AddConversionButton from "../../addConversionButton";
import ConversionList from "../../ConversionList";

const ConvertToAccordion = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const manager = useConverterManager((s) => s.selectedNode);
  const units = useUnits([manager.state!]);

  if (!units || !manager.state) throw Error("units should be available");
  const unit = units[manager.state];

  const { Accordion } = layoutModule.components;
  return (
    <Accordion
      name="Converte para"
      icon={<CallReceivedSharpIcon sx={{transform: 'rotate(180)'}}/>}
      summary={`${unit.name} pode ser convertida em`}
      sx={{flexGrow: 1}}
    >

    <List sx={{ width: "100%" }} role="converts-to-list">
      <AddConversionButton from={unit.id} />
      <ConversionList  unitId={unit.id} type="outputs"/>
    </List>
      
    </Accordion>
  );
};

export default ConvertToAccordion;
