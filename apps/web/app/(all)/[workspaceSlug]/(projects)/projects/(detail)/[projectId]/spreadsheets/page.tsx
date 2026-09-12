import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchOutline } from "@makeplane/propel/icons";
import { ClipboardPenLine, Table2 } from "lucide-react";
import { Input, InputGroup } from "@makeplane/propel/components/input";
import { CustomMenu } from "@plane/ui";
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
  RESOURCE_STATUS_LABELS,
  type TResourceAction,
} from "./resource-list";
import type { Route } from "./+types/page";

const service = new SpreadsheetService();
type Props = { params: Route.ComponentProps["params"]; documentType?: TSpreadsheetDocumentType };

export function SpreadsheetDocumentsPage({ params, documentType = "sheet" }: Props) {
  const { workspaceSlug, projectId } = params;
  const isForm = documentType === "form";
  const title = isForm ? "Forms" : "Sheets";
  const ResourceIcon = isForm ? ClipboardPenLine : Table2;
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
    <div className="flex h-full flex-col overflow-hidden bg-layer-1">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-subtle bg-surface-1 px-page-x py-2">
        <div className="mr-auto flex items-center gap-2">
          <ResourceIcon className="size-4 text-secondary" aria-hidden="true" />
          <h1 className="text-14 font-medium text-primary">{title}</h1>
          <span className="rounded-full bg-accent-primary/20 px-2 text-11 text-accent-primary">{documents.length}</span>
        </div>
        <div className="w-40 sm:w-48">
          <InputGroup size="lg">
            <SearchOutline className="size-3.5 text-tertiary" aria-hidden="true" />
            <Input
              size="lg"
              aria-label={`Search ${title.toLowerCase()}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
            />
          </InputGroup>
        </div>
        <CustomMenu
          label={
            {
              "updated-desc": "Recently modified",
              "created-desc": "Recently created",
              "name-asc": "Name A–Z",
              "name-desc": "Name Z–A",
            }[sort]
          }
          placement="bottom-end"
          closeOnSelect
        >
          {(["updated-desc", "created-desc", "name-asc", "name-desc"] as const).map((value) => (
            <CustomMenu.MenuItem
              key={value}
              onClick={() => setSort(value)}
              className={sort === value ? "bg-layer-1 text-primary" : ""}
            >
              {
                {
                  "updated-desc": "Recently modified",
                  "created-desc": "Recently created",
                  "name-asc": "Name A–Z",
                  "name-desc": "Name Z–A",
                }[value]
              }
            </CustomMenu.MenuItem>
          ))}
        </CustomMenu>
        {(statuses.length > 1 || statusFilter !== "all") && (
          <CustomMenu
            label={statusFilter === "all" ? "Status" : RESOURCE_STATUS_LABELS[statusFilter]}
            placement="bottom-end"
            closeOnSelect
            buttonClassName="capitalize"
          >
            <CustomMenu.MenuItem onClick={() => setStatusFilter("all")}>All statuses</CustomMenu.MenuItem>
            {statuses.map((value) => (
              <CustomMenu.MenuItem key={value} onClick={() => setStatusFilter(value)} className="capitalize">
                {RESOURCE_STATUS_LABELS[value]}
              </CustomMenu.MenuItem>
            ))}
          </CustomMenu>
        )}
        {canEdit && (
          <Button
            size="lg"
            onClick={() => {
              setSelected(null);
              setDialog("create");
            }}
          >
            New {itemName}
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
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
      </div>
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
        requireChange
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
