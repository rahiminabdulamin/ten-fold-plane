import { isValid, parseISO } from "date-fns";

type CalendarIssue = {
  id: string;
  start_date?: string | null;
  target_date?: string | null;
};

export type CalendarIssueSpan = {
  issueId: string;
  start: number;
  end: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export const getCalendarIssueIdsByDate = (
  issues: Record<string, CalendarIssue | undefined>,
  issueIds: string[],
  calendarDates: string[]
): Record<string, string[]> => {
  const issueIdsByDate = Object.fromEntries(calendarDates.map((date) => [date, [] as string[]]));

  issueIds.forEach((issueId) => {
    const issue = issues[issueId];
    if (!issue?.target_date) return;

    const dueDate = parseISO(issue.target_date);
    const startDate = issue.start_date ? parseISO(issue.start_date) : dueDate;
    if (!isValid(dueDate) || !isValid(startDate)) return;

    calendarDates.forEach((date) => {
      const calendarDate = parseISO(date);
      if (calendarDate >= startDate && calendarDate <= dueDate) issueIdsByDate[date].push(issueId);
    });
  });

  return issueIdsByDate;
};

export const getCalendarIssueSpans = (
  issues: Record<string, CalendarIssue | undefined>,
  issueIdsByDate: Record<string, string[]>,
  visibleDates: string[]
): CalendarIssueSpan[] =>
  [...new Set(visibleDates.flatMap((date) => issueIdsByDate[date] ?? []))].flatMap((issueId) => {
    const issue = issues[issueId];
    if (!issue?.target_date) return [];

    const dueDate = parseISO(issue.target_date);
    const startDate = parseISO(issue.start_date ?? issue.target_date);
    const firstVisibleDate = parseISO(visibleDates[0]);
    const lastVisibleDate = parseISO(visibleDates[visibleDates.length - 1]);
    if (![dueDate, startDate, firstVisibleDate, lastVisibleDate].every(isValid)) return [];
    if (startDate.getTime() === dueDate.getTime()) return [];

    const indexes = visibleDates
      .map((date, index) => (issueIdsByDate[date]?.includes(issueId) ? index : -1))
      .filter((index) => index >= 0);
    if (indexes.length === 0) return [];

    return [
      {
        issueId,
        start: indexes[0],
        end: indexes[indexes.length - 1],
        continuesBefore: startDate < firstVisibleDate,
        continuesAfter: dueDate > lastVisibleDate,
      },
    ];
  });
