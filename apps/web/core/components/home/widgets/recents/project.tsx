/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRouter } from "next/navigation";
// plane types
import { LayersIcon } from "@plane/propel/icons";
import type { TActivityEntityData, TProjectEntityData } from "@plane/types";
import { calculateTimeAgo } from "@plane/utils";
// components
import { ListItem } from "@/components/core/list";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
// helpers

type BlockProps = {
  activity: TActivityEntityData;
  ref: React.RefObject<HTMLDivElement | null>;
  workspaceSlug: string;
};
export function RecentProject(props: BlockProps) {
  const { activity, ref, workspaceSlug } = props;
  // router
  const router = useRouter();
  // derived values
  const projectDetails: TProjectEntityData = activity.entity_data as TProjectEntityData;

  if (!projectDetails) return <></>;

  const projectLink = `/${workspaceSlug}/projects/${projectDetails?.id}/issues`;

  return (
    <ListItem
      key={activity.id}
      itemLink={projectLink}
      title={projectDetails?.name}
      prependTitleElement={<LayersIcon className="size-4 flex-shrink-0 text-placeholder/50" />}
      appendTitleElement={
        <div className="flex-shrink-0 text-11 font-medium text-placeholder">
          {calculateTimeAgo(activity.visited_at)}
        </div>
      }
      quickActionElement={
        <div className="flex gap-4">
          {projectDetails?.project_members?.length > 0 && (
            <div className="h-5">
              <MemberDropdown
                projectId={projectDetails?.id}
                value={projectDetails?.project_members}
                onChange={() => {}}
                disabled
                multiple
                buttonVariant={
                  projectDetails?.project_members?.length > 0 ? "transparent-without-text" : "border-without-text"
                }
                buttonClassName={projectDetails?.project_members?.length > 0 ? "hover:bg-transparent px-0" : ""}
                showTooltip={projectDetails?.project_members?.length === 0}
                placeholder="Assignees"
                optionsClassName="z-10"
                tooltipContent=""
              />
            </div>
          )}
        </div>
      }
      parentRef={ref}
      disableLink={false}
      className="my-auto !min-h-0 border-none !px-0 py-1 lg:py-2"
      itemClassName="my-auto"
      onItemClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(projectLink);
      }}
    />
  );
}
