import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"
import { ComposerModuleState } from "../typings"
import { uploadView } from "../store/variations/actions"
import { saveModel } from "../store/models/actions"




export default function useVariation(variationId: string){
    const storeModule = useModule<Store>('Store')
    const {useAppSelector, useAppDispatch} = storeModule.hooks

    const dispatch = useAppDispatch()
    const variation = useAppSelector((state: {Composer: ComposerModuleState}) => state.Composer.variations[variationId])
    return {
        state: variation,
        actions: {
            uploadView:(file: File)=>{
                console.log(file)
                dispatch(uploadView({variationId, file}))
            },
            saveAsModel: ()=>{
                dispatch(saveModel(variation))
            }
        }
    }
}