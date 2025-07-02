import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { Model } from "../typings";
import { selectComposer } from "../store/models/selectors";

export default function useModelsList() {
  const store = useModule<Store>("Store");

  const models = store.hooks.useAppSelector<Model[]>(
    selectComposer((s) => Object.values(s.models))
  );

  return models;
}
