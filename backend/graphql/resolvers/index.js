import fs from "fs";
import path from "path";

const resolversDir = path.resolve("./graphql/resolvers");

const resolverFiles = fs
  .readdirSync(resolversDir)
  .filter((f) => f.endsWith(".js") && f !== "index.js");

const resolvers = {};

for (const file of resolverFiles) {
  const module = await import(path.join(resolversDir, file));
  const resolver = module.default || module[Object.keys(module)[0]];
  Object.assign(resolvers, resolver); // merge each resolver into single object
}

export { resolvers };
