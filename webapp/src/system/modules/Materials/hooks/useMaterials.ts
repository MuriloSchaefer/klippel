import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { selectMaterials } from "../store/materials/selectors";
import { MaterialsState } from "../store/materials/state";
import { useMemo } from "react";


    
export default function (materials?: string[]) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const defaultSelector = useMemo(() => {
    if (!materials) return undefined

    return (state: MaterialsState) =>
      materials.reduce((acc, curr: string) => {
        if (!materials.includes(curr)) {
            delete acc[curr]
            return acc
        }
        return acc
      }, state)
  }, [materials] )

  const mat = useAppSelector(selectMaterials(defaultSelector));
  return mat;
}
