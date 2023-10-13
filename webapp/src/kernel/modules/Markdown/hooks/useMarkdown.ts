import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";
import { getMarkdown } from "../store/selectors";

export default (path: string) => {

    const storeModule = useModule<Store>("Store");

    const {useAppSelector} = storeModule.hooks;

    const state = useAppSelector(getMarkdown(path))

  return state;
};
