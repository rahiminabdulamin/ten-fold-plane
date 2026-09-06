# Copilot runtime

`apps/copilot` is the server-side CopilotKit runtime for Plane's static web SPA.

Run it locally with:

```sh
pnpm --filter @plane/copilot dev
```

It reads `OPENAI_API_KEY` from the repository `.env` and
`CPK_INTELLIGENCE_API_KEY` from `apps/copilot/.env`. Neither variable belongs
in a browser-visible `VITE_*` setting.

Set `VITE_COPILOTKIT_RUNTIME_URL` for `apps/web`; the local default is
`http://localhost:8200/api/copilotkit`. Configure `COPILOT_ALLOWED_ORIGINS`
for deployed web origins.

The current identity callback is deliberately local-development-only. Before
production deployment, replace it with a server-verified Plane identity at the
runtime boundary. The runtime must not receive Plane browser cookies or call
Plane CRUD APIs.
