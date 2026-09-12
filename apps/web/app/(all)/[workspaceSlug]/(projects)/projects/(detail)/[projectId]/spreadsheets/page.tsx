import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchOutline } from "@makeplane/propel/icons";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { useNavigate } from "react-router";
import { useUserPermissions } from "@/hooks/store/user";
import {
  filterAndSortSpreadsheetDocuments,
  type TSpreadsheetSort,
  type TSpreadsheetStatusFilter,
} from "@/lib/spreadsheet-list";
import {
  SpreadsheetService,
  type TSpreadsheetDocument,
  type TSpreadsheetDocumentType,
  type TSpreadsheetFormPublication,
} from "@/services/spreadsheet.service";
import {
  ArchiveResourceModal,
  FormShareModal,
  ResourceNameModal,
  ResourceTable,
  type TResourceAction,
} from "./resource-list";
import type { Route } from "./+types/page";

const service = new SpreadsheetService();
type Props = { params: Route.ComponentProps["params"]; documentType?: TSpreadsheetDocumentType };

export function SpreadsheetDocumentsPage({ params, documentType = "sheet" }: Props) {
  const { workspaceSlug, projectId } = params;
  const isForm = documentType === "form";
  const title = isForm ? "Forms" : "Sheets";
  const itemName = isForm ? "form" : "sheet";
  const route = isForm ? "forms" : "spreadsheets";
  const navigate = useNavigate();
  const { allowPermissions } = useUserPermissions();
  const canEdit = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );
  const [documents, setDocuments] = useState<TSpreadsheetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TSpreadsheetSort>("updated-desc");
  const [statusFilter, setStatusFilter] = useState<TSpreadsheetStatusFilter>("all");
  const [dialog, setDialog] = useState<"create" | "rename" | "duplicate" | "archive" | "share" | null>(null);
  const [selected, setSelected] = useState<TSpreadsheetDocument | null>(null);
  const [archiving, setArchiving] = useState(false);
  const transient = documents.some(
    ({ status: documentStatus }) => documentStatus === "provisioning" || documentStatus === "archiving"
  );
  const statuses = useMemo(
    () => [...new Set(documents.map(({ status: documentStatus }) => documentStatus))],
    [documents]
  );
  const visible = useMemo(
    () => filterAndSortSpreadsheetDocuments(documents, query, statusFilter, sort),
    [documents, query, sort, statusFilter]
  );

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setDocuments(await service.list(workspaceSlug, projectId, documentType));
        setError("");
      } catch {
        if (!quiet) setError(`Unable to load ${title.toLowerCase()}.`);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [documentType, projectId, title, workspaceSlug]
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!transient) return;
    const refresh = window.setInterval(() => void load(true), 2000);
    return () => window.clearInterval(refresh);
  }, [load, transient]);

  const pathFor = (document: TSpreadsheetDocument) => `/${workspaceSlug}/projects/${projectId}/${route}/${document.id}`;
  const updateDocument = (updated: TSpreadsheetDocument) =>
    setDocuments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  const notify = (message: string, type: TOAST_TYPE = TOAST_TYPE.SUCCESS) =>
    setToast({ type, title: type === TOAST_TYPE.SUCCESS ? "Success" : "Something went wrong", message });
  const onAction = (action: TResourceAction, document: TSpreadsheetDocument) => {
    setSelected(document);
    if (action === "open" || action === "retry") return navigate(pathFor(document));
    setDialog(action);
  };
  const submitCreate = async (name: string) => {
    const created = await service.create(workspaceSlug, projectId, name, documentType);
    setDocuments((current) => [created, ...current]);
    notify(`${isForm ? "Form" : "Sheet"} created.`);
  };
  const submitRename = async (name: string) => {
    if (!selected) return;
    updateDocument(await service.rename(workspaceSlug, projectId, selected.id, name));
    notify(`${isForm ? "Form" : "Sheet"} renamed.`);
  };
  const submitDuplicate = async (name: string) => {
    if (!selected) return;
    const duplicate = await service.duplicate(workspaceSlug, projectId, selected.id, name);
    setDocuments((current) => [duplicate, ...current]);
    notify(`${isForm ? "Form" : "Sheet"} duplicated.`);
  };
  const submitArchive = async () => {
    if (!selected) return;
    const previous = selected;
    setArchiving(true);
    updateDocument({ ...selected, status: "archiving" });
    try {
      await service.archive(workspaceSlug, projectId, selected.id);
      setDialog(null);
      notify(`${isForm ? "Form" : "Sheet"} archived.`);
    } catch {
      updateDocument(previous);
      notify(`Unable to archive the ${itemName}.`, TOAST_TYPE.ERROR);
    } finally {
      setArchiving(false);
    }
  };
  const setPublication = (publication: TSpreadsheetFormPublication) => {
    if (!selected) return;
    const updated = { ...selected, publication };
    setSelected(updated);
    updateDocument(updated);
  };
  const publish = async (access: TSpreadsheetFormPublication["access"]) =>
    setPublication(await service.publish(workspaceSlug, projectId, selected!.id, access));
  const updatePublication = async (changes: Partial<Pick<TSpreadsheetFormPublication, "access" | "enabled">>) =>
    setPublication(
      await service.updatePublication(workspaceSlug, projectId, selected!.id, selected!.publication!.id, changes)
    );

  if (loading) return <div className="p-6 text-secondary">Loading {title.toLowerCase()}…</div>;
  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">{title}</h1>
          <p className="mt-1 text-12 text-secondary">
            {documents.length} {documents.length === 1 ? itemName : `${itemName}s`}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setSelected(null);
              setDialog("create");
            }}
          >
            New {itemName}
          </Button>
        )}
      </div>
      {error ? (
        <div className="rounded-lg border border-danger-subtle bg-danger-subtle p-4 text-13 text-danger-primary">
          {error}{" "}
          <button className="ml-2 font-medium underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-subtle p-10 text-center">
          <h2 className="font-medium text-primary">No {title.toLowerCase()} yet</h2>
          <p className="mt-1 text-13 text-secondary">
            {isForm
              ? "Create a form to collect structured responses."
              : "Create a sheet for structured data, formulas, and collaboration."}
          </p>
          {canEdit && (
            <Button className="mt-4" onClick={() => setDialog("create")}>
              New {itemName}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-80">
              <SearchOutline className="absolute top-2.5 left-3 size-4 text-tertiary" />
              <span className="sr-only">Search {title.toLowerCase()}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}…`}
                className="focus:border-accent-primary h-9 w-full rounded-md border border-subtle bg-surface-1 pr-3 pl-9 text-13 text-primary outline-none"
              />
            </label>
            <select
              aria-label="Sort resources"
              value={sort}
              onChange={(event) => setSort(event.target.value as TSpreadsheetSort)}
              className="h-9 rounded-md border border-subtle bg-surface-1 px-3 text-13 text-primary"
            >
              <option value="updated-desc">Recently modified</option>
              <option value="created-desc">Recently created</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
            {statuses.length > 1 && (
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as TSpreadsheetStatusFilter)}
                className="h-9 rounded-md border border-subtle bg-surface-1 px-3 text-13 text-primary capitalize"
              >
                <option value="all">All statuses</option>
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </div>
          {visible.length ? (
            <ResourceTable
              documents={visible}
              canEdit={canEdit}
              onOpen={(document) => navigate(pathFor(document))}
              onAction={onAction}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-subtle p-8 text-center text-13 text-secondary">
              No {title.toLowerCase()} match your search and filters.{" "}
              <button
                className="font-medium text-accent-primary"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}
      <ResourceNameModal
        isOpen={dialog === "create"}
        title={`Create ${itemName}`}
        initialName={`Untitled ${itemName}`}
        submitLabel={`Create ${itemName}`}
        onClose={() => setDialog(null)}
        onSubmit={submitCreate}
      />
      <ResourceNameModal
        isOpen={dialog === "rename"}
        title={`Rename ${itemName}`}
        initialName={selected?.name ?? ""}
        submitLabel="Rename"
        onClose={() => setDialog(null)}
        onSubmit={submitRename}
      />
      <ResourceNameModal
        isOpen={dialog === "duplicate"}
        title={`Duplicate ${itemName}`}
        initialName={`${selected?.name ?? "Untitled"} copy`}
        submitLabel="Make a copy"
        onClose={() => setDialog(null)}
        onSubmit={submitDuplicate}
      />
      <ArchiveResourceModal
        document={selected}
        isOpen={dialog === "archive"}
        submitting={archiving}
        onClose={() => setDialog(null)}
        onSubmit={() => void submitArchive()}
      />
      <FormShareModal
        document={selected}
        isOpen={dialog === "share"}
        onClose={() => setDialog(null)}
        onPublish={publish}
        onUpdate={updatePublication}
      />
    </div>
  );
}

export default function SpreadsheetsPage({ params }: Route.ComponentProps) {
  return <SpreadsheetDocumentsPage params={params} />;
}
