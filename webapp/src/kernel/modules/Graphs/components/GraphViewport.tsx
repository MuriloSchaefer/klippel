import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import useGraph from "../hooks/useGraph";
import React from "react";

const GraphViewport = ({graphId}: {graphId: string}) =>  {
    const storeModule = useModule<Store>("Store");
    const layoutModule = useModule<ILayoutModule>("Layout");
  
    const graph = useGraph(graphId, g => g);

    return <>test</>
}

export default React.memo(GraphViewport);