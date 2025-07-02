import useModule from "@kernel/hooks/useModule";
import { Model } from "../typings";
import { Store } from "@kernel/modules/Store";
import { createModel, listModels, openModel } from "../store/models/actions";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IGraphModule } from "@kernel/modules/Graphs";

export default function useModelsManager() {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");
  const { useAppDispatch } = storeModule.hooks;
  const { useViewportManager } = layoutModule.hooks;
  const { graphs } = graphModule.managers;

  const dispatch = useAppDispatch();
  const viewportManager = useViewportManager();
  const graphsManager = graphs()

  return {
    createModel: (model: Pick<Model, "id" | "name">) => {
      dispatch(createModel(model));
    },
    listModels: () => {
      dispatch(listModels());
    },
    openModel: (model: Model) => {
      viewportManager.functions.addViewport(
        model.name,
        "ModelViewport",
        undefined,
        'model',
        {id: model.id}
      );
      graphsManager.functions.createGraph(model.id)
      dispatch(openModel({model}));
    },
  };
}
