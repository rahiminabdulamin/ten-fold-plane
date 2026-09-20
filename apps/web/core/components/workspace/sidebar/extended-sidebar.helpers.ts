import {
  WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS,
  WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS,
} from "@plane/constants";
import type {
  IWorkspaceSidebarNavigation,
  TPersonalNavigationItemKey,
  TPersonalNavigationPreferences,
} from "@plane/types";

export type TExtendedSidebarGroup = "personal" | "workspace";

export type TExtendedSidebarItem = (typeof WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS)[number] & {
  is_pinned: boolean;
  sort_order: number;
};

const PERSONAL_ITEM_KEYS = ["stickies", "your-work", "drafts"] as const;

const preferenceKeyForItem = (key: (typeof PERSONAL_ITEM_KEYS)[number]): TPersonalNavigationItemKey =>
  key === "your-work" ? "your_work" : key;

export const getPersonalExtendedSidebarItems = (preferences: TPersonalNavigationPreferences): TExtendedSidebarItem[] =>
  // oxlint-disable-next-line oxc/no-map-spread
  PERSONAL_ITEM_KEYS.map((itemKey) => {
    const key = preferenceKeyForItem(itemKey);
    const preference = preferences.items[key];
    return {
      ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS[itemKey],
      is_pinned: preference.enabled,
      sort_order: preference.sort_order,
    };
  }).sort((a, b) => a.sort_order - b.sort_order);

export const getPinnedPersonalItems = (preferences: TPersonalNavigationPreferences): TExtendedSidebarItem[] =>
  getPersonalExtendedSidebarItems(preferences).filter((item) => item.is_pinned);

export const getWorkspaceExtendedSidebarItems = (preferences: IWorkspaceSidebarNavigation): TExtendedSidebarItem[] =>
  // oxlint-disable-next-line oxc/no-map-spread
  WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS.map((item) => ({
    ...item,
    is_pinned: preferences[item.key]?.is_pinned ?? false,
    sort_order: preferences[item.key]?.sort_order ?? 0,
  })).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.sort_order - b.sort_order);

export const getDropSortOrder = (
  sourceGroup: TExtendedSidebarGroup,
  destinationGroup: TExtendedSidebarGroup,
  _sourceIndex: number,
  destinationIndex: number,
  items: TExtendedSidebarItem[]
): number | undefined => {
  if (sourceGroup !== destinationGroup || destinationIndex < 0 || items.length === 0) return undefined;
  if (destinationIndex === 0) return items[0].sort_order - 10_000;
  if (destinationIndex >= items.length) return items.at(-1)!.sort_order + 10_000;
  return (items[destinationIndex - 1].sort_order + items[destinationIndex].sort_order) / 2;
};
