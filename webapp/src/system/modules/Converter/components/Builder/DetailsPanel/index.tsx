


import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import UnitPanel from "./UnitPanel";


export const DetailsPanel = ()=> {
    const layoutModule = useModule<ILayoutModule>("Layout");

    const { DetailsPanel } = layoutModule.components;
  
    return (
      <DetailsPanel>
        <UnitPanel />
      </DetailsPanel>
    );
}

export default DetailsPanel