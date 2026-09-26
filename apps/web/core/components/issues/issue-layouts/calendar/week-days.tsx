/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { CSSProperties } from "react";
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
import { getCalendarIssueSpans } from "./calendar-range";
import { CalendarDayTile } from "./day-tile";
import { CalendarIssueBlockRoot } from "./issue-block-root";

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
  const shouldShowDay = (dayDate: Date) => {
    if (showWeekends) return true;
    const day = dayDate.getDay();
    return !(day === 0 || day === 6);
  };
  const visibleWeekDays = sortedWeekDays.filter((date) => shouldShowDay(date.date));
  const calendarDates = visibleWeekDays
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
  const issueSpans = [...getCalendarIssueSpans(issues ?? {}, issueIdsByDate, calendarDates)].toSorted(
    (a, b) => a.start - b.start || a.end - b.end
  );

  issueSpans.forEach(({ issueId, start, end }) => {
    const row = laneEnds.findIndex((laneEnd) => laneEnd < start);
    const issueRow = row === -1 ? laneEnds.length : row;
    laneEnds[issueRow] = end;
    issueRowById[issueId] = issueRow;
  });

  const rangeLaneCount = issueSpans
    .filter(({ isRange }) => isRange)
    .reduce((count, { issueId }) => Math.max(count, (issueRowById[issueId] ?? 0) + 1), 0);

  const weekHeight = calendarLayout === "month" ? 32 + Math.max(80, 40 + laneEnds.length * 40) : undefined;

  return (
    <div
      className="relative md:h-[var(--calendar-week-height)] md:overflow-hidden"
      style={weekHeight ? ({ "--calendar-week-height": `${weekHeight}px` } as CSSProperties) : undefined}
    >
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
              desktopContentOffset={rangeLaneCount * 40}
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
              desktopHiddenIssueIds={issueSpans.filter(({ isRange }) => isRange).map(({ issueId }) => issueId)}
            />
          );
        })}
      </div>
      <div
        className={cn("auto-rows-10 pointer-events-none absolute top-8 right-0 left-0 z-10 hidden md:grid", {
          "grid-cols-7": showWeekends,
          "grid-cols-5": !showWeekends,
        })}
      >
        {issueSpans
          .filter(({ isRange }) => isRange)
          .map((span) => {
            const rangePosition = span.continuesBefore
              ? span.continuesAfter
                ? "middle"
                : "end"
              : span.continuesAfter
                ? "start"
                : "single";
            const calendarDate = calendarDates[span.start];

            return (
              <div
                key={span.issueId}
                className="pointer-events-auto z-10 min-w-0 px-2 py-1"
                style={{ gridColumn: `${span.start + 1} / ${span.end + 2}`, gridRow: issueRowById[span.issueId] + 1 }}
              >
                <CalendarIssueBlockRoot
                  issueId={span.issueId}
                  calendarDate={calendarDate}
                  quickActions={quickActions}
                  isDragDisabled={readOnly}
                  canEditProperties={canEditProperties}
                  isEpic={isEpic}
                  rangePosition={rangePosition}
                  labelPrefix={span.continuesBefore ? "↳ " : undefined}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
});
