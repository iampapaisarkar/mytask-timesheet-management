# Error Handling

- Controllers typically `return res.status(4xx|5xx).json({ message })`.
- Global Express error middleware returns `{ error: err.message }` with 500.
- Auth failures: **401** with empty body or `Unauthorized HTTP Request!`
- Missing org: **400** `Organisation ID missing.` / `Invalid Organisation.`
- Frontend should read `info.message` and `message` fields.
