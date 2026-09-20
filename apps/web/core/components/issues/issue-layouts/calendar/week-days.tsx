/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import type { TGroupedIssues, TIssue, TIssueMap, TPaginationData, ICalendarDate, ICalendarWeek } from "@plane/types";
import { cn, getOrderedDays, renderFormattedPayloadDate } from "@plane/utils";
// hooks
import { useUserProfile } from "@/hooks/store/user";
// types
import type { ICycleIssuesFilter } from "@/store/issue/cycle";
import type { IModuleIssuesFilter } from "@/store/issue/module";
import type { IProjectIssuesFilter } from "@/store/issue/project";
import type { IProjectViewIssuesFilter } from "@/store/issue/project-views";
import type { TRenderQuickActions } from "../list/list-view-types";
import { getCalendarIssueIdsByDate } from "./calendar-range";
import { CalendarDayTile } from "./day-tile";

type Props = {
  issuesFilterStore: IProjectIssuesFilter | IModuleIssuesFilter | ICycleIssuesFilter | IProjectViewIssuesFilter;
  issues: TIssueMap | undefined;
  groupedIssueIds: TGroupedIssues;
  week: ICalendarWeek | undefined;
  quickActions: TRenderQuickActions;
  loadMoreIssues: (dateString: string) => void;
  getPaginationData: (groupId: string | undefined) => TPaginationData | undefined;
  getGroupIssueCount: (groupId: string | undefined) => number | undefined;
  enableQuickIssueCreate?: boolean;
  disableIssueCreation?: boolean;
  quickAddCallback?: (projectId: string | null | undefined, data: TIssue) => Promise<TIssue | undefined>;
  handleDragAndDrop: (
    issueId: string | undefined,
    issueProjectId: string | undefined,
    sourceDate: string | undefined,
    destinationDate: string | undefined
  ) => Promise<void>;
  addIssuesToView?: (issueIds: string[]) => Promise<any>;
  readOnly?: boolean;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  canEditProperties: (projectId: string | undefined) => boolean;
  isEpic?: boolean;
};

export const CalendarWeekDays = observer(function CalendarWeekDays(props: Props) {
  const {
    issuesFilterStore,
    issues,
    groupedIssueIds,
    handleDragAndDrop,
    week,
    loadMoreIssues,
    getPaginationData,
    getGroupIssueCount,
    quickActions,
    enableQuickIssueCreate,
    disableIssueCreation,
    quickAddCallback,
    addIssuesToView,
    readOnly = false,
    selectedDate,
    setSelectedDate,
    canEditProperties,
    isEpic = false,
  } = props;
  // hooks
  const { data } = useUserProfile();
  const startOfWeek = data?.start_of_the_week;

  const calendarLayout = issuesFilterStore?.issueFilters?.displayFilters?.calendar?.layout ?? "month";
  const showWeekends = issuesFilterStore?.issueFilters?.displayFilters?.calendar?.show_weekends ?? true;

  if (!week) return null;

  const sortedWeekDays = getOrderedDays(Object.values(week), (item) => item.date.getDay(), startOfWeek);
  const calendarDates = sortedWeekDays
    .map((date) => renderFormattedPayloadDate(date.date))
    .filter((date): date is string => !!date);
  const getAdjacentCalendarDates = () => {
    const firstDate = new Date(sortedWeekDays[0].date);
    const lastDate = new Date(sortedWeekDays[sortedWeekDays.length - 1].date);
    firstDate.setDate(firstDate.getDate() - 1);
    lastDate.setDate(lastDate.getDate() + 1);
    return [renderFormattedPayloadDate(firstDate), renderFormattedPayloadDate(lastDate)].filter(
      (date): date is string => !!date
    );
  };
  const issueIdsByDate = getCalendarIssueIdsByDate(
    issues ?? {},
    [...new Set(Object.values(groupedIssueIds).flat())],
    [...calendarDates, ...getAdjacentCalendarDates()]
  );

  const issueRowById: Record<string, number> = {};
  const laneEnds: number[] = [];
  const issueSpans = [...new Set(calendarDates.flatMap((date) => issueIdsByDate[date] ?? []))]
    .map((issueId) => {
      const dates = calendarDates
        .map((date, index) => (issueIdsByDate[date]?.includes(issueId) ? index : -1))
        .filter((index) => index >= 0);
      return { issueId, start: dates[0], end: dates[dates.length - 1] };
    })
    .toSorted((a, b) => a.start - b.start || a.end - b.end);

  issueSpans.forEach(({ issueId, start, end }) => {
    const row = laneEnds.findIndex((laneEnd) => laneEnd < start);
    const issueRow = row === -1 ? laneEnds.length : row;
    laneEnds[issueRow] = end;
    issueRowById[issueId] = issueRow;
  });

  const shouldShowDay = (dayDate: Date) => {
    if (showWeekends) return true;
    const day = dayDate.getDay();
    return !(day === 0 || day === 6);
  };

  return (
    <div
      className={cn("grid divide-subtle-1 md:divide-x-[0.5px]", {
        "grid-cols-7": showWeekends,
        "grid-cols-5": !showWeekends,
        "h-full": calendarLayout !== "month",
      })}
    >
      {sortedWeekDays.map((date: ICalendarDate) => {
        if (!shouldShowDay(date.date)) return null;

        return (
          <CalendarDayTile
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            issuesFilterStore={issuesFilterStore}
            key={renderFormattedPayloadDate(date.date)}
            date={date}
            issues={issues}
            groupedIssueIds={{ ...groupedIssueIds, ...issueIdsByDate }}
            issueRowById={issueRowById}
            issueRowCount={laneEnds.length}
            loadMoreIssues={loadMoreIssues}
            getPaginationData={getPaginationData}
            getGroupIssueCount={getGroupIssueCount}
            quickActions={quickActions}
            enableQuickIssueCreate={enableQuickIssueCreate}
            disableIssueCreation={disableIssueCreation}
            quickAddCallback={quickAddCallback}
            addIssuesToView={addIssuesToView}
            readOnly={readOnly}
            handleDragAndDrop={handleDragAndDrop}
            canEditProperties={canEditProperties}
            isEpic={isEpic}
          />
        );
      })}
    </div>
  );
});
