import useModule from "@kernel/hooks/useModule";
import { Manager } from "@kernel/modules/base";
import { Store } from "@kernel/modules/Store";
import { loadMaterialTypes } from "../store/materialTypes/actions";

interface MaterialsManager extends Manager {
  functions: {
    loadMaterialTypes: () => void;
  };
}

const useMaterialsTypesManager = (): MaterialsManager => {
  const storeModule = useModule<Store>("Store");
  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  return {
    functions: {
        loadMaterialTypes: () => {
            dispatch(loadMaterialTypes({}))
        }
    },
  };
};

export default useMaterialsTypesManager;
