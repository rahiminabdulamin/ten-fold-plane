import { observer } from "mobx-react";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { useIssueDetails } from "@/hooks/store/use-issue-details";
import { useIssue } from "@/hooks/store/use-issue";

export const PublicCalendarLayout = observer(function PublicCalendarLayout() {
  const { groupedIssueIds } = useIssue();
  const { getIssueById, setPeekId } = useIssueDetails();
  const issueIds = Object.values(groupedIssueIds ?? {}).flatMap((value) => (Array.isArray(value) ? value : []));
  const issuesByDate = issueIds.reduce<Record<string, ReturnType<typeof getIssueById>[]>>((groups, id) => {
    const issue = getIssueById(id);
    if (issue?.target_date) (groups[issue.target_date] ??= []).push(issue);
    return groups;
  }, {});
  const days = eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

  return (
    <div className="size-full overflow-y-auto p-5">
      <h2 className="mb-4 text-18 font-semibold">{format(new Date(), "MMMM yyyy")}</h2>
      <div className="grid grid-cols-7 overflow-hidden rounded border border-subtle-1">
        {days.map((day) => {
          const date = format(day, "yyyy-MM-dd");
          return (
            <div key={date} className="min-h-28 border-r border-b border-subtle-1 p-2">
              <div className="mb-1 text-12 text-secondary">{format(day, "d")}</div>
              {issuesByDate[date]?.map((issue) =>
                issue ? (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => setPeekId(issue.id)}
                    className="block w-full truncate text-left text-12 text-primary hover:underline"
                  >
                    {issue.sequence_id} {issue.name}
                  </button>
                ) : null
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
