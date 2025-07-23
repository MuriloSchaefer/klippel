import useModule from "@kernel/hooks/useModule";
import { type ILayoutModule } from "@kernel/modules/Layout";
import { Box } from "@mui/material";
import useModelsManager from "../../../hooks/useModelsManager";
import useModel from "../../../hooks/useModel";




export default function VisualView(){

    const layoutModule = useModule<ILayoutModule>("Layout");
    const { useActiveViewport} = layoutModule.hooks;
    const viewport = useActiveViewport();

    const model = useModel(viewport.extra.id)
    console.log(model)
    return <Box>

    </Box>
}