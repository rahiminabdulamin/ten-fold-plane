import {
  classifyToolError,
  type ToolResult,
  toolResult,
  toolUncertainResult,
  toolValidationError,
} from "./tool-contracts";

const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        // oxlint-disable-next-line unicorn/prefer-array-to-sorted -- web targets ES2022.
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalize(nested)])
    );
  return value;
};

export function mutationFingerprint(operation: string, ...parts: unknown[]): string {
  return JSON.stringify([operation, ...parts.map(normalize)]);
}

export class MutationGuard {
  private readonly inFlight = new Set<string>();

  async run<T>(fingerprint: string, mutation: () => Promise<T>, operation = "mutation"): Promise<T | ToolResult> {
    if (this.inFlight.has(fingerprint))
      return toolValidationError(operation, "An identical change is already in progress.");
    this.inFlight.add(fingerprint);
    try {
      return await mutation();
    } finally {
      this.inFlight.delete(fingerprint);
    }
  }
}

export function isCanonicalRecord(value: unknown): value is { id: string; name: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" && record.id.length > 0 && typeof record.name === "string" && record.name.length > 0
  );
}

const comparable = (value: unknown) => {
  if (!Array.isArray(value)) return value;
  // oxlint-disable-next-line unicorn/prefer-array-to-sorted -- web targets ES2022.
  return [...value].toSorted();
};

export function requestedFieldsMatch(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  return Object.entries(expected).every(
    ([key, value]) =>
      Object.is(comparable(actual[key]), comparable(value)) ||
      JSON.stringify(comparable(actual[key])) === JSON.stringify(comparable(value))
  );
}

export async function confirmDeleted(
  operation: string,
  affectedId: string,
  retrieve: () => Promise<unknown>
): Promise<ToolResult> {
  try {
    await retrieve();
    return toolUncertainResult(operation, [affectedId]);
  } catch (error) {
    if (classifyToolError(error).category === "not_found")
      return toolResult(operation, "Deletion verified.", [affectedId]);
    return toolUncertainResult(operation, [affectedId]);
  }
}

type OutcomeLogger = (entry: {
  correlationId: string;
  operation: string;
  status: ToolResult["status"];
  errorCategory?: ToolResult["errorCategory"];
  durationMs: number;
  affectedCount: number;
}) => void;

export function logToolOutcome(
  result: ToolResult,
  options: {
    correlationId: string;
    startedAt: number;
    now?: () => number;
    logger?: OutcomeLogger;
  }
): void {
  const { correlationId, startedAt, now = Date.now, logger = console.info } = options;
  logger({
    correlationId,
    operation: result.operation,
    status: result.status,
    ...(result.errorCategory ? { errorCategory: result.errorCategory } : {}),
    durationMs: Math.max(0, now() - startedAt),
    affectedCount: result.affectedIds.length,
  });
}
