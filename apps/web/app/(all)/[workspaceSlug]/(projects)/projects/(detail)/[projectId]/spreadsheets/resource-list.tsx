import { useEffect, useRef, useState } from "react";
import {
  ArchiveOutline,
  CopyOutline,
  EditOutline,
  LinkOutline,
  MoreHorizontalOutline,
  NewTabOutline,
  RefreshOutline,
  ShareOutline,
} from "@makeplane/propel/icons";
import { Avatar } from "@plane/propel/avatar";
import { Button } from "@plane/propel/button";
import { IconButton } from "@plane/propel/icon-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@plane/propel/table";
import type { TContextMenuItem } from "@plane/ui";
import { AlertModalCore, ContextMenu, CustomMenu, ModalCore } from "@plane/ui";
import { calculateTimeAgoShort, cn, getFileURL } from "@plane/utils";
import type {
  TSpreadsheetDocument,
  TSpreadsheetFormPublication,
  TSpreadsheetStatus,
} from "@/services/spreadsheet.service";

export type TResourceAction = "open" | "share" | "rename" | "duplicate" | "archive" | "retry";

const STATUS_STYLES: Record<TSpreadsheetStatus, string> = {
  ready: "bg-success-subtle text-success-primary",
  provisioning: "bg-accent-subtle text-accent-primary",
  degraded: "bg-danger-subtle text-danger-primary",
  archiving: "bg-warning-subtle text-warning-primary",
  archived: "bg-layer-2 text-secondary",
};

const sharingLabel = (document: TSpreadsheetDocument) =>
  document.document_type === "sheet"
    ? "Project members"
    : document.publication?.enabled
      ? document.publication.access === "public"
        ? "Public"
        : "Signed-in users"
      : "Draft";

export function ResourceNameModal({
  isOpen,
  title,
  initialName,
  submitLabel,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  initialName: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError("");
    }
  }, [initialName, isOpen]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return setError("A name is required.");
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(value);
      onClose();
    } catch (reason: any) {
      setError(reason?.response?.data?.name?.[0] ?? reason?.response?.data?.error ?? "Unable to save changes.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <ModalCore isOpen={isOpen} handleClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-4 p-5">
          <h2 className="text-18 font-medium text-primary">{title}</h2>
          <div>
            <label htmlFor="resource-name" className="mb-2 block text-13 font-medium text-secondary">
              Name
            </label>
            <input
              id="resource-name"
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="focus:border-accent-primary h-9 w-full rounded-md border border-subtle bg-surface-1 px-3 text-13 text-primary outline-none"
            />
            {error && <p className="mt-1 text-11 text-danger-primary">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!name.trim() || name.trim() === initialName.trim()}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </ModalCore>
  );
}

export function FormShareModal({
  document,
  isOpen,
  onClose,
  onPublish,
  onUpdate,
}: {
  document: TSpreadsheetDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (access: TSpreadsheetFormPublication["access"]) => Promise<void>;
  onUpdate: (changes: Partial<Pick<TSpreadsheetFormPublication, "access" | "enabled">>) => Promise<void>;
}) {
  const [access, setAccess] = useState<TSpreadsheetFormPublication["access"]>("public");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const publication = document?.publication;
  useEffect(() => setAccess(publication?.access ?? "public"), [publication?.access, document?.id]);
  if (!document) return null;
  const mutate = async (operation: () => Promise<void>) => {
    setSubmitting(true);
    setError("");
    try {
      await operation();
    } catch (reason: any) {
      setError(reason?.response?.data?.error ?? "Unable to update sharing.");
    } finally {
      setSubmitting(false);
    }
  };
  const liveUrl = publication?.enabled ? `${window.location.origin}${publication.public_url}` : "";
  return (
    <ModalCore isOpen={isOpen} handleClose={onClose}>
      <div className="space-y-5 p-5">
        <div>
          <h2 className="text-18 font-medium text-primary">Share “{document.name}”</h2>
          <p className="mt-1 text-13 text-secondary">Publish this form and control who can submit responses.</p>
        </div>
        <label className="block text-13 font-medium text-secondary">
          Audience
          <select
            className="mt-2 h-9 w-full rounded-md border border-subtle bg-surface-1 px-3 text-primary"
            value={access}
            disabled={submitting}
            onChange={(event) => {
              const value = event.target.value as TSpreadsheetFormPublication["access"];
              setAccess(value);
              if (publication?.enabled) void mutate(() => onUpdate({ access: value }));
            }}
          >
            <option value="public">Anyone with the link</option>
            <option value="authenticated">Signed-in users</option>
          </select>
        </label>
        {liveUrl && (
          <div className="rounded-md border border-subtle bg-layer-1 p-3">
            <p className="text-11 font-medium text-tertiary uppercase">Live form link</p>
            <p className="mt-1 truncate text-13 text-primary">{liveUrl}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(liveUrl)}>
                Copy link
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.open(liveUrl, "_blank")}>
                Open
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-12 text-danger-primary">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-subtle px-5 py-4">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {publication?.enabled ? (
          <Button
            variant="error-fill"
            loading={submitting}
            onClick={() => void mutate(() => onUpdate({ enabled: false }))}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            loading={submitting}
            onClick={() => void mutate(() => (publication ? onUpdate({ enabled: true, access }) : onPublish(access)))}
          >
            Publish form
          </Button>
        )}
      </div>
    </ModalCore>
  );
}

