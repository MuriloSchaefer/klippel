import { useLayoutEffect } from "react";

import useModule from "@kernel/hooks/useModule";
import type { Store } from "@kernel/modules/Store";

import useCompositionsManager from "./useCompositionsManager";
import { Product } from "../interfaces";
import { RxDocument } from "rxdb";


export const useCompositionsList = (): Promise<RxDocument<Product>[]> => {
  const storeModule = useModule<Store>("Store");

  const { useCollection } = storeModule.hooks;

  const products = useCollection<Product>('products');
  console.log(products)
  const compositionManager = useCompositionsManager();

  const query = products.find()
  

  useLayoutEffect(() => {
    compositionManager.functions.listCompositions();
  }, []);

  return query;
};

export default useCompositionsManager;
