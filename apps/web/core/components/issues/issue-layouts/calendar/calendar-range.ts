import { isValid, parseISO } from "date-fns";

type CalendarIssue = {
  id: string;
  start_date?: string | null;
  target_date?: string | null;
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
