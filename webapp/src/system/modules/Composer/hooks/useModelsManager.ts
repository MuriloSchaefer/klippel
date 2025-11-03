import useModule from "@kernel/hooks/useModule";
import { Model } from "../typings";
import { Store } from "@kernel/modules/Store";
import { createModel, listModels } from "../store/models/actions";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IGraphModule } from "@kernel/modules/Graphs";
import { openModel } from "../store/variations/actions";
import { uniqueId } from "lodash";

export default function useModelsManager() {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");
  const { useAppDispatch } = storeModule.hooks;
  const { useViewportManager } = layoutModule.hooks;
  const { graphs } = graphModule.managers;

  const dispatch = useAppDispatch();
  const viewportManager = useViewportManager();

  return {
    createModel: (model: Pick<Model, "id" | "name">) => {
      dispatch(createModel(model));
    },
    listModels: () => {
      dispatch(listModels());
    },
    openModel: (model: Model) => {
      const variationId: string = uniqueId("variation-instance-");
      viewportManager.functions.addViewport(
        model.name,
        "ModelViewport",
        undefined,
        "model",
        { id: model.id, variationId, view: 'graph' }
      );
      dispatch(openModel({ model, variationId }));
    },
  };
}
