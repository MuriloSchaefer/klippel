import React, { createContext, useMemo, useState, useLayoutEffect } from "react";
import { createRxDatabase, RxDatabase, addRxPlugin } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';

addRxPlugin(RxDBMigrationSchemaPlugin)

// dev mode
// TODO: handle it in the build process
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { HOME_DIR } from "../constants";
addRxPlugin(RxDBDevModePlugin);

export type RxDBRegistry = {
  instances: {
    [name: string]: RxDatabase | undefined;
  };
  setInstances: React.Dispatch<React.SetStateAction<RxDBRegistry["instances"]>>;
};

export const RxDBContext = createContext<RxDBRegistry>({
  instances: {},
  setInstances: () => {},
});

export const RxDBProvider = ({
  children,
}: {
  children: React.ReactElement;
}) => {
  const [instances, setInstances] = useState<RxDBRegistry["instances"]>({
    default: undefined,
  });

  useLayoutEffect(() => {
    if (!instances.default) {
      const createDB = async () => {
        const db = await createRxDatabase({
          name: "default",
          storage: getRxStorageDexie({}),
        }).then(db => {
          db.addCollections({
            system: {
              schema: {
                title: 'system',
                type: "object",
                version: 0,
                description: 'Hold system metadata information.',
                primaryKey: 'id',
                properties: {
                  id: {type: 'string', maxLength: 36},
                  name: {type: 'string'},
                  homeDir: {type: 'string'},
                  description: {type: 'string'}
                }
              }
            }
          }).then(async ({system})=>{
            const result = await system.find({selector: {id:'personalWorkspace'}}).exec()
            if (!result.length){
              system.insert({
                id: 'personalWorkspace',
                name: 'Personal Workspace',
                homeDir: HOME_DIR
              })
            }
          })
          return db
        })
        setInstances((old) => ({
          ...old,
          default: db,
        }));
      };
      createDB();
    }
  }, [instances.default]);

  const memoizedValues = useMemo(
    () => ({ instances, setInstances }),
    [instances, setInstances]
  );

  return (
    <RxDBContext.Provider value={memoizedValues}>
      {instances.default && children}
    </RxDBContext.Provider>
  );
};

export default React.memo(RxDBProvider);
