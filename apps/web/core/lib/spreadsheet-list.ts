import type { TSpreadsheetDocument, TSpreadsheetStatus } from "@/services/spreadsheet.service";

export type TSpreadsheetSort = "updated-desc" | "created-desc" | "name-asc" | "name-desc";
export type TSpreadsheetStatusFilter = TSpreadsheetStatus | "all";

export const filterAndSortSpreadsheetDocuments = (
  documents: TSpreadsheetDocument[],
  query: string,
  status: TSpreadsheetStatusFilter,
  sort: TSpreadsheetSort
) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const result = documents.filter(
    (document) =>
      (!normalizedQuery || document.name.toLocaleLowerCase().includes(normalizedQuery)) &&
      (status === "all" || document.status === status)
  );
  // The filtered array is already a copy; sort supports the app's ES target.
  // oxlint-disable-next-line unicorn/no-array-sort
  return result.sort((left, right) => {
    if (sort === "name-asc" || sort === "name-desc") {
      const comparison = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      return sort === "name-asc" ? comparison : -comparison;
    }
    const key = sort === "created-desc" ? "created_at" : "updated_at";
    return Date.parse(right[key]) - Date.parse(left[key]);
  });
};
