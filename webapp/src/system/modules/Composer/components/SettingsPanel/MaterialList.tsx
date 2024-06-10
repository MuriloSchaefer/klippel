import List from "@mui/material/List";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";

//  QUESTION: how to remove modules type dependencies?
import type { IMaterialsModule } from "@system/modules/Materials";

import Item from "./MaterialItem";
import useComposition from "../../hooks/useComposition";
import { MaterialNode } from "../../store/composition/state";
import { useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";

export default () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphsModule = useModule<IGraphModule>("Graph");
  const materialsModule = useModule<IMaterialsModule>("Materials");

  const { useAppSelector } = storeModule.hooks;
  const { useGraph } = graphsModule.hooks;
  const { useMaterials, useMaterialTypes } = materialsModule.hooks;

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const composition = useComposition(
    { viewportName: activeViewport! },
    (c) => c
  );
  const unitQuantity = useMemo(
    () =>
      Object.values(composition.state?.budget?.grades ?? {}).reduce(
        (acc, curr) => acc + curr,
        0
      ),
    [composition]
  );
  const materialNodes = useGraph(activeViewport!, (g) =>
    Object.values(g?.nodes ?? {})
      .filter((n): n is MaterialNode => n.type === "MATERIAL")
      .filter((n) =>
        Object.values(g?.edges ?? {}).find(
          (e) => e.type === "CONSUMES" && e.targetId === n.id
        )
      )
  );
  const materials = useMaterials(
    materialNodes.state?.map((n) => n.materialId) ?? []
  );
  const materialTypes = useMaterialTypes();

  if (!materialNodes.state || !composition.state || !materials)
    return <>test</>; //TODO: add loading

  if (!composition.state.budget) {
    return <>Crie um orçamento primeiro.</>;
  }
  return (
    <List
      role="material-list"
      //sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      {materialNodes.state
        .map((mat) => (
          <ErrorBoundary
            key={mat.id}
            fallback={<>Não foi possivel calcular valor</>}
          >
            <Item
              graphId={activeViewport!}
              nodeId={mat.id}
              quantity={unitQuantity}
              material={materials[mat.materialId]}
              materialType={materialTypes[materials[mat.materialId].type]}
            />
          </ErrorBoundary>
        ))}
    </List>
  );
};
