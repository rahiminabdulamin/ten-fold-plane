import { describe, expect, it } from "vitest";
import { isSpreadsheetProvisioning } from "./spreadsheet.service";

describe("isSpreadsheetProvisioning", () => {
  it("retries the normal provisioning launch response", () => {
    expect(isSpreadsheetProvisioning({ response: { data: { status: "provisioning" } } })).toBe(true);
  });

  it("does not retry an unavailable spreadsheet service", () => {
    expect(isSpreadsheetProvisioning({ response: { data: { status: "degraded" } } })).toBe(false);
  });
});
