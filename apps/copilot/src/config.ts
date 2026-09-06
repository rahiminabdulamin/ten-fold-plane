const DEFAULT_PORT = 8200;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_REQUESTS_PER_MINUTE = 60;

export interface CopilotConfig {
  openAiApiKey: string;
  intelligenceApiKey: string;
  identityTokenSecret: string;
  allowedOrigins: string[];
  port: number;
  requestTimeoutMs: number;
  maxRequestsPerMinute: number;
}

function required(
  environment: NodeJS.ProcessEnv,
  key: "OPENAI_API_KEY" | "CPK_INTELLIGENCE_API_KEY" | "COPILOT_IDENTITY_TOKEN_SECRET"
): string {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readConfig(environment: NodeJS.ProcessEnv): CopilotConfig {
  const origins = (environment.COPILOT_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (!origins.length) throw new Error("COPILOT_ALLOWED_ORIGINS must include at least one origin");

  return {
    openAiApiKey: required(environment, "OPENAI_API_KEY"),
    intelligenceApiKey: required(environment, "CPK_INTELLIGENCE_API_KEY"),
    identityTokenSecret: required(environment, "COPILOT_IDENTITY_TOKEN_SECRET"),
    allowedOrigins: [...new Set(origins)],
    port: positiveInteger(environment.COPILOT_PORT, DEFAULT_PORT),
    requestTimeoutMs: positiveInteger(environment.COPILOT_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxRequestsPerMinute: positiveInteger(environment.COPILOT_MAX_REQUESTS_PER_MINUTE, DEFAULT_REQUESTS_PER_MINUTE),
  };
}
