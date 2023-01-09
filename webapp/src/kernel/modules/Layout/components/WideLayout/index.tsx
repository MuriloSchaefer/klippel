import useModule from "@kernel/hooks/useModule"
import { Store } from "@kernel/modules/Store"
import { selectTheme } from "../../store/selectors"

const Layout = () => {

    const storeModule = useModule<Store>('Store')
    const {useAppSelector} = storeModule.hooks

    const theme = useAppSelector(selectTheme)
    console.log(theme)
    return <div role='layout-root'>{theme}</div>
}

export default Layout