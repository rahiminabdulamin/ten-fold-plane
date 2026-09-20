/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRouter } from "next/navigation";
import { Avatar } from "@makeplane/propel/components/avatar";
import { LayersIcon } from "@plane/propel/icons";
// plane import
import type { TActivityEntityData, TPageEntityData } from "@plane/types";
import { calculateTimeAgo, getFileURL, getPageName } from "@plane/utils";
import { ListItem } from "@/components/core/list";
// hooks
import { useMember } from "@/hooks/store/use-member";

type BlockProps = {
  activity: TActivityEntityData;
  ref: React.RefObject<HTMLDivElement | null>;
  workspaceSlug: string;
};

export function RecentPage(props: BlockProps) {
  const { activity, ref, workspaceSlug } = props;
  // router
  const router = useRouter();
  // store hooks
  const { getUserDetails } = useMember();
  // derived values
  const pageDetails = activity.entity_data as TPageEntityData;

  if (!pageDetails) return <></>;

  const ownerDetails = getUserDetails(pageDetails?.owned_by);
  const pageLink = pageDetails.project_id
    ? `/${workspaceSlug}/projects/${pageDetails.project_id}/pages/${pageDetails.id}`
    : `/${workspaceSlug}/pages/${pageDetails.id}`;

  return (
    <ListItem
      key={activity.id}
      itemLink={pageLink}
      title={getPageName(pageDetails?.name)}
      prependTitleElement={<LayersIcon className="size-4 flex-shrink-0 text-placeholder/50" />}
      appendTitleElement={
        <div className="flex-shrink-0 text-11 font-medium text-placeholder">
          {calculateTimeAgo(activity.visited_at)}
        </div>
      }
      quickActionElement={
        <div className="flex gap-4">
          <Avatar
            alt={ownerDetails?.display_name}
            fallback={ownerDetails?.display_name?.[0]?.toUpperCase()}
            src={getFileURL(ownerDetails?.avatar_url ?? "")}
            size="xs"
          />
        </div>
      }
      parentRef={ref}
      disableLink={false}
      className="my-auto !min-h-0 border-none !px-0 py-1 lg:py-2"
      itemClassName="my-auto bg-layer-transparent"
      onItemClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(pageLink);
      }}
    />
  );
}
