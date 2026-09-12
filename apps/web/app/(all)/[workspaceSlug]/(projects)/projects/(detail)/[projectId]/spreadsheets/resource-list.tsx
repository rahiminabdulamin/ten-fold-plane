import { useEffect, useRef, useState } from "react";
import {
  ClipboardPenLine,
  Table2,
  CircleCheck,
  LoaderCircle,
  CircleAlert,
  Archive,
  Users,
  Globe,
  CalendarDays,
  UserRound,
} from "lucide-react";
import { Input, InputGroup } from "@makeplane/propel/components/input";
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
export const RESOURCE_STATUS_LABELS: Record<TSpreadsheetStatus, string> = {
  ready: "Ready",
  provisioning: "Preparing",
  degraded: "Unavailable",
  archiving: "Archiving",
  archived: "Archived",
};

const STATUS_STYLES: Record<TSpreadsheetStatus, string> = {
  ready: "text-success-primary",
  provisioning: "text-tertiary",
  degraded: "text-danger-primary",
  archiving: "text-tertiary",
  archived: "text-tertiary",
};
const STATUS_ICONS = {
  ready: CircleCheck,
  provisioning: LoaderCircle,
  degraded: CircleAlert,
  archiving: Archive,
  archived: Archive,
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
  requireChange = false,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  title: string;
  initialName: string;
  submitLabel: string;
  requireChange?: boolean;
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
            <InputGroup size="lg">
              <Input
                size="lg"
                id="resource-name"
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </InputGroup>
            {error && <p className="mt-1 text-11 text-danger-primary">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={!name.trim() || (requireChange && name.trim() === initialName.trim())}
          >
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
        <div className="space-y-2 text-13 text-secondary">
          <p>Audience</p>
          <CustomMenu
            label={access === "public" ? "Anyone with the link" : "Signed-in users"}
            disabled={submitting}
            placement="bottom-start"
            closeOnSelect
          >
            {(["public", "authenticated"] as const).map((value) => (
              <CustomMenu.MenuItem
                key={value}
                onClick={() => {
                  setAccess(value);
                  if (publication?.enabled) void mutate(() => onUpdate({ access: value }));
                }}
              >
                {value === "public" ? "Anyone with the link" : "Signed-in users"}
              </CustomMenu.MenuItem>
            ))}
          </CustomMenu>
        </div>
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
      action: () =>
        window.open(
          window.location.origin + window.location.pathname.replace(/\/$/, "") + "/" + document.id,
          "_blank",
          "noopener,noreferrer"
        ),
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
        ariaLabel={`Actions for ${document.name}`}
        customButton={<IconButton variant="tertiary" size="sm" icon={MoreHorizontalOutline} />}
        buttonClassName="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 aria-expanded:opacity-100"
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
    <div className="bg-surface-1">
      <Table className="table-fixed [&_td]:h-11 [&_td]:border-r [&_td]:border-subtle [&_td]:px-5 [&_td]:py-0 [&_th]:h-11 [&_th]:border-r [&_th]:border-subtle [&_th]:px-5 [&_th]:text-secondary">
        <colgroup>
          <col className="w-[55%] md:w-[38%]" />
          <col />
          <col className="hidden md:table-column" />
          <col className="hidden md:table-column" />
          <col className="hidden md:table-column" />
          <col className="w-12" />
        </colgroup>
        <TableHeader className="sticky top-0 z-10 hidden border-t-0 md:table-header-group">
          <TableRow>
            <TableHead className="w-[38%] !px-page-x">
              {documents[0]?.document_type === "form" ? "Forms" : "Sheets"}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sharing</TableHead>
            <TableHead>Modified</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead className="w-12 !border-r-0 !px-2">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const openable = document.status === "ready";
            const ResourceIcon = document.document_type === "form" ? ClipboardPenLine : Table2;
            const StatusIcon = STATUS_ICONS[document.status];
            const SharingIcon =
              document.publication?.enabled && document.publication.access === "public" ? Globe : Users;
            const creator = document.created_by;
            const creatorName =
              creator?.display_name || [creator?.first_name, creator?.last_name].filter(Boolean).join(" ");
            return (
              <TableRow
                key={document.id}
                tabIndex={openable ? 0 : -1}
                className={cn(
                  "group focus-visible:outline-accent-primary border-b border-subtle focus-visible:outline",
                  openable && "cursor-pointer hover:bg-layer-1"
                )}
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest("button, a, [role=menuitem]") && openable)
                    onOpen(document);
                }}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    openable &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    onOpen(document);
                  }
                }}
              >
                <TableCell className="!px-page-x">
                  <div className="flex items-center gap-3">
                    <ResourceIcon className="size-4 shrink-0 text-tertiary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-13 text-primary" title={document.name}>
                        {document.name}
                      </p>
                      <p className="mt-1 text-11 text-secondary md:hidden">
                        {sharingLabel(document)} · {calculateTimeAgoShort(document.updated_at)} ago
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 text-13 text-primary">
                    <StatusIcon
                      className={cn("size-3.5 shrink-0", STATUS_STYLES[document.status])}
                      aria-hidden="true"
                    />
                    <span
                      title={
                        document.status === "degraded"
                          ? "Unable to connect. Use Retry from the actions menu."
                          : undefined
                      }
                    >
                      {RESOURCE_STATUS_LABELS[document.status]}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="hidden text-primary md:table-cell">
                  <span className="flex items-center gap-2">
                    <SharingIcon className="size-3.5 shrink-0 text-tertiary" aria-hidden="true" />
                    <span className="truncate">{sharingLabel(document)}</span>
                  </span>
                </TableCell>
                <TableCell
                  className="hidden text-secondary md:table-cell"
                  title={new Date(document.updated_at).toLocaleString()}
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-3.5 shrink-0 text-tertiary" aria-hidden="true" />
                    <span className="truncate">{calculateTimeAgoShort(document.updated_at)} ago</span>
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {creatorName ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={creatorName} src={getFileURL(creator?.avatar_url ?? "")} size="sm" />
                      <span className="max-w-32 truncate text-secondary">{creatorName}</span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 text-tertiary">
                      <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                      Unknown
                    </span>
                  )}
                </TableCell>
                <TableCell className="!border-r-0 !px-2">
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
