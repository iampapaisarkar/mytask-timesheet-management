import fs from "fs";
import path from "path";
// UPDATED: Import 'print' from graphql
import { buildSchema, print } from "graphql";
import { mergeTypeDefs } from "@graphql-tools/merge";

const schemasDir = path.resolve("./graphql/schemas");

const schemaFiles = fs
  .readdirSync(schemasDir)
  .filter((f) => f.endsWith(".js") && f !== "index.js");

const schemas = await Promise.all(
  schemaFiles.map(async (file) => {
    const module = await import(path.join(schemasDir, file));
    // The current schemas file (timesheetDay.js) exports a full GraphQLSchema
    // object, which mergeTypeDefs is designed to handle.
    return module.default || module[Object.keys(module)[0]];
  })
);

const mergedTypeDefs = mergeTypeDefs(schemas);
// FIX: Wrap mergedTypeDefs with print() to convert the AST object to an SDL string
export const schema = buildSchema(print(mergedTypeDefs));
