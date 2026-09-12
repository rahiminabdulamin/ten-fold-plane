import { describe, expect, it } from "vitest";
import type { TSpreadsheetDocument } from "@/services/spreadsheet.service";
import { filterAndSortSpreadsheetDocuments } from "./spreadsheet-list";

const document = (overrides: Partial<TSpreadsheetDocument>): TSpreadsheetDocument => ({
  id: "1",
  name: "Budget",
  document_type: "sheet",
  status: "ready",
  last_error_code: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  created_by: null,
  publication: null,
  ...overrides,
});

describe("filterAndSortSpreadsheetDocuments", () => {
  it("combines case-insensitive search and status filtering", () => {
    const items = [
      document({ id: "1", name: "Launch Budget" }),
      document({ id: "2", name: "Launch Plan", status: "degraded" }),
      document({ id: "3", name: "Notes" }),
    ];

    expect(filterAndSortSpreadsheetDocuments(items, "LAUNCH", "ready", "updated-desc").map(({ id }) => id)).toEqual([
      "1",
    ]);
  });

  it("sorts names without mutating the source collection", () => {
    const items = [document({ id: "2", name: "Zulu" }), document({ id: "1", name: "Alpha" })];

    expect(filterAndSortSpreadsheetDocuments(items, "", "all", "name-asc").map(({ id }) => id)).toEqual(["1", "2"]);
    expect(items.map(({ id }) => id)).toEqual(["2", "1"]);
  });
});
