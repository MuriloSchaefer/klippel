import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import {  selectMaterialTypes } from "../store/materialTypes/selectors";
import { MaterialTypesState } from "../store/materialTypes/state";



export default (): MaterialTypesState =>{
    const storeModule = useModule<Store>("Store");
    const { useAppSelector } = storeModule.hooks;

    const materialTypes = useAppSelector(selectMaterialTypes)
    return materialTypes
}