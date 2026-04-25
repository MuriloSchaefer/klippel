import { useMemo } from "react";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { Model } from "../typings";
import { selectComposer } from "../store/models/selectors";

const modelsListSelector = selectComposer((s) => Object.values(s.models));

export default function useModelsList() {
  const store = useModule<Store>("Store");

  const models = store.hooks.useAppSelector<Model[]>(modelsListSelector);

  return models;
}
