/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useRouterParams } from "@/hooks/store/use-router-params";

type TStoreWrapper = {
  children: ReactNode;
};

function StoreWrapper(props: TStoreWrapper) {
  const { children } = props;
  // router
  const params = useParams();
  // store hooks
  const { setQuery } = useRouterParams();
  const { sidebarCollapsed, toggleSidebar } = useAppTheme();

  /**
   * Sidebar collapsed fetching from local storage
   */
  useEffect(() => {
    const localValue = localStorage && localStorage.getItem("app_sidebar_collapsed");
    const localBoolValue = localValue === "true";
    if (localValue && sidebarCollapsed === undefined) toggleSidebar(localBoolValue);
  }, [sidebarCollapsed, toggleSidebar]);

  useEffect(() => {
    if (!params) return;
    setQuery(params);
  }, [params, setQuery]);

  return <>{children}</>;
}

export default observer(StoreWrapper);
