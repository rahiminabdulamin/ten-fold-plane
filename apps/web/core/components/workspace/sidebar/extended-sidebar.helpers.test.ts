import { describe, expect, it } from "vitest";
import type { TPersonalNavigationPreferences } from "@plane/types";
import { getDropSortOrder, getPersonalExtendedSidebarItems, getPinnedPersonalItems } from "./extended-sidebar.helpers";

describe("personal extended sidebar items", () => {
  const preferences: TPersonalNavigationPreferences = {
    items: {
      stickies: { enabled: false, sort_order: 300 },
      your_work: { enabled: false, sort_order: 100 },
      drafts: { enabled: false, sort_order: 200 },
    },
  };

  it("keeps every hidden personal destination available from More in saved order", () => {
    const items = getPersonalExtendedSidebarItems(preferences);

    expect(items.map((item) => item.key)).toEqual(["your_work", "drafts", "stickies"]);
    expect(getPinnedPersonalItems(preferences)).toEqual([]);
  });

  it("does not calculate a drop order across navigation groups", () => {
    const items = getPersonalExtendedSidebarItems(preferences);

    expect(getDropSortOrder("personal", "workspace", 0, 0, items)).toBeUndefined();
    expect(getDropSortOrder("personal", "personal", 0, 1, items)).toBe(150);
  });

  it("returns only the user-pinned personal destination for the primary sidebar", () => {
    const pinnedYourWork: TPersonalNavigationPreferences = {
      ...preferences,
      items: {
        ...preferences.items,
        your_work: { ...preferences.items.your_work, enabled: true },
      },
    };

    expect(getPinnedPersonalItems(pinnedYourWork).map((item) => item.key)).toEqual(["your_work"]);
  });
});
