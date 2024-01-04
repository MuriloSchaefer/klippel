import CallReceivedSharpIcon from "@mui/icons-material/CallReceivedSharp";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { IGraphModule } from "@kernel/modules/Graphs";

import useConverterManager from "../../../../hooks/useConverterManager";
import { CONVERSION_GRAPH_NAME } from "../../../../constants";
import type {
  CompoundNode,
  ConversionGraph,
  UnitNode,
} from "../../../../typings";
import PropertiesAccordion from "./PropertiesAccordion";
import ConvertFromAccordion from "./ConvertFromAccordion";

export default () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  

  const { Accordion } = layoutModule.components;

  return (
    <>
      <PropertiesAccordion />
      <ConvertFromAccordion />
      {/* <Accordion
        name="Converte de"
        icon={<CallReceivedSharpIcon />}
        summary={`Quais unidades podem ser convertidas em ${selectedNode.state?.abbreviation}`}
      >
        <></>
      </Accordion>
      <Accordion
        name="Converte para"
        icon={<CallReceivedSharpIcon sx={{ transform: "rotate(180deg)" }} />}
        summary="Para quais unidades é possivel converter"
      >
        <></>
      </Accordion> */}
    </>
  );
};
