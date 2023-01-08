import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"
import { selectTheme } from "../store/selectors"

const LayoutProvider = () => {

    const storeModule = useModule<Store>('Store')
    const {useAppSelector} = storeModule.hooks

    const theme = useAppSelector(selectTheme)
    console.log(theme)

    return <div>{theme}</div>
}

export default LayoutProvider