import React, {
  createContext,
  useMemo,
  useState,
  useLayoutEffect,
} from "react";
import {
  createRxDatabase,
  RxDatabase,
  addRxPlugin,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

import { wrappedKeyEncryptionCryptoJsStorage } from "rxdb/plugins/encryption-crypto-js";
import { wrappedAttachmentsCompressionStorage } from "rxdb/plugins/attachments-compression";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { RxDBAttachmentsPlugin } from "rxdb/plugins/attachments";

addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBAttachmentsPlugin);

// dev mode
// TODO: handle it in the build process
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { SYSTEM_DIR, WORKSPACES_COLLECTION } from "../constants";
import {schema as workspaceSchema} from "../schemas/Workspace";
addRxPlugin(RxDBDevModePlugin);


const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
  storage: getRxStorageDexie(),
});
const compressedStorage = wrappedAttachmentsCompressionStorage({
  storage: encryptedStorage,
});

export const RxDBContext = createContext<RxDatabase|undefined>(undefined);

const initialize = async () => {
  // create RxDB
  const db = await createRxDatabase({
    name: "default",
    storage: compressedStorage,
    password: "at least 12 char pass",
  }).then((db) => {
    if (!db.system) {
      db.addCollections({
        [WORKSPACES_COLLECTION]: {
          schema: workspaceSchema,
          migrationStrategies: {
          },
        },
      }).then(async ({[WORKSPACES_COLLECTION]: workspaces}) => {
        const result = await workspaces
          .find({ selector: { id: "personalWorkspace" } })
          .exec();
        if (!result.length) {
          workspaces.insert({
            id: "personalWorkspace",
            name: "Área de trabalho pessoal",
            isCurrent: true,
            homeDir: `${SYSTEM_DIR}/workspaces/personalWorkspace`,
          });
        }
      });
    }

    return db;
  })

  return db;
}

export const RxDBProvider = ({
  children,
}: {
  children: React.ReactElement;
}) => {
  const [db, setDb] = useState<RxDatabase>();

  useLayoutEffect(() => {
    initialize().then(setDb)
  }, []);

  const memoizedDb = useMemo(
		() => db,
		[db]
	);

  return (
    <RxDBContext.Provider value={memoizedDb}>
      {!!memoizedDb && children}
    </RxDBContext.Provider>
  );
};

export default React.memo(RxDBProvider);
