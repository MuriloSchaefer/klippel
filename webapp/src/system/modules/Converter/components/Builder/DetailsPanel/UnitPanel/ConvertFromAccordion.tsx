import CallReceivedSharpIcon from "@mui/icons-material/CallReceivedSharp";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IGraphModule } from "@kernel/modules/Graphs";

import useConverterManager from '../../../../hooks/useConverterManager';


const ConvertFromAccordion = () => {
    const layoutModule = useModule<ILayoutModule>("Layout");
    const graphModule = useModule<IGraphModule>("Graph");
  
    const { useGraph } = graphModule.hooks;
  
    const manager = useConverterManager((s) => s.selectedNode);
    
  
    const { Accordion } = layoutModule.components;
    return <Accordion
    name="Converte de"
    icon={<CallReceivedSharpIcon />}
    summary={`Quais unidades podem ser convertidas em ${manager.state}`}
  >
    <></>
  </Accordion>
}

export default ConvertFromAccordion