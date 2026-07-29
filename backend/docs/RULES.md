# Backend Rules

1. Do not break existing API contracts without versioning + changelog.
2. Keep controllers thin; put logic in services.
3. Always validate auth/org middleware on protected routes.
4. Prefer Sequelize models over raw SQL unless performance requires otherwise.
5. Log external API calls via external-api-log service where applicable.
