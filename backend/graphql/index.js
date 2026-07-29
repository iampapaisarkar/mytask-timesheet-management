// import { schema } from "./schema.js";
// import { resolvers } from "./resolvers.js";
import { schema } from "./schemas/index.js";
import { resolvers } from "./resolvers/index.js";
import { context } from "./context.js";
import { graphqlHTTP } from "express-graphql";

export default function setupGraphQL(app) {
  app.use(
    "/api/graphql",
    graphqlHTTP(async (req) => ({
      schema,
      rootValue: resolvers,
      graphiql: true, // enable UI for testing
      context: await context({ req }),
    }))
  );
}
