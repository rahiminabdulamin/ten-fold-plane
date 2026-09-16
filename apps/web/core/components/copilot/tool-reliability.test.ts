import { describe, expect, it, vi } from "vitest";

import {
  confirmDeleted,
  isCanonicalRecord,
  logToolOutcome,
  MutationGuard,
  mutationFingerprint,
  requestedFieldsMatch,
} from "./tool-reliability";
import { toolResult } from "./tool-contracts";

describe("copilot tool reliability", () => {
  it("creates the same fingerprint for equivalent object key order", () => {
    expect(mutationFingerprint("update", "team", "project", { b: 2, a: 1 })).toBe(
      mutationFingerprint("update", "team", "project", { a: 1, b: 2 })
    );
    expect(mutationFingerprint("update", "team-a", "project", { a: 1 })).not.toBe(
      mutationFingerprint("update", "team-b", "project", { a: 1 })
    );
  });

  it("suppresses a concurrent duplicate without invoking it", async () => {
    const guard = new MutationGuard();
    let release!: () => void;
    let calls = 0;
    const first = guard.run("same", async () => {
      calls++;
      await new Promise<void>((resolve) => (release = resolve));
      return "created";
    });

    const duplicate = await guard.run("same", async () => "duplicate");

    expect(duplicate).toMatchObject({ ok: false, status: "failure", errorCategory: "validation" });
    expect(calls).toBe(1);
    release();
    await expect(first).resolves.toBe("created");
  });

  it("releases a fingerprint after success or failure", async () => {
    const guard = new MutationGuard();
    await expect(guard.run("success", async () => "first")).resolves.toBe("first");
    await expect(guard.run("success", async () => "second")).resolves.toBe("second");
    await expect(guard.run("failure", async () => Promise.reject(new Error("failed")))).rejects.toThrow("failed");
    await expect(guard.run("failure", async () => "retried")).resolves.toBe("retried");
  });

  it("recognizes only canonical records", () => {
    expect(isCanonicalRecord({ id: "issue-1", name: "Launch" })).toBe(true);
    expect(isCanonicalRecord({ id: "", name: "Launch" })).toBe(false);
    expect(isCanonicalRecord({ id: "issue-1" })).toBe(false);
  });

  it("compares only requested fields and treats arrays as sets", () => {
    expect(
      requestedFieldsMatch({ name: "New", priority: "high", labels: ["b", "a"] }, { name: "New", labels: ["a", "b"] })
    ).toBe(true);
    expect(requestedFieldsMatch({ name: "Old" }, { name: "New" })).toBe(false);
  });

  it("verifies deletion only when retrieval reports not found", async () => {
    await expect(
      confirmDeleted("delete_work_item", "issue-1", async () => Promise.reject({ response: { status: 404 } }))
    ).resolves.toMatchObject({ ok: true, status: "success", affectedIds: ["issue-1"] });
    await expect(confirmDeleted("delete_work_item", "issue-1", async () => ({ id: "issue-1" }))).resolves.toMatchObject(
      { ok: false, status: "uncertain" }
    );
    await expect(
      confirmDeleted("delete_work_item", "issue-1", async () => Promise.reject({ code: "ERR_NETWORK" }))
    ).resolves.toMatchObject({ ok: false, status: "uncertain" });
  });

  it("logs only bounded outcome metadata", () => {
    const logger = vi.fn();
    logToolOutcome(toolResult("create_work_item", "Created secret title.", ["issue-1"]), {
      correlationId: "correlation-1",
      startedAt: 100,
      now: () => 125,
      logger,
    });

    expect(logger).toHaveBeenCalledWith({
      correlationId: "correlation-1",
      operation: "create_work_item",
      status: "success",
      durationMs: 25,
      affectedCount: 1,
    });
    expect(JSON.stringify(logger.mock.calls)).not.toContain("secret title");
  });
});
