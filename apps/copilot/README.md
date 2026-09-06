# Copilot runtime

`apps/copilot` is the server-side CopilotKit runtime for Plane's static web SPA.

Run it locally with:

```sh
pnpm --filter @plane/copilot dev
```

It reads `OPENAI_API_KEY` from the repository `.env` and
`CPK_INTELLIGENCE_API_KEY` from `apps/copilot/.env`. Neither variable belongs
in a browser-visible `VITE_*` setting.

Set the same high-entropy `COPILOT_IDENTITY_TOKEN_SECRET` in the Plane API and
this runtime. Plane issues five-minute signed identity tokens; the browser keeps
them only in memory and the runtime verifies them before serving CopilotKit.
Generate it with `openssl rand -base64 48`; do not use `SECRET_KEY` or a
browser-visible `VITE_*` variable.

Set `VITE_COPILOTKIT_RUNTIME_URL` for `apps/web`; the local default is
`http://localhost:8200/api/copilotkit`. Configure `COPILOT_ALLOWED_ORIGINS`
for deployed web origins.

The runtime never receives Plane browser cookies or calls Plane CRUD APIs.
