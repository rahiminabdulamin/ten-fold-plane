/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useMemo, useRef } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS, EUserPermissionsLevel } from "@plane/constants";
import type { EUserWorkspaceRoles, TPersonalNavigationItemKey } from "@plane/types";
import { useTranslation } from "@plane/i18n";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useUserPermissions } from "@/hooks/store/user";
import {
  usePersonalNavigationPreferences,
  useWorkspaceNavigationPreferences,
} from "@/hooks/use-navigation-preferences";
// components
import { ExtendedSidebarItem } from "@/components/workspace/sidebar/extended-sidebar-item";
import { ExtendedSidebarWrapper } from "./extended-sidebar-wrapper";
import { getPersonalExtendedSidebarItems } from "@/components/workspace/sidebar/extended-sidebar.helpers";

export const ExtendedAppSidebar = observer(function ExtendedAppSidebar() {
  // refs
  const extendedSidebarRef = useRef<HTMLDivElement | null>(null);
  // routers
  const { workspaceSlug } = useParams();
  // store hooks
  const { extendedSidebarMode, isExtendedSidebarOpened, toggleExtendedSidebar } = useAppTheme();
  const { allowPermissions } = useUserPermissions();
  const {
    preferences: workspacePreferences,
    toggleWorkspaceItem,
    updateWorkspaceItemSortOrder,
  } = useWorkspaceNavigationPreferences();
  const {
    preferences: personalPreferences,
    togglePersonalItem,
    updatePersonalItemOrder,
  } = usePersonalNavigationPreferences();
  const { t } = useTranslation();

  // derived values
  const currentWorkspaceNavigationPreferences = workspacePreferences.items;

  const sortedNavigationItems = useMemo(() => {
    const slug = workspaceSlug.toString();

    return (
      WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS.filter((item) => {
        // Permission check
        const hasPermission = allowPermissions(item.access, EUserPermissionsLevel.WORKSPACE, slug);

        return hasPermission;
      })
        // oxlint-disable-next-line oxc/no-map-spread
        .map((item) => {
          const preference = currentWorkspaceNavigationPreferences?.[item.key];
          return {
            ...item,
            sort_order: preference?.sort_order ?? 0,
            is_pinned: preference?.is_pinned ?? false,
          };
        })
        // oxlint-disable-next-line unicorn/no-array-sort
        .sort((a, b) => {
          // First sort by pinned status (pinned items first)
          if (a.is_pinned !== b.is_pinned) {
            return b.is_pinned ? 1 : -1;
          }
          // Then sort by sort_order within each group
          return a.sort_order - b.sort_order;
        })
    );
  }, [workspaceSlug, currentWorkspaceNavigationPreferences, allowPermissions]);

  const sortedNavigationItemsKeys = sortedNavigationItems.map((item) => item.key);
  const personalNavigationItems = useMemo(
    () => getPersonalExtendedSidebarItems(personalPreferences),
    [personalPreferences]
  );

  // oxlint-disable-next-line unicorn/consistent-function-scoping
  const orderNavigationItem = (
    sourceIndex: number,
    destinationIndex: number,
    navigationList: {
      sort_order: number;
      key: string;
      labelTranslationKey: string;
      href: string;
      access: EUserWorkspaceRoles[];
    }[]
  ): number | undefined => {
    if (sourceIndex < 0 || destinationIndex < 0 || navigationList.length <= 0) return undefined;

    let updatedSortOrder: number | undefined = undefined;
    const sortOrderDefaultValue = 10000;

    if (destinationIndex === 0) {
      // updating project at the top of the project
      const currentSortOrder = navigationList[destinationIndex].sort_order || 0;
      updatedSortOrder = currentSortOrder - sortOrderDefaultValue;
    } else if (destinationIndex === navigationList.length) {
      // updating project at the bottom of the project
      const currentSortOrder = navigationList[destinationIndex - 1].sort_order || 0;
      updatedSortOrder = currentSortOrder + sortOrderDefaultValue;
    } else {
      // updating project in the middle of the project
      const destinationTopProjectSortOrder = navigationList[destinationIndex - 1].sort_order || 0;
      const destinationBottomProjectSortOrder = navigationList[destinationIndex].sort_order || 0;
      const updatedValue = (destinationTopProjectSortOrder + destinationBottomProjectSortOrder) / 2;
      updatedSortOrder = updatedValue;
    }

    return updatedSortOrder;
  };

  const handleOnNavigationItemDrop = (
    sourceId: string | undefined,
    destinationId: string | undefined,
    shouldDropAtEnd: boolean
  ) => {
    if (!sourceId || !destinationId || !workspaceSlug) return;
    if (sourceId === destinationId) return;

    const sourceIndex = sortedNavigationItemsKeys.indexOf(sourceId);
    const destinationIndex = shouldDropAtEnd
      ? sortedNavigationItemsKeys.length
      : sortedNavigationItemsKeys.indexOf(destinationId);

    const updatedSortOrder = orderNavigationItem(sourceIndex, destinationIndex, sortedNavigationItems);

    if (updatedSortOrder != undefined) updateWorkspaceItemSortOrder(sourceId, updatedSortOrder);
  };

  const handleOnPersonalNavigationItemDrop = (
    sourceId: string | undefined,
    destinationId: string | undefined,
    shouldDropAtEnd: boolean
  ) => {
    if (!sourceId || !destinationId || sourceId === destinationId) return;

    const sourceIndex = personalNavigationItems.findIndex((item) => item.key === sourceId);
    const destinationIndex = shouldDropAtEnd
      ? personalNavigationItems.length
      : personalNavigationItems.findIndex((item) => item.key === destinationId);
    const updatedSortOrder = orderNavigationItem(sourceIndex, destinationIndex, personalNavigationItems);

    if (updatedSortOrder != undefined) {
      updatePersonalItemOrder([{ key: sourceId as TPersonalNavigationItemKey, sortOrder: updatedSortOrder }]);
    }
  };

  const handleClose = useCallback(() => toggleExtendedSidebar(false), [toggleExtendedSidebar]);

  return (
    <ExtendedSidebarWrapper
      isExtendedSidebarOpened={!!isExtendedSidebarOpened}
      extendedSidebarRef={extendedSidebarRef}
      handleClose={handleClose}
      excludedElementId={
        extendedSidebarMode === "personal" ? "personal-extended-sidebar-toggle" : "extended-sidebar-toggle"
      }
    >
      {extendedSidebarMode === "personal" ? (
        <div className="flex flex-col gap-0.5">
          <span className="px-2 text-13 font-semibold text-placeholder">{t("personal")}</span>
          {personalNavigationItems.map((item, index) => (
            <ExtendedSidebarItem
              key={item.key}
              item={item}
              isLastChild={index === personalNavigationItems.length - 1}
              handleOnNavigationItemDrop={handleOnPersonalNavigationItemDrop}
              isPinned={item.is_pinned}
              onPin={(key) => togglePersonalItem(key as TPersonalNavigationItemKey, true)}
              onUnpin={(key) => togglePersonalItem(key as TPersonalNavigationItemKey, false)}
              group="personal"
            />
          ))}
        </div>
      ) : (
        <>
          <span className="px-2 text-13 font-semibold text-placeholder">{t("common.workspace")}</span>
          {sortedNavigationItems.map((item, index) => (
            <ExtendedSidebarItem
              key={item.key}
              item={item}
              isLastChild={index === sortedNavigationItems.length - 1}
              handleOnNavigationItemDrop={handleOnNavigationItemDrop}
              isPinned={item.is_pinned}
              onPin={(key) => toggleWorkspaceItem(key, true)}
              onUnpin={(key) => toggleWorkspaceItem(key, false)}
              group="workspace"
            />
          ))}
        </>
      )}
    </ExtendedSidebarWrapper>
  );
});
