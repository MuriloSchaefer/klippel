import { useContext } from "react";
import { RxDBContext, RxDBRegistry } from "../contexts/RxDBRegistry";
import { createRxDatabase, DexieSettings } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

export type DBManager = {
  createDB: (name: string, settings?: DexieSettings) => Promise<void>;
  deleteDB: (name: string) => Promise<void>;
};

/**
 * Returns the DB manager
 * @returns
 */
export default function useDBManager(): DBManager {
  const { setInstances } = useContext(RxDBContext);

  return {
    createDB: async (name, settings) => {
      const db = await createRxDatabase({
        name: name,
        storage: getRxStorageDexie(settings),
      });
      setInstances((old) => ({ ...old, [name]: db }));
    },
    deleteDB: async (name) => {
      setInstances((old) =>
        Object.entries(old).reduce(
          (acc, [entry, db]) =>
            entry !== name ? { ...acc, [entry]: db } : acc,
          {} as RxDBRegistry['instances']
        )
      );
    },
  };
}
