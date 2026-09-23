/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { ETabIndices, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ParentOutline } from "@makeplane/propel/icons";
// types
import type { ISearchIssueResponse, TIssue } from "@plane/types";
// ui
import { CustomMenu } from "@plane/ui";
import { getDate, renderFormattedPayloadDate, getTabIndex } from "@plane/utils";
// components
import { CycleDropdown } from "@/components/dropdowns/cycle";
import { DateDropdown } from "@/components/dropdowns/date";
import { EstimateDropdown } from "@/components/dropdowns/estimate";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { ModuleDropdown } from "@/components/dropdowns/module/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
import { ParentIssuesListModal } from "@/components/issues/parent-issues-list-modal";
import { IssueLabelSelect } from "@/components/issues/select";
import { IssueIdentifier } from "@/components/issues/issue-detail/issue-identifier";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { usePlatformOS } from "@/hooks/use-platform-os";

type TIssueDefaultPropertiesProps = {
  control: Control<TIssue>;
  id: string | undefined;
  projectId: string | null;
  workspaceSlug: string;
  selectedParentIssue: ISearchIssueResponse | null;
  startDate: string | null;
  targetDate: string | null;
  parentId: string | null;
  isDraft: boolean;
  handleFormChange: () => void;
  setSelectedParentIssue: (issue: ISearchIssueResponse) => void;
};

const propertyButtonClassName = "text-11 leading-4 [&_span]:!text-11 [&_span]:!leading-4";

