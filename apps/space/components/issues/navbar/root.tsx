/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// store
import type { PublishStore } from "@/store/publish/publish.store";
// local imports
import { NavbarControls } from "./controls";

type Props = {
  publishSettings: PublishStore;
};

export const IssuesNavbarRoot = observer(function IssuesNavbarRoot(props: Props) {
  const { publishSettings } = props;
  // hooks
  const { project_details, workspace_detail } = publishSettings;

  return (
    <div className="relative flex w-full justify-between gap-4 px-5">
      {/* project detail */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="line-clamp-1 max-w-[300px] overflow-hidden text-16 font-medium">
          {workspace_detail?.name || "..."} <span className="px-1 text-secondary">&gt;</span>{" "}
          {project_details?.name || "..."}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <NavbarControls publishSettings={publishSettings} />
      </div>
    </div>
  );
});
