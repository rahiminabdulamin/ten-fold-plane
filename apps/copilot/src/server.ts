import { createServer as createHttpServer } from "node:http";

import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";

import type { CopilotConfig } from "./config";
import { verifyIdentityToken } from "./identity";
import { createRuntime } from "./runtime";

export function createServer(config: CopilotConfig) {
  const copilot = createCopilotNodeListener({
    runtime: createRuntime(config),
    basePath: "/api/copilotkit",
    cors: { origin: config.allowedOrigins },
    hooks: {
      onRequest: ({ request }) => {
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        let user: { id: string; name: string };
        try {
          user = verifyIdentityToken(authorization.slice(7), config.identityTokenSecret);
        } catch {
          throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const headers = new Headers(request.headers);
        headers.delete("authorization");
        headers.set("x-plane-copilot-user-id", user.id);
        headers.set("x-plane-copilot-user-name", user.name);
        return new Request(request, { headers });
      },
    },
  });

  return createHttpServer((request, response) => {
    if (request.url === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"status":"ok"}');
      return;
    }
    copilot(request, response);
  });
}
