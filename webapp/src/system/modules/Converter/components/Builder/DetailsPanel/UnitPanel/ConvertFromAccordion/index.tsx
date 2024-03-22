import CallReceivedSharpIcon from "@mui/icons-material/CallReceivedSharp";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";

import useConverterManager from "../../../../../hooks/useConverterManager";
import useUnits from "../../../../../hooks/useUnits";
import AddConversionButton from "../addConversionButton";

const ConvertFromAccordion = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const manager = useConverterManager((s) => s.selectedNode);
  const units = useUnits([manager.state!]);

  if (!units || !manager.state) throw Error("units should be available");
  const unit = units[manager.state];

  const { Accordion } = layoutModule.components;
  return (
    <Accordion
      name="Converte de"
      icon={<CallReceivedSharpIcon />}
      summary={`Quais unidades podem ser convertidas em ${unit.name}`}
    >
      <AddConversionButton to={unit.id} />
    </Accordion>
  );
};

export default ConvertFromAccordion;