export const IssueDefaultProperties = observer(function IssueDefaultProperties(props: TIssueDefaultPropertiesProps) {
  const {
    control,
    id,
    projectId,
    workspaceSlug,
    selectedParentIssue,
    startDate,
    targetDate,
    parentId,
    isDraft,
    handleFormChange,
    setSelectedParentIssue,
  } = props;
  // states
  const [parentIssueListModalOpen, setParentIssueListModalOpen] = useState(false);
  // store hooks
  const { t } = useTranslation();
  const { areEstimateEnabledByProjectId } = useProjectEstimates();
  const { getProjectById } = useProject();
  const { isMobile } = usePlatformOS();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const projectDetails = getProjectById(projectId);

  const { getIndex } = getTabIndex(ETabIndices.ISSUE_FORM, isMobile);

  const canCreateLabel =
    projectId && allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId);

  const minDate = getDate(startDate);
  minDate?.setDate(minDate.getDate());

  const maxDate = getDate(targetDate);
  maxDate?.setDate(maxDate.getDate());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Controller
        control={control}
        name="state_id"
        render={({ field: { value, onChange } }) => (
          <div className="h-7 max-w-full min-w-0">
            <StateDropdown
              value={value}
              onChange={(stateId) => {
                onChange(stateId);
                handleFormChange();
              }}
              projectId={projectId ?? undefined}
              buttonVariant="border-with-text"
              buttonClassName={propertyButtonClassName}
              buttonContainerClassName="max-w-full"
              tabIndex={getIndex("state_id")}
              isForWorkItemCreation={!id}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="priority"
        render={({ field: { value, onChange } }) => (
          <div className="h-7 max-w-full min-w-0">
            <PriorityDropdown
              value={value}
              onChange={(priority) => {
                onChange(priority);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              buttonClassName={propertyButtonClassName}
              buttonContainerClassName="max-w-full"
              tabIndex={getIndex("priority")}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="assignee_ids"
        render={({ field: { value, onChange } }) => (
          <div className="h-7 max-w-full min-w-0">
            <MemberDropdown
              projectId={projectId ?? undefined}
              value={value}
              onChange={(assigneeIds) => {
                onChange(assigneeIds);
                handleFormChange();
              }}
              buttonVariant={value?.length > 0 ? "transparent-without-text" : "border-with-text"}
              buttonClassName={`${propertyButtonClassName}${value?.length > 0 ? " hover:bg-transparent" : ""}`}
              buttonContainerClassName="max-w-full"
              placeholder={t("assignees")}
              multiple
              tabIndex={getIndex("assignee_ids")}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="label_ids"
        render={({ field: { value, onChange } }) => (
          <div className="h-7 max-w-full min-w-0">
            <IssueLabelSelect
              value={value}
              onChange={(labelIds) => {
                onChange(labelIds);
                handleFormChange();
              }}
              projectId={projectId ?? undefined}
              tabIndex={getIndex("label_ids")}
              createLabelEnabled={!!canCreateLabel}
              buttonClassName={propertyButtonClassName}
              buttonContainerClassName="max-w-full"
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="start_date"
        render={({ field: { value, onChange } }) => (
          <div className="h-7 max-w-full min-w-0">
            <DateDropdown
              value={value}
              onChange={(date) => {
                onChange(date ? renderFormattedPayloadDate(date) : null);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              buttonClassName={propertyButtonClassName}
              buttonContainerClassName="max-w-full"
              maxDate={maxDate ?? undefined}
              placeholder={t("start_date")}
              tabIndex={getIndex("start_date")}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="target_date"
        render={({ field: { value, onChange } }) => (
          <div className="h-7 max-w-full min-w-0">
            <DateDropdown
              value={value}
              onChange={(date) => {
                onChange(date ? renderFormattedPayloadDate(date) : null);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              buttonClassName={propertyButtonClassName}
              buttonContainerClassName="max-w-full"
              minDate={minDate ?? undefined}
              placeholder={t("due_date")}
              tabIndex={getIndex("target_date")}
            />
          </div>
        )}
      />
      {projectDetails?.cycle_view && (
        <Controller
          control={control}
          name="cycle_id"
          render={({ field: { value, onChange } }) => (
            <div className="h-7 max-w-full min-w-0">
              <CycleDropdown
                projectId={projectId ?? undefined}
                onChange={(cycleId) => {
                  onChange(cycleId);
                  handleFormChange();
                }}
                placeholder={t("cycle.label", { count: 1 })}
                value={value}
                buttonVariant="border-with-text"
                buttonClassName={propertyButtonClassName}
                buttonContainerClassName="max-w-full"
                tabIndex={getIndex("cycle_id")}
              />
            </div>
          )}
        />
      )}
      {projectDetails?.module_view && workspaceSlug && (
        <Controller
          control={control}
          name="module_ids"
          render={({ field: { value, onChange } }) => (
            <div className="h-7 max-w-full min-w-0">
              <ModuleDropdown
                projectId={projectId ?? undefined}
                value={value ?? []}
                onChange={(moduleIds) => {
                  onChange(moduleIds);
                  handleFormChange();
                }}
                placeholder={t("modules")}
                buttonVariant="border-with-text"
                buttonClassName={propertyButtonClassName}
                buttonContainerClassName="max-w-full"
                tabIndex={getIndex("module_ids")}
                multiple
                showCount
              />
            </div>
          )}
        />
      )}
      {projectId && areEstimateEnabledByProjectId(projectId) && (
        <Controller
          control={control}
          name="estimate_point"
          render={({ field: { value, onChange } }) => (
            <div className="h-7 max-w-full min-w-0">
              <EstimateDropdown
                value={value || undefined}
                onChange={(estimatePoint) => {
                  onChange(estimatePoint);
                  handleFormChange();
                }}
                projectId={projectId}
                buttonVariant="border-with-text"
                buttonClassName={propertyButtonClassName}
                buttonContainerClassName="max-w-full"
                tabIndex={getIndex("estimate_point")}
                placeholder={t("estimate")}
              />
            </div>
          )}
        />
      )}
      <div className="h-7 max-w-full min-w-0">
        {parentId ? (
          <CustomMenu
            customButton={
              <button
                type="button"
                className="flex h-full max-w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-11 leading-4 hover:bg-layer-1"
              >
                {selectedParentIssue?.project_id && (
                  <IssueIdentifier
                    projectId={selectedParentIssue.project_id}
                    issueTypeId={selectedParentIssue.type_id}
                    projectIdentifier={selectedParentIssue?.project__identifier}
                    issueSequenceId={selectedParentIssue.sequence_id}
                    size="xs"
                  />
                )}
                <span className="max-w-40 truncate">
                  {selectedParentIssue?.name?.substring(0, 50) ?? t("add_parent")}
                </span>
              </button>
            }
            placement="bottom-start"
            className="h-full w-full max-w-full"
            customButtonClassName="h-full"
            tabIndex={getIndex("parent_id")}
          >
            <>
              <CustomMenu.MenuItem className="!p-1" onClick={() => setParentIssueListModalOpen(true)}>
                {t("change_parent_issue")}
              </CustomMenu.MenuItem>
              <Controller
                control={control}
                name="parent_id"
                render={({ field: { onChange } }) => (
                  <CustomMenu.MenuItem
                    className="!p-1"
                    onClick={() => {
                      onChange(null);
                      handleFormChange();
                    }}
                  >
                    {t("remove_parent_issue")}
                  </CustomMenu.MenuItem>
                )}
              />
            </>
          </CustomMenu>
        ) : (
          <button
            type="button"
            className="flex h-full max-w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-11 leading-4 hover:bg-layer-1"
            onClick={() => setParentIssueListModalOpen(true)}
          >
            <ParentOutline className="h-3 w-3 flex-shrink-0" />
            <span className="truncate whitespace-nowrap">{t("add_parent")}</span>
          </button>
        )}
      </div>
      <Controller
        control={control}
        name="parent_id"
        render={({ field: { onChange } }) => (
          <ParentIssuesListModal
            isOpen={parentIssueListModalOpen}
            handleClose={() => setParentIssueListModalOpen(false)}
            onChange={(issue) => {
              onChange(issue.id);
              handleFormChange();
              setSelectedParentIssue(issue);
            }}
            projectId={projectId ?? undefined}
            issueId={isDraft ? undefined : id}
          />
        )}
      />
    </div>
  );
});
