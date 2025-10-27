import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { Store } from "@kernel/modules/Store";
import { selectPart } from "../store/variations/actions";
import { ComposerModuleState, PartNode } from "../typings";
import { EdgeMap } from "@kernel/modules/Graphs/hooks/useGraph";

export default function useVariation({ variationId }: { variationId: string }) {
  const storeModule = useModule<Store>("Store");
  const dispatch = storeModule.hooks.useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;

  const state = useAppSelector(
    (state: { Composer: ComposerModuleState }) => state.Composer.variations[variationId]
  );
  const graph = useGraph(variationId, (g) => g && g);
  return {
    state: state,
    actions: {
      selectPart: (partId: string) => {
        console.log("select part", partId);
        dispatch(selectPart({ variationId, partId }));
      },
      addPart: (name: string, parentId: string) => {
        console.log("add part", name);
        let id = name.toLowerCase().replace(/\s+/g, "-");
        let i = 1;
        while (id in Object.keys(graph.state?.nodes || {})) {
          id += "-" + i;
          i++;
        }

        const node: PartNode = {
          id: id,
          type: "PART",
          label: name,
          position: { x: 0, y: 0 },
        };

        const edges: EdgeMap = {
          inputs: {
            [`${parentId}-${id}`]: {
              id: `${parentId}-${id}`,
              type: "HAS_PART",
              sourceId: parentId,
              targetId: id,
            },
          },
          outputs: {
            [`${id}-${parentId}`]: {
              id: `${id}-${parentId}`,
              type: "PART_OF",
              sourceId: id,
              targetId: parentId,
            },
          },
        };

        graph.actions.addNode(node, edges);
      },
      removePart: (partId: string) => graph.actions.removeNode(partId)
    },
  };
}
