import {
  CopilotKit,
  CopilotSidebar,
  useAgentContext,
  useFrontendTool,
  useHumanInTheLoop,
} from "@copilotkit/react-core/v2";
import { API_BASE_URL } from "@plane/constants";
import type { ICustomSearchSelectOption } from "@plane/types";
import { CustomSearchSelect } from "@plane/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useParams } from "react-router";

import { IssueService } from "@/services/issue";
import { IssueLabelService } from "@/services/issue/issue_label.service";
import { EstimateService } from "@/services/estimate.service";
import { ProjectMemberService } from "@/services/project/project-member.service";
import { ProjectStateService } from "@/services/project/project-state.service";
import { ProjectService } from "@/services/project";
import { WorkspaceService } from "@/services/workspace.service";
import { SpreadsheetService } from "@/services/spreadsheet.service";
import { useUser } from "@/hooks/store/user";
import { getRetryDelay } from "@/lib/retry-delay";

import {
  buildWorkItemQuery,
  classifyToolError,
  createWorkItemsSequentially,
  expandWeeklyOccurrenceDates,
  filterMonthEventRecords,
  formatValidationFields,
  findProjectMatches,
  getMonthDateRange,
  getUserLocalDateTime,
  MONTH_NAMES,
  normalizeRecurringWorkItemInput,
  RECURRENCE_WEEKDAYS,
  type ToolResult,
  toWorkItemPayload,
  toWorkItemRecords,
  toolError,
  toolPartialResult,
  toolResult,
  toolUncertainResult,
  toolValidationError,
  WORK_ITEM_STATE_GROUPS,
} from "./tool-contracts";
import {
  confirmDeleted,
  isCanonicalRecord,
  logWorkItemListTrace,
  logToolOutcome,
  MutationGuard,
  mutationFingerprint,
  requestedFieldsMatch,
} from "./tool-reliability";
import {
  resolveSelectedWorkspaceId,
  resolveWorkspaceToolTarget,
  shouldSyncWorkspaceSelection,
  toAgentWorkspaceContext,
  type WorkspaceOption,
} from "./workspace-context";

const projectService = new ProjectService();
const issueService = new IssueService();
const stateService = new ProjectStateService();
const labelService = new IssueLabelService();
const memberService = new ProjectMemberService();
const estimateService = new EstimateService();
const workspaceService = new WorkspaceService();
const spreadsheetService = new SpreadsheetService();
const mutationGuard = new MutationGuard();
const COPILOT_PANEL_WIDTH_STORAGE_KEY = "tenfold-copilot-panel-width";
const COPILOT_LAUNCHER_POSITION_STORAGE_KEY = "tenfold-copilot-launcher-position";
const DEFAULT_COPILOT_PANEL_WIDTH = 360;
const MIN_COPILOT_PANEL_WIDTH = 280;
const MAX_COPILOT_PANEL_WIDTH = 560;
const LAUNCHER_SIZE = 56;
const LAUNCHER_GUTTER = 24;
const COPILOT_SIDEBAR_LABELS = { modalHeaderTitle: "Ten-Fold Assistant" };

type LauncherPosition = { x: number; y: number };

type ToolActivityResult = { ok?: boolean; operation?: string; message?: string; data?: unknown };
type MonthEvent = { id: string; name: string; target_date: string };
type MonthEventsData = { month: string; year: number; total: number; events: MonthEvent[] };
const MONTH_EVENT_PREVIEW_LIMIT = 5;

