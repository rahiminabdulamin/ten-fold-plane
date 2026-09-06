import { createServer as createHttpServer } from "node:http";

import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";

import type { CopilotConfig } from "./config";
import { createRuntime } from "./runtime";

export function createServer(config: CopilotConfig) {
  const copilot = createCopilotNodeListener({
    runtime: createRuntime(config),
    basePath: "/api/copilotkit",
    cors: { origin: config.allowedOrigins },
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