const ResourceActions = ({
  document,
  canEdit,
  onAction,
}: {
  document: TSpreadsheetDocument;
  canEdit: boolean;
  onAction: (action: TResourceAction, document: TSpreadsheetDocument) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const ready = document.status === "ready";
  const degraded = document.status === "degraded";
  const items: TContextMenuItem[] = [
    ...(document.document_type === "form" && canEdit
      ? [
          {
            key: "share",
            title: "Share and publish",
            icon: ShareOutline,
            action: () => onAction("share", document),
            disabled: !ready,
          },
        ]
      : []),
    {
      key: degraded ? "retry" : "open",
      title: degraded ? "Retry" : "Open",
      icon: degraded ? RefreshOutline : NewTabOutline,
      action: () => onAction(degraded ? "retry" : "open", document),
      disabled: !ready && !degraded,
    },
    {
      key: "new-tab",
      title: "Open in new tab",
      icon: NewTabOutline,
      action: () => window.open(document.id, "_blank"),
      disabled: !ready,
    },
    {
      key: "copy-link",
      title: "Copy link",
      icon: LinkOutline,
      action: () => void navigator.clipboard.writeText(window.location.href.replace(/\/$/, "") + "/" + document.id),
    },
    ...(canEdit
      ? [
          {
            key: "rename",
            title: "Rename",
            icon: EditOutline,
            action: () => onAction("rename", document),
            disabled: document.status === "archiving",
          },
          {
            key: "duplicate",
            title: "Make a copy",
            icon: CopyOutline,
            action: () => onAction("duplicate", document),
            disabled: !ready,
          },
          {
            key: "archive",
            title: "Archive",
            icon: ArchiveOutline,
            action: () => onAction("archive", document),
            disabled: document.status === "archiving",
            className: "text-danger-primary",
          },
        ]
      : []),
  ];
  return (
    <div ref={ref}>
      <ContextMenu parentRef={ref} items={items} />
      <CustomMenu
        customButton={<IconButton variant="tertiary" size="sm" icon={MoreHorizontalOutline} />}
        placement="bottom-end"
        closeOnSelect
      >
        {items.map((item) => (
          <CustomMenu.MenuItem
            key={item.key}
            disabled={item.disabled}
            onClick={item.action}
            className={cn("flex items-center gap-2", item.className)}
          >
            {item.icon && <item.icon className="size-3" />}
            {item.title}
          </CustomMenu.MenuItem>
        ))}
      </CustomMenu>
    </div>
  );
};

export function ResourceTable({
  documents,
  canEdit,
  onOpen,
  onAction,
}: {
  documents: TSpreadsheetDocument[];
  canEdit: boolean;
  onOpen: (document: TSpreadsheetDocument) => void;
  onAction: (action: TResourceAction, document: TSpreadsheetDocument) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-subtle bg-surface-1">
      <Table>
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead className="w-[38%] pl-4">Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sharing</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const openable = document.status === "ready";
            return (
              <TableRow
                key={document.id}
                tabIndex={openable ? 0 : -1}
                className={cn("border-b border-subtle last:border-0", openable && "cursor-pointer hover:bg-surface-2")}
                onClick={() => openable && onOpen(document)}
                onKeyDown={(event) => {
                  if (openable && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onOpen(document);
                  }
                }}
              >
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded bg-layer-2 text-16">
                      {document.document_type === "form" ? "F" : "S"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">{document.name}</p>
                      {document.status === "degraded" && (
                        <p className="truncate text-11 text-danger-primary">
                          {document.last_error_code || "Unable to connect. Retry when ready."}
                        </p>
                      )}
                      <p className="mt-1 text-11 text-secondary md:hidden">
                        {sharingLabel(document)} · {calculateTimeAgoShort(document.updated_at)} ago
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-1 text-11 font-medium capitalize",
                      STATUS_STYLES[document.status]
                    )}
                  >
                    {document.status}
                  </span>
                </TableCell>
                <TableCell className="hidden text-secondary md:table-cell">{sharingLabel(document)}</TableCell>
                <TableCell
                  className="hidden text-secondary md:table-cell"
                  title={new Date(document.updated_at).toLocaleString()}
                >
                  {calculateTimeAgoShort(document.updated_at)} ago
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {document.created_by ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={document.created_by.display_name}
                        src={getFileURL(document.created_by.avatar_url)}
                        size="sm"
                      />
                      <span className="max-w-32 truncate text-secondary">{document.created_by.display_name}</span>
                    </div>
                  ) : (
                    <span className="text-secondary">Unknown</span>
                  )}
                </TableCell>
                <TableCell>
                  <ResourceActions document={document} canEdit={canEdit} onAction={onAction} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ArchiveResourceModal({
  document,
  isOpen,
  submitting,
  onClose,
  onSubmit,
}: {
  document: TSpreadsheetDocument | null;
  isOpen: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <AlertModalCore
      isOpen={isOpen}
      isSubmitting={submitting}
      handleClose={onClose}
      handleSubmit={onSubmit}
      title={`Archive ${document?.document_type ?? "resource"}?`}
      content={`“${document?.name ?? "This resource"}” will be removed from the active listing.`}
      primaryButtonText={{ default: "Archive", loading: "Archiving" }}
    />
  );
}
