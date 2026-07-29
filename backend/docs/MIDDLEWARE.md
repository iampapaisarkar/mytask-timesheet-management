# Middleware

| Middleware | Path | Behaviour |
|------------|------|-----------|
| TokenValidate | `middleware/tokenvalidate.js` | Require Bearer; attach user + org header fields to `req.body` |
| OrganisationValidate | `middleware/organisationvalidate.js` | Validate org membership; Redis cache |
| CronValidate | `middleware/cronvalidate.js` | Cron secret protection |

Global: CORS `*`, compression, bodyParser 10mb, response `info` wrapper.
