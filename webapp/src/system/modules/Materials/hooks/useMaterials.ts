import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { selectMaterials } from "../store/materials/selectors";
import { MaterialsState, MaterialState } from "../store/materials/state";

export default function (materials: number[]) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const mat = useAppSelector(
    selectMaterials((state) =>
      Object.values(state).reduce((acc, curr: MaterialState) => {
        if (materials.includes(curr.id)) {
            acc[curr.id] = curr
            return acc
        }
        return acc
      }, {} as MaterialsState)
    )
  );
  return mat;
}