const parseToolActivityResult = (result: unknown) => {
  if (typeof result !== "string") return null;
  try {
    const parsed = JSON.parse(result) as ToolActivityResult;
    if (typeof parsed.message !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};

const isMonthEventsData = (data: unknown): data is MonthEventsData => {
  if (!data || typeof data !== "object") return false;
  const value = data as Partial<MonthEventsData>;
  return (
    typeof value.month === "string" &&
    typeof value.year === "number" &&
    typeof value.total === "number" &&
    Array.isArray(value.events) &&
    value.total === value.events.length &&
    value.events.every(
      (event) =>
        event &&
        typeof event === "object" &&
        typeof (event as MonthEvent).id === "string" &&
        typeof (event as MonthEvent).name === "string" &&
        typeof (event as MonthEvent).target_date === "string"
    )
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`)
  );

const MonthEventsActivity = ({ month, year, total, events }: MonthEventsData) => {
  const preview = events.slice(0, MONTH_EVENT_PREVIEW_LIMIT);
  const remaining = events.slice(MONTH_EVENT_PREVIEW_LIMIT);
  return (
    <section
      data-testid="copilot-month-events"
      aria-label={`${month} ${year} events`}
      className="my-2 text-13 text-primary"
    >
      <p className="font-medium">
        {total} {total === 1 ? "event" : "events"} in {month} {year}
      </p>
      {total === 0 ? (
        <p className="text-tertiary">No events are scheduled.</p>
      ) : (
        <>
          {remaining.length > 0 && (
            <p className="text-tertiary">
              Showing {preview.length} of {total}.
            </p>
          )}
          <ol className="my-2 list-decimal space-y-1 pl-5">
            {events.slice(0, MONTH_EVENT_PREVIEW_LIMIT).map((event) => (
              <li key={event.id}>
                <span className="font-medium">{event.name}</span>
                <span className="text-tertiary"> — {formatEventDate(event.target_date)}</span>
              </li>
            ))}
          </ol>
          {remaining.length > 0 && (
            <details>
              <summary>Show remaining {remaining.length} events</summary>
              <ol start={MONTH_EVENT_PREVIEW_LIMIT + 1} className="my-2 list-decimal space-y-1 pl-5">
                {remaining.map((event) => (
                  <li key={event.id}>
                    <span className="font-medium">{event.name}</span>
                    <span className="text-tertiary"> — {formatEventDate(event.target_date)}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </section>
  );
};

const renderToolActivity =
  (activity: string) =>
  ({ status, result }: { status: string; result?: unknown }) => {
    if (status === "complete") {
      const parsed = parseToolActivityResult(result);
      if (parsed?.ok && isMonthEventsData(parsed.data)) return <MonthEventsActivity {...parsed.data} />;
      if (parsed?.ok && parsed.operation === "find_project") return null;
      return (
        <p data-testid="copilot-tool-activity" data-status="complete" className="my-1 text-13 text-tertiary">
          <span className="font-medium">{parsed?.ok ? "Completed" : "Needs attention"}</span>
          {parsed?.message && ` — ${parsed.message}`}
        </p>
      );
    }
    return (
      <p data-testid="copilot-tool-activity" role="status" className="my-1 text-13 text-tertiary">
        {activity}
      </p>
    );
  };

const finishTool = <T extends ToolResult>(result: T, startedAt: number, correlationId: string): T => {
  logToolOutcome(result, { startedAt, correlationId });
  return result;
};

const mutationFailure = (operation: string, error: unknown, affectedIds: string[] = []) => {
  const category = classifyToolError(error).category;
  return category === "network" || category === "timeout"
    ? toolUncertainResult(operation, affectedIds)
    : toolError(operation, error, { mutation: true });
};

type SpreadsheetChangeConfirmationProps = {
  workspace: string;
  projectId: string;
  spreadsheetId: string;
  operation: string;
  payload: Record<string, unknown>;
  summary: string;
  respond: (result: ReturnType<typeof toolError> & { data?: unknown }) => void;
};

const SpreadsheetChangeConfirmation = (props: SpreadsheetChangeConfirmationProps) => {
  const { workspace, projectId, spreadsheetId, operation, payload, summary, respond } = props;
  const idempotencyKey = useRef(crypto.randomUUID());
  const [preview, setPreview] = useState<{ preview_token: string; payload: Record<string, unknown> }>();
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    spreadsheetService
      .agent(workspace, projectId, spreadsheetId, "preview", {
        operation,
        payload,
        idempotency_key: idempotencyKey.current,
      })
      .then(setPreview)
      .catch(() => respond(toolError(operation, "Spreadsheet change could not be previewed.")));
  }, [operation, payload, projectId, respond, spreadsheetId, workspace]);

  const execute = async () => {
    if (!preview || isApplying) return;
    setIsApplying(true);
    try {
      const result = await spreadsheetService.agent(workspace, projectId, spreadsheetId, "execute", {
        preview_token: preview.preview_token,
      });
      respond({ ...toolResult(operation, "Spreadsheet updated.", [spreadsheetId]), data: result });
    } catch {
      respond(toolError(operation, "Spreadsheet change failed."));
    }
  };

  return (
    <section aria-label="Confirm spreadsheet change" className="rounded border border-subtle p-3">
      <p>{summary}</p>
      <pre className="text-xs my-2 max-h-48 overflow-auto rounded bg-layer-1 p-2">
        {preview ? JSON.stringify({ operation, payload: preview.payload }, null, 2) : "Validating preview…"}
      </pre>
      <button
        type="button"
        disabled={isApplying}
        onClick={() => respond(toolError(operation, "Spreadsheet change cancelled."))}
      >
        Cancel
      </button>
      <button type="button" className="ml-2" disabled={!preview || isApplying} onClick={execute}>
        {isApplying ? "Applying…" : "Apply"}
      </button>
    </section>
  );
};

const workItemMutationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(100_000).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  startDate: z.string().date().optional(),
  targetDate: z.string().date().optional(),
  stateId: z.string().uuid().optional(),
  labelIds: z.array(z.string().uuid()).max(100).optional(),
  assigneeIds: z.array(z.string().uuid()).max(100).optional(),
  parentId: z.string().uuid().optional(),
  point: z.number().int().min(0).max(12).optional(),
  estimatePointId: z.string().uuid().optional(),
  workItemTypeId: z.string().uuid().optional(),
});

const createWorkItemsSchema = z.object({
  projectId: z.string().uuid().optional(),
  items: z
    .array(workItemMutationSchema.extend({ title: z.string().min(1).max(255) }))
    .min(1)
    .max(25),
});

const recurringWorkItemSchema = workItemMutationSchema.omit({ startDate: true, targetDate: true }).extend({
  title: z.string().min(1).max(255),
  anchorDate: z.string().date(),
  weekday: z.enum(RECURRENCE_WEEKDAYS),
  occurrences: z.number().int().min(1).max(25),
});

const createRecurringWorkItemsSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    series: z.array(recurringWorkItemSchema).min(1).max(25),
  })
  .superRefine(({ series }, context) => {
    if (series.reduce((total, item) => total + item.occurrences, 0) > 25)
      context.addIssue({
        code: "custom",
        message: "A recurring batch can create at most 25 work items.",
        path: ["series"],
      });
  });

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

const getDefaultLauncherPosition = (): LauncherPosition => ({
  x: Math.max(LAUNCHER_GUTTER, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_GUTTER),
  y: Math.max(LAUNCHER_GUTTER, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_GUTTER),
});

const clampLauncherPosition = ({ x, y }: LauncherPosition): LauncherPosition => ({
  x: clamp(x, LAUNCHER_GUTTER, Math.max(LAUNCHER_GUTTER, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_GUTTER)),
  y: clamp(y, LAUNCHER_GUTTER, Math.max(LAUNCHER_GUTTER, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_GUTTER)),
});

function PlaneTools() {
  const { workspaceSlug, projectId, spreadsheetId } = useParams();
  const { data: user } = useUser();
  const workspace = typeof workspaceSlug === "string" ? workspaceSlug : "";
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>([]);
  const [isWorkspaceOptionsLoading, setIsWorkspaceOptionsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const routeProjectIdRef = useRef<string | undefined>(typeof projectId === "string" ? projectId : undefined);
  const deleteWorkItemTargets = useRef(new Map<string, { workspace: string; projectId: string }>());
  const [panelWidth, setPanelWidth] = useState(DEFAULT_COPILOT_PANEL_WIDTH);
  const panelWidthRef = useRef(DEFAULT_COPILOT_PANEL_WIDTH);
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const launcherPositionRef = useRef<LauncherPosition | null>(null);
  const dragStart = useRef<{ x: number; y: number; pointerX: number; pointerY: number; moved: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setWorkspaceOptions([]);
    setSelectedProjectId(null);
    if (!workspace) {
      setIsWorkspaceOptionsLoading(false);
      return;
    }
    setIsWorkspaceOptionsLoading(true);
    projectService
      .getProjectsLite(workspace)
      .then((projects) => {
        if (cancelled) return null;
        setWorkspaceOptions(
          projects
            .filter(({ archived_at }) => !archived_at)
            .map(({ id, name, identifier }) => ({ id, name, identifier: identifier ?? null }))
        );
        return null;
      })
      .catch(() => {
        if (!cancelled) setWorkspaceOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsWorkspaceOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  useEffect(() => {
    const routeProjectId = typeof projectId === "string" ? projectId : undefined;
    if (!shouldSyncWorkspaceSelection(routeProjectIdRef.current, routeProjectId, selectedProjectId)) return;
    routeProjectIdRef.current = routeProjectId;
    const nextSelectedProjectId = resolveSelectedWorkspaceId({
      routeProjectId,
      selectedProjectId: selectedProjectId ?? undefined,
      availableIds: workspaceOptions.map(({ id }) => id),
    });
    if (nextSelectedProjectId !== selectedProjectId) setSelectedProjectId(nextSelectedProjectId);
  }, [projectId, selectedProjectId, workspaceOptions]);

  const selectedWorkspace = useMemo(
    () => workspaceOptions.find(({ id }) => id === selectedProjectId),
    [selectedProjectId, workspaceOptions]
  );
  const workspaceSelectorOptions = useMemo<ICustomSearchSelectOption[]>(
    () =>
      workspaceOptions.map(({ id, name, identifier }) => ({
        value: id,
        query: `${name} ${identifier ?? ""}`,
        content: (
          <span className="flex max-w-64 items-center gap-2">
            <span className="truncate">{name}</span>
            {identifier && <span className="text-tertiary">{identifier}</span>}
          </span>
        ),
      })),
    [workspaceOptions]
  );

  useAgentContext({
    description: "The selected UI Workspace is the authoritative default for unqualified work-item requests.",
    value: toAgentWorkspaceContext(workspace, selectedWorkspace),
  });

  useEffect(() => {
    const storedWidth = Number(window.localStorage.getItem(COPILOT_PANEL_WIDTH_STORAGE_KEY));
    if (Number.isFinite(storedWidth)) {
      const width = clamp(storedWidth, MIN_COPILOT_PANEL_WIDTH, MAX_COPILOT_PANEL_WIDTH);
      panelWidthRef.current = width;
      setPanelWidth(width);
    }
    window.localStorage.removeItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY);
    setLauncherPosition(getDefaultLauncherPosition());
  }, []);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
    document.documentElement.style.setProperty("--copilot-panel-width", `${panelWidth}px`);
    window.localStorage.setItem(COPILOT_PANEL_WIDTH_STORAGE_KEY, `${panelWidth}`);
  }, [panelWidth]);

  useEffect(() => {
    if (!launcherPosition) return;
    launcherPositionRef.current = launcherPosition;
    document.documentElement.style.setProperty("--copilot-launcher-left", `${launcherPosition.x}px`);
    document.documentElement.style.setProperty("--copilot-launcher-top", `${launcherPosition.y}px`);
    window.localStorage.setItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY, JSON.stringify(launcherPosition));
  }, [launcherPosition]);

  const resetLauncherPosition = useCallback(() => {
    const position = getDefaultLauncherPosition();
    window.localStorage.removeItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY);
    setLauncherPosition(position);
  }, []);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = panelWidthRef.current;
    const resize = (moveEvent: PointerEvent) => {
      const width = clamp(startWidth + startX - moveEvent.clientX, MIN_COPILOT_PANEL_WIDTH, MAX_COPILOT_PANEL_WIDTH);
      panelWidthRef.current = width;
      document.documentElement.style.setProperty("--copilot-panel-width", `${width}px`);
    };
    const stopResize = (releaseEvent: PointerEvent) => {
      if (releaseEvent.pointerId !== event.pointerId) return;
      releaseEvent.stopPropagation();
      const width = panelWidthRef.current;
      window.localStorage.setItem(COPILOT_PANEL_WIDTH_STORAGE_KEY, `${width}`);
      setPanelWidth(width);
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize, true);
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, true);
  };

  const startLauncherDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const currentLauncherPosition = launcherPositionRef.current;
    if (!currentLauncherPosition) return;
    dragStart.current = {
      x: currentLauncherPosition.x,
      y: currentLauncherPosition.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
    };
    const drag = (moveEvent: PointerEvent) => {
      const start = dragStart.current;
      if (!start) return;
      start.moved ||= Math.abs(moveEvent.clientX - start.pointerX) + Math.abs(moveEvent.clientY - start.pointerY) > 4;
      const position = clampLauncherPosition({
        x: start.x + moveEvent.clientX - start.pointerX,
        y: start.y + moveEvent.clientY - start.pointerY,
      });
      launcherPositionRef.current = position;
      document.documentElement.style.setProperty("--copilot-launcher-left", `${position.x}px`);
      document.documentElement.style.setProperty("--copilot-launcher-top", `${position.y}px`);
    };
    const stopDrag = (releaseEvent: PointerEvent) => {
      if (releaseEvent.pointerId !== event.pointerId) return;
      if (launcherPositionRef.current) setLauncherPosition(launcherPositionRef.current);
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", stopDrag);
    };
    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", stopDrag);
  }, []);

  const stopLauncherClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (dragStart.current?.moved) event.preventDefault();
    dragStart.current = null;
  }, []);

  const sidebarToggleButton = useMemo(
    () => ({ onPointerDown: startLauncherDrag, onClick: stopLauncherClick }),
    [startLauncherDrag, stopLauncherClick]
  );

  const sidebarHeader = useMemo(
    () => ({
      children: ({ closeButton, titleContent }: { closeButton: React.ReactNode; titleContent: React.ReactNode }) => (
        <header
          className="relative z-[1201] bg-surface-1 px-4 py-2"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest('[data-testid="copilot-close-button"]')) {
              document.querySelector<HTMLButtonElement>('[data-testid="copilot-chat-toggle"]')?.focus();
              resetLauncherPosition();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.75"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
              </svg>
              <div className="text-13 font-medium">{titleContent}</div>
            </div>
            <span data-testid="copilot-close-button">{closeButton}</span>
          </div>
          <div className="mt-2">
            <CustomSearchSelect
              buttonClassName="min-w-0 max-w-56"
              disabled={isWorkspaceOptionsLoading || workspaceOptions.length === 0}
              label={
                isWorkspaceOptionsLoading ? "Loading Workspaces…" : (selectedWorkspace?.name ?? "Choose Workspace")
              }
              onChange={setSelectedProjectId}
              options={workspaceSelectorOptions}
              portal={false}
              value={selectedProjectId ?? undefined}
            />
          </div>
        </header>
      ),
    }),
    [
      isWorkspaceOptionsLoading,
      resetLauncherPosition,
      selectedProjectId,
      selectedWorkspace?.name,
      workspaceOptions.length,
      workspaceSelectorOptions,
    ]
  );

  useFrontendTool(
    {
      name: "list_month_events",
      description:
        "List all events in a named calendar month for the current year. Use this for requests such as upcoming events in October. It always includes every work-item state.",
      parameters: z.object({ projectId: z.string().uuid().optional(), month: z.enum(MONTH_NAMES) }),
      render: renderToolActivity("Checking monthly events…"),
      handler: async ({ projectId: requestedProjectId, month }) => {
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Select a Workspace first.", retryable: false };
        const timeZone = user?.user_timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
        const { dateFrom, dateTo } = getMonthDateRange(month, getUserLocalDateTime(timeZone).date);
        try {
          const response = await issueService.getIssues(
            workspace,
            targetProjectId,
            buildWorkItemQuery(undefined, dateFrom, dateTo)
          );
          const issues = Array.isArray(response.results) ? response.results : [];
          const events = filterMonthEventRecords(toWorkItemRecords(issues), dateFrom, dateTo);
          const year = Number(dateFrom.slice(0, 4));
          logWorkItemListTrace({
            projectId: targetProjectId,
            dateFrom,
            dateTo,
            resultCount: events.length,
            status: "success",
          });
          return {
            ...toolResult("list_month_events", `Found ${events.length} events for ${month} ${year}.`),
            data: { month, year, total: events.length, events },
          };
        } catch (error) {
          const result = toolError("list_month_events", error);
          logWorkItemListTrace({
            projectId: targetProjectId,
            dateFrom,
            dateTo,
            resultCount: null,
            status: result.status,
          });
          return result;
        }
      },
    },
    [workspace, selectedProjectId, user?.user_timezone]
  );

  useFrontendTool(
    {
      name: "get_current_datetime",
      description:
        "Get the user's current local date, time, and timezone. Use before resolving relative dates or times.",
      parameters: z.object({}),
      render: renderToolActivity("Checking the current time…"),
      handler: async () => {
        const timeZone = user?.user_timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
        const data = getUserLocalDateTime(timeZone);
        return { ...toolResult("get_current_datetime", "Retrieved the user's current local date and time."), data };
      },
    },
    [user?.user_timezone]
  );

  useFrontendTool(
    {
      name: "get_work_item_schema",
      description:
        "Get the current Workspace's assignable work-item states, labels, members, estimate points, and available work-item types. Use before resolving a name to an ID.",
      parameters: z.object({ projectId: z.string().uuid().optional() }),
      render: renderToolActivity("Loading Workspace details…"),
      handler: async ({ projectId: requestedProjectId }) => {
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Select a Workspace first.", retryable: false };
        try {
          const [states, labels, members, workspaceMembers, estimates, project] = await Promise.all([
            stateService.getStates(workspace, targetProjectId),
            labelService.getProjectLabels(workspace, targetProjectId),
            memberService.fetchProjectMembers(workspace, targetProjectId),
            workspaceService.fetchWorkspaceMembers(workspace),
            estimateService.fetchProjectEstimates(workspace, targetProjectId),
            projectService.getProject(workspace, targetProjectId),
          ]);
          const projectTypes = (project as { issue_types?: { id: string; name: string }[] }).issue_types ?? [];
          const workspaceMembersById = new Map(
            workspaceMembers.map(({ member, display_name }) => [member.id, display_name])
          );
          const data = {
            states: states.slice(0, 100).map(({ id, name, group }) => ({ id, name, group })),
            labels: labels.slice(0, 100).map(({ id, name }) => ({ id, name })),
            members: members
              .slice(0, 100)
              .map(({ member }) => ({ id: member, name: workspaceMembersById.get(member) ?? member })),
            estimatePoints: (estimates ?? [])
              .flatMap((estimate) => estimate.points ?? [])
              .filter((point) => point.id && point.value)
              .slice(0, 100)
              .map((point) => ({ id: point.id!, value: point.value! })),
            workItemTypes: projectTypes.slice(0, 100).map(({ id, name }) => ({ id, name })),
          };
          return { ...toolResult("get_work_item_schema", "Retrieved work-item schema.", [targetProjectId]), data };
        } catch (error) {
          return toolError("get_work_item_schema", error);
        }
      },
    },
    [workspace, selectedProjectId]
  );

  useFrontendTool(
    {
      name: "list_projects",
      description: "List up to 20 Workspaces in the current Team.",
      parameters: z.object({}),
      render: renderToolActivity("Looking up Workspaces…"),
      handler: async () => {
        if (!workspace) return { ok: false, message: "A Team is required.", retryable: false };
        try {
          const projects = await projectService.getProjectsLite(workspace);
          const data = projects.slice(0, 20).map(({ id, name, identifier }) => ({ id, name, identifier }));
          return { ...toolResult("list_projects", `Found ${data.length} Workspaces.`), data };
        } catch (error) {
          return toolError("list_projects", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "find_project",
      description:
        "Find up to 20 Workspaces in the current Team by name or identifier. Use this before work-item operations when the user names a Workspace.",
      parameters: z.object({ query: z.string().min(1).max(255) }),
      render: renderToolActivity("Looking up Workspaces…"),
      handler: async ({ query }) => {
        if (!workspace) return { ok: false, message: "A Team is required.", retryable: false };
        try {
          const projects = await projectService.getProjectsLite(workspace);
          const data = findProjectMatches(
            projects.map(({ id, name, identifier }) => ({ id, name, identifier })),
            query
          );
          const message = data.length === 1 ? `Found ${data[0].name}.` : `Found ${data.length} matching Workspaces.`;
          return {
            ...toolResult(
              "find_project",
              message,
              data.map(({ id }) => id)
            ),
            data,
          };
        } catch (error) {
          return toolError("find_project", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "create_project",
      description: "Create one Workspace in the current Team.",
      parameters: z.object({ name: z.string().min(1).max(255), identifier: z.string().min(1).max(20).optional() }),
      render: renderToolActivity("Creating the Workspace…"),
      handler: async ({ name, identifier }) => {
        const startedAt = Date.now();
        const correlationId = crypto.randomUUID();
        if (!workspace)
          return finishTool(toolValidationError("create_project", "A Team is required."), startedAt, correlationId);
        const result = await mutationGuard.run(
          mutationFingerprint("create_project", workspace, { name, identifier }),
          async () => {
            try {
              const project = await projectService.createProject(workspace, {
                name,
                ...(identifier ? { identifier } : {}),
              });
              if (!isCanonicalRecord(project)) return toolUncertainResult("create_project");
              return {
                ...toolResult("create_project", `Created ${project.name}.`, [project.id]),
                data: { id: project.id, name: project.name },
              };
            } catch (error) {
              return mutationFailure("create_project", error);
            }
          },
          "create_project"
        );
        return finishTool(result, startedAt, correlationId);
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "update_project",
      description: "Update the name of one Workspace in the current Team.",
      parameters: z.object({ projectId: z.string().uuid(), name: z.string().min(1).max(255) }),
      render: renderToolActivity("Updating the Workspace…"),
      handler: async ({ projectId: targetProjectId, name }) => {
        const startedAt = Date.now();
        const correlationId = crypto.randomUUID();
        if (!workspace)
          return finishTool(toolValidationError("update_project", "A Team is required."), startedAt, correlationId);
        const result = await mutationGuard.run(
          mutationFingerprint("update_project", workspace, targetProjectId, { name }),
          async () => {
            try {
              await projectService.updateProject(workspace, targetProjectId, { name });
              const project = await projectService.getProject(workspace, targetProjectId);
              if (
                !isCanonicalRecord(project) ||
                !requestedFieldsMatch(project as unknown as Record<string, unknown>, { name })
              )
                return toolUncertainResult("update_project", [targetProjectId]);
              return {
                ...toolResult("update_project", `Updated ${project.name}.`, [project.id]),
                data: { id: project.id, name: project.name },
              };
            } catch (error) {
              return mutationFailure("update_project", error, [targetProjectId]);
            }
          },
          "update_project"
        );
        return finishTool(result, startedAt, correlationId);
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "get_project",
      description: "Get one Workspace by its canonical ID.",
      parameters: z.object({ projectId: z.string().uuid() }),
      render: renderToolActivity("Loading the Workspace…"),
      handler: async ({ projectId: targetProjectId }) => {
        if (!workspace) return { ok: false, message: "A Team is required.", retryable: false };
        try {
          const project = await projectService.getProject(workspace, targetProjectId);
          const data = { id: project.id, name: project.name, identifier: project.identifier };
          return { ...toolResult("get_project", `Found ${project.name}.`, [project.id]), data };
        } catch (error) {
          return toolError("get_project", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "list_work_items",
      description:
        "List up to 20 work items, optionally limited to one state bucket and an inclusive target-date range. For upcoming work in a requested period, call get_current_datetime when needed, then pass dateFrom and dateTo. Use the current Workspace by default, or pass a canonical ID returned by find_project.",
      parameters: z.object({
        projectId: z.string().uuid().optional(),
        stateGroup: z.enum(WORK_ITEM_STATE_GROUPS).optional(),
        dateFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        dateTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
      render: renderToolActivity("Checking work items…"),
      handler: async ({ projectId: requestedProjectId, stateGroup, dateFrom, dateTo }) => {
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Select a Workspace first.", retryable: false };
        try {
          const response = await issueService.getIssues(
            workspace,
            targetProjectId,
            buildWorkItemQuery(stateGroup ?? undefined, dateFrom, dateTo)
          );
          const issues = Array.isArray(response.results) ? response.results : [];
          const data = toWorkItemRecords(issues);
          logWorkItemListTrace({
            projectId: targetProjectId,
            dateFrom,
            dateTo,
            stateGroup,
            resultCount: data.length,
            status: "success",
          });
          return { ...toolResult("list_work_items", `Found ${data.length} work items.`), data };
        } catch (error) {
          const result = toolError("list_work_items", error);
          logWorkItemListTrace({
            projectId: targetProjectId,
            dateFrom,
            dateTo,
            stateGroup,
            resultCount: null,
            status: result.status,
          });
          return result;
        }
      },
    },
    [workspace, selectedProjectId]
  );

  useFrontendTool(
    {
      name: "create_work_item",
      description:
        "Create one work item with any supported editable fields. Use create_work_items for multiple items. When the user names a Workspace, pass its canonical ID returned by find_project.",
      parameters: workItemMutationSchema.extend({
        title: z.string().min(1).max(255),
        projectId: z.string().uuid().optional(),
      }),
      render: renderToolActivity("Creating the work item…"),
      handler: async ({ projectId: requestedProjectId, ...input }) => {
        const startedAt = Date.now();
        const correlationId = crypto.randomUUID();
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return finishTool(
            toolValidationError("create_work_item", "Select a Workspace first."),
            startedAt,
            correlationId
          );
        const result = await mutationGuard.run(
          mutationFingerprint("create_work_item", workspace, targetProjectId, input),
          async () => {
            try {
              const issue = await issueService.createIssue(workspace, targetProjectId, toWorkItemPayload(input));
              if (!isCanonicalRecord(issue)) return toolUncertainResult("create_work_item");
              return {
                ...toolResult("create_work_item", `Created ${issue.name}.`, [issue.id]),
                data: { id: issue.id, name: issue.name },
              };
            } catch (error) {
              return mutationFailure("create_work_item", error);
            }
          },
          "create_work_item"
        );
        return finishTool(result, startedAt, correlationId);
      },
    },
    [workspace, selectedProjectId]
  );

  useFrontendTool(
    {
      name: "create_work_items",
      description:
        "Create multiple work items in one Workspace. Use this for a list of two or more items. For a named Workspace, pass the canonical ID returned by find_project. Each item is attempted independently; include time and location in description when supplied.",
      parameters: createWorkItemsSchema,
      render: renderToolActivity("Creating work items…"),
      handler: async ({ projectId: requestedProjectId, items }) => {
        const startedAt = Date.now();
        const correlationId = crypto.randomUUID();
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return finishTool(
            toolValidationError("create_work_items", "Select a Workspace first."),
            startedAt,
            correlationId
          );

        const result = await mutationGuard.run(
          mutationFingerprint("create_work_items", workspace, targetProjectId, items),
          async () => {
            const results = await createWorkItemsSequentially(items, async (item) =>
              issueService.createIssue(workspace, targetProjectId, toWorkItemPayload(item))
            );
            const created = results.created
              .filter(({ value }) => isCanonicalRecord(value))
              .map(({ item, value }) => ({ id: value.id, name: item.title }));
            const invalidCount = results.created.length - created.length;
            const failed = results.failed.map(({ item, message }) => ({ name: item.title, message }));
            const affectedIds = created.map(({ id }) => id);
            const message =
              failed.length || invalidCount
                ? `Created ${created.length} of ${items.length} work items. ${failed.length + invalidCount} item(s) failed or could not be verified.`
                : `Created ${created.length} work items.`;
            const hasAmbiguousFailure =
              invalidCount > 0 ||
              results.failed.some(({ error }) => {
                const category = classifyToolError(error).category;
                return category === "network" || category === "timeout";
              });
            const outcome = hasAmbiguousFailure
              ? toolUncertainResult("create_work_items", affectedIds, message)
              : failed.length && created.length
                ? toolPartialResult("create_work_items", message, affectedIds)
                : failed.length
                  ? toolError("create_work_items", results.failed[0].error, { mutation: true })
                  : toolResult("create_work_items", message, affectedIds);
            return { ...outcome, data: { created, failed } };
          },
          "create_work_items"
        );
        return finishTool(result, startedAt, correlationId);
      },
    },
    [workspace, selectedProjectId]
  );

  useFrontendTool(
    {
      name: "create_recurring_work_items",
      description:
        "Create weekly recurring work-item instances in one Workspace. Call get_current_datetime first; use the user's earliest requested date as anchorDate, or its local date when none is requested. Each generated instance gets matching start and due dates on the requested weekday; provide all series in one call.",
      parameters: createRecurringWorkItemsSchema,
      render: renderToolActivity("Creating recurring work items…"),
      handler: async (input) => {
        const startedAt = Date.now();
        const correlationId = crypto.randomUUID();
        const validated = createRecurringWorkItemsSchema.safeParse(normalizeRecurringWorkItemInput(input));
        if (!validated.success) {
          const invalidFields = formatValidationFields(
            validated.error.issues.map(({ path }) => path as Array<string | number>)
          );
          const invalidMessages = [...new Set(validated.error.issues.map(({ message }) => message))];
          return finishTool(
            toolValidationError(
              "create_recurring_work_items",
              `Provide valid recurring work-item series. Invalid fields: ${invalidFields.join(", ") || "unknown"}. ${invalidMessages.join(" ")}`
            ),
            startedAt,
            correlationId
          );
        }
        const { projectId: requestedProjectId, series } = validated.data;
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return finishTool(
            toolValidationError("create_recurring_work_items", "Select a Workspace first."),
            startedAt,
            correlationId
          );

        const items = series.flatMap(({ anchorDate, weekday, occurrences, ...item }) =>
          expandWeeklyOccurrenceDates(anchorDate, weekday, occurrences).map((date) =>
            Object.assign({}, item, { startDate: date, targetDate: date })
          )
        );
        const result = await mutationGuard.run(
          mutationFingerprint("create_recurring_work_items", workspace, targetProjectId, series),
          async () => {
            const results = await createWorkItemsSequentially(items, async (item) =>
              issueService.createIssue(workspace, targetProjectId, toWorkItemPayload(item))
            );
            const created = results.created
              .filter(({ value }) => isCanonicalRecord(value))
              .map(({ item, value }) => ({ id: value.id, name: item.title, date: item.targetDate }));
            const invalidCount = results.created.length - created.length;
            const failed = results.failed.map(({ item, message }) => ({
              name: item.title,
              date: item.targetDate,
              message,
            }));
            const affectedIds = created.map(({ id }) => id);
            const message =
              failed.length || invalidCount
                ? `Created ${created.length} of ${items.length} recurring work items. ${failed.length + invalidCount} item(s) failed or could not be verified.`
                : `Created ${created.length} recurring work items.`;
            const hasAmbiguousFailure =
              invalidCount > 0 ||
              results.failed.some(({ error }) => {
                const category = classifyToolError(error).category;
                return category === "network" || category === "timeout";
              });
            const outcome = hasAmbiguousFailure
              ? toolUncertainResult("create_recurring_work_items", affectedIds, message)
              : failed.length && created.length
                ? toolPartialResult("create_recurring_work_items", message, affectedIds)
                : failed.length
                  ? toolError("create_recurring_work_items", results.failed[0].error, { mutation: true })
                  : toolResult("create_recurring_work_items", message, affectedIds);
            return { ...outcome, data: { created, failed } };
          },
          "create_recurring_work_items"
        );
        return finishTool(result, startedAt, correlationId);
      },
    },
    [workspace, selectedProjectId]
  );

  useFrontendTool(
    {
      name: "get_work_item",
      description: "Get one work item in the current Workspace by its canonical work-item ID.",
      parameters: z.object({ issueId: z.string().uuid(), projectId: z.string().uuid().optional() }),
      render: renderToolActivity("Loading the work item…"),
      handler: async ({ issueId, projectId: requestedProjectId }) => {
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Select a Workspace first.", retryable: false };
        try {
          const issue = await issueService.retrieve(workspace, targetProjectId, issueId);
          const data = toWorkItemRecords([issue])[0];
          return { ...toolResult("get_work_item", `Found ${issue.name}.`, [issue.id]), data };
        } catch (error) {
          return toolError("get_work_item", error);
        }
      },
    },
    [workspace, selectedProjectId]
  );

  useFrontendTool(
    {
      name: "open_work_item",
      description: "Navigate to a work item in the current Workspace.",
      parameters: z.object({ issueId: z.string().uuid(), projectId: z.string().uuid().optional() }),
      render: renderToolActivity("Opening the work item…"),
      handler: async ({ issueId, projectId: requestedProjectId }) => {
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Select a Workspace first.", retryable: false };
        window.location.assign(`/${workspace}/projects/${targetProjectId}/issues/${issueId}`);
        return toolResult("open_work_item", "Opening work item.", [issueId]);
      },
      followUp: false,
    },
    [workspace, selectedProjectId]
  );

  useFrontendTool(
    {
      name: "update_work_item",
      description: "Update one work item in the current Workspace with any supported editable fields.",
      parameters: workItemMutationSchema
        .extend({ issueId: z.string().uuid(), projectId: z.string().uuid().optional() })
        .refine(
          ({ issueId: _issueId, projectId: _projectId, ...changes }) =>
            Object.values(changes).some((value) => value !== undefined),
          {
            message: "Provide at least one work-item field to update.",
          }
        ),
      render: renderToolActivity("Updating the work item…"),
      handler: async ({ issueId, projectId: requestedProjectId, ...changes }) => {
        const startedAt = Date.now();
        const correlationId = crypto.randomUUID();
        const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (!workspace || !targetProjectId)
          return finishTool(
            toolValidationError("update_work_item", "Select a Workspace first."),
            startedAt,
            correlationId
          );
        const payload = toWorkItemPayload(changes);
        const result = await mutationGuard.run(
          mutationFingerprint("update_work_item", workspace, targetProjectId, issueId, payload),
          async () => {
            try {
              await issueService.patchIssue(workspace, targetProjectId, issueId, payload);
              const issue = await issueService.retrieve(workspace, targetProjectId, issueId);
              if (!isCanonicalRecord(issue) || !requestedFieldsMatch(issue, payload))
                return toolUncertainResult("update_work_item", [issueId]);
              return {
                ...toolResult("update_work_item", `Updated ${issue.name}.`, [issue.id]),
                data: toWorkItemRecords([issue])[0],
              };
            } catch (error) {
              return mutationFailure("update_work_item", error, [issueId]);
            }
          },
          "update_work_item"
        );
        return finishTool(result, startedAt, correlationId);
      },
    },
    [workspace, selectedProjectId]
  );

  useHumanInTheLoop(
    {
      name: "confirm_delete_work_item",
      description: "Use this tool to delete a work item. It always requires explicit user approval.",
      parameters: z.object({
        issueId: z.string().uuid(),
        name: z.string().min(1).max(255),
        projectId: z.string().uuid().optional(),
      }),
      render: ({ args, status, respond, toolCallId }) => {
        const requestedProjectId = args.projectId;
        const initialTargetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
        if (
          status === "executing" &&
          workspace &&
          initialTargetProjectId &&
          !deleteWorkItemTargets.current.has(toolCallId)
        )
          deleteWorkItemTargets.current.set(toolCallId, { workspace, projectId: initialTargetProjectId });
        const target = deleteWorkItemTargets.current.get(toolCallId);
        const execute = async () => {
          if (!target || !respond) return;
          const startedAt = Date.now();
          const correlationId = crypto.randomUUID();
          const result = await mutationGuard.run(
            mutationFingerprint("delete_work_item", target.workspace, target.projectId, args.issueId),
            async () => {
              try {
                await issueService.deleteIssue(target.workspace, target.projectId, args.issueId);
              } catch (error) {
                const category = classifyToolError(error).category;
                if (category !== "network" && category !== "timeout")
                  return toolError("delete_work_item", error, { mutation: true });
              }
              return confirmDeleted("delete_work_item", args.issueId, () =>
                issueService.retrieve(target.workspace, target.projectId, args.issueId)
              );
            },
            "delete_work_item"
          );
          deleteWorkItemTargets.current.delete(toolCallId);
          respond(finishTool(result, startedAt, correlationId));
        };
        if (status !== "executing" || !respond) {
          deleteWorkItemTargets.current.delete(toolCallId);
          return <p>Preparing deletion confirmation…</p>;
        }
        if (!target) return <p>Select a Workspace first.</p>;
        return (
          <section aria-label="Confirm work item deletion" className="border-red-500 rounded border p-3">
            <p>Delete {args.name}? This cannot be undone.</p>
            <button
              type="button"
              onClick={() => respond(toolValidationError("delete_work_item", "Deletion cancelled.", [args.issueId]))}
            >
              Cancel
            </button>
            <button type="button" className="ml-2" onClick={execute}>
              Delete
            </button>
          </section>
        );
      },
    },
    [workspace, selectedProjectId]
  );

  useHumanInTheLoop(
    {
      name: "change_spreadsheet",
      description:
        "Preview and, after explicit approval, change rows, tables, columns, views, forms, or formulas in the active spreadsheet.",
      parameters: z.object({
        operation: z.enum([
          "add_records",
          "update_records",
          "delete_records",
          "create_table",
          "add_column",
          "update_column",
          "create_view",
          "create_form",
          "set_formula",
        ]),
        payload: z.record(z.string(), z.unknown()),
        summary: z.string().min(1).max(500),
      }),
      render: ({ args, status, respond }) => {
        if (status !== "executing" || !respond) return <p>Preparing spreadsheet change…</p>;
        if (!workspace || !projectId || !spreadsheetId) return <p>Open a spreadsheet before requesting a change.</p>;
        return (
          <SpreadsheetChangeConfirmation
            workspace={workspace}
            projectId={projectId}
            spreadsheetId={spreadsheetId}
            operation={args.operation}
            payload={args.payload}
            summary={args.summary}
            respond={respond}
          />
        );
      },
    },
    [workspace, projectId, spreadsheetId]
  );

  useFrontendTool(
    {
      name: "query_spreadsheet",
      description: "Query up to 100 rows from a table in the active spreadsheet.",
      parameters: z.object({
        table: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
        limit: z.number().int().min(1).max(100).default(50),
      }),
      render: renderToolActivity("Checking the spreadsheet…"),
      handler: async ({ table, limit }) => {
        if (!workspace || !projectId || !spreadsheetId)
          return toolError("query_spreadsheet", "Open a spreadsheet first.");
        try {
          const data = await spreadsheetService.agent(workspace, projectId, spreadsheetId, "query", { table, limit });
          return { ...toolResult("query_spreadsheet", `Read ${table}.`, [spreadsheetId]), data };
        } catch {
          return toolError("query_spreadsheet", "Spreadsheet query failed.");
        }
      },
    },
    [workspace, projectId, spreadsheetId]
  );

  useHumanInTheLoop(
    {
      name: "confirm_delete_project",
      description: "Use this tool to delete a Workspace. It always requires explicit user approval.",
      parameters: z.object({ projectId: z.string().uuid(), name: z.string().min(1).max(255) }),
      render: ({ args, status, respond }) => {
        const execute = async () => {
          if (!workspace || !respond) return;
          const startedAt = Date.now();
          const correlationId = crypto.randomUUID();
          const result = await mutationGuard.run(
            mutationFingerprint("delete_project", workspace, args.projectId),
            async () => {
              try {
                await projectService.deleteProject(workspace, args.projectId);
              } catch (error) {
                const category = classifyToolError(error).category;
                if (category !== "network" && category !== "timeout")
                  return toolError("delete_project", error, { mutation: true });
              }
              return confirmDeleted("delete_project", args.projectId, () =>
                projectService.getProject(workspace, args.projectId)
              );
            },
            "delete_project"
          );
          respond(finishTool(result, startedAt, correlationId));
        };
        if (status !== "executing" || !respond) return <p>Preparing deletion confirmation…</p>;
        return (
          <section aria-label="Confirm Workspace deletion" className="border-red-500 rounded border p-3">
            <p>Delete {args.name}? This cannot be undone.</p>
            <button
              type="button"
              onClick={() => respond(toolValidationError("delete_project", "Deletion cancelled.", [args.projectId]))}
            >
              Cancel
            </button>
            <button type="button" className="ml-2" onClick={execute}>
              Delete
            </button>
          </section>
        );
      },
    },
    [workspace]
  );

  return (
    <>
      <CopilotSidebar
        defaultOpen={false}
        header={sidebarHeader}
        labels={COPILOT_SIDEBAR_LABELS}
        position="right"
        width="var(--copilot-panel-width)"
        toggleButton={sidebarToggleButton}
      />
      <div
        className="copilot-panel-resize-handle"
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
      />
    </>
  );
}

export function PlaneCopilot() {
  const runtimeUrl = import.meta.env.VITE_COPILOTKIT_RUNTIME_URL || "http://localhost:8200/api/copilotkit";
  const [token, setToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;
    let failures = 0;
    const refresh = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me/copilot-identity/`, { credentials: "include" });
        if (cancelled) return;
        if (!response.ok) {
          failures++;
          refreshTimer = window.setTimeout(refresh, getRetryDelay(response.headers.get("Retry-After"), failures));
          return;
        }
        const identity = (await response.json()) as { token: string; expires_at: string };
        if (cancelled) return;
        failures = 0;
        setToken(identity.token);
        refreshTimer = window.setTimeout(
          refresh,
          Math.max(Date.parse(identity.expires_at) - Date.now() - 30_000, 1_000)
        );
      } catch {
        failures++;
        if (!cancelled) refreshTimer = window.setTimeout(refresh, getRetryDelay(null, failures));
      }
    };
    void refresh();
    return () => {
      cancelled = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, []);

  if (!token) return null;
  return (
    <CopilotKit
      runtimeUrl={runtimeUrl}
      credentials="omit"
      headers={() => ({ Authorization: `Bearer ${token}` })}
      enableInspector={false}
      showDevConsole={false}
    >
      <PlaneTools />
    </CopilotKit>
  );
}
