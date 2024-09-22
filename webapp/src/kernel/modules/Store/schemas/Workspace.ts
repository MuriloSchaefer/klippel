import { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema, toTypedRxJsonSchema, type CompressionMode } from "rxdb";
import { WORKSPACES_COLLECTION } from "../constants";

export const schema = {
  title: WORKSPACES_COLLECTION,
  type: "object",
  version: 0,
  description: "Hold workspaces metadata information.",
  primaryKey: "id",
  required: ["id", "homeDir"],
  properties: {
    id: { type: "string", maxLength: 36 },
    externalId: { type: "string" },
    name: { type: "string" },
    homeDir: { type: "string" },
    description: { type: "string" },
    isCurrent: {type: 'boolean'},
    logo: { type: "string" },
  },
  attachments: { encrypted: true, compression: "gzip" as CompressionMode },
} as const;

const typed = toTypedRxJsonSchema(schema);
export type Workspace = ExtractDocumentTypeFromTypedRxJsonSchema<typeof typed>;

export default schema as RxJsonSchema<Workspace>