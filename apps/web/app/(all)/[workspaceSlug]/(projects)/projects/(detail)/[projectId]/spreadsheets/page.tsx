import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@plane/propel/button";
import {
  SpreadsheetService,
  type TSpreadsheetDocument,
  type TSpreadsheetDocumentType,
} from "@/services/spreadsheet.service";
import type { Route } from "./+types/page";

const service = new SpreadsheetService();

type SpreadsheetDocumentsPageProps = {
  params: Route.ComponentProps["params"];
  documentType?: TSpreadsheetDocumentType;
};

export function SpreadsheetDocumentsPage({ params, documentType = "sheet" }: SpreadsheetDocumentsPageProps) {
  const { workspaceSlug, projectId } = params;
  const isForm = documentType === "form";
  const title = isForm ? "Forms" : "Sheets";
  const itemName = isForm ? "form" : "sheet";
  const route = isForm ? "forms" : "spreadsheets";
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<TSpreadsheetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasProvisioningDocuments = documents.some((document) => document.status === "provisioning");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      service
        .list(workspaceSlug, projectId, documentType)
        .then((items) => {
          if (!cancelled) setDocuments(items);
          return items;
        })
        .catch(() => {
          if (!cancelled) setError(`Unable to load ${title.toLowerCase()}.`);
          return [];
        })
        .finally(() => !cancelled && setLoading(false));
    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, projectId, documentType, title]);

  useEffect(() => {
    if (!hasProvisioningDocuments) return;
    const refresh = window.setInterval(() => {
      void service
        .list(workspaceSlug, projectId, documentType)
        .then(setDocuments)
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(refresh);
  }, [hasProvisioningDocuments, projectId, workspaceSlug, documentType]);

  const create = async () => {
    const name = window.prompt(`${isForm ? "Form" : "Sheet"} name`, `Untitled ${itemName}`)?.trim();
    if (!name) return;
    try {
      const document = await service.create(workspaceSlug, projectId, name, documentType);
      setDocuments((current) => [...current, document]);
    } catch (reason: any) {
      const code = reason?.response?.data?.error;
      setError(code ? `Unable to create the ${itemName} (${code}).` : `Unable to create the ${itemName}.`);
    }
  };

  if (loading) return <div className="p-6 text-secondary">Loading {title.toLowerCase()}…</div>;
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Button onClick={create}>New {itemName}</Button>
      </div>
      {error && <p className="text-danger-primary">{error}</p>}
      {!documents.length ? (
        <div className="rounded-lg border border-dashed border-subtle p-10 text-center text-secondary">
          {isForm
            ? "Create a form to collect structured responses."
            : "Create a spreadsheet for structured data and formulas."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <button
              key={document.id}
              type="button"
              className="rounded-lg border border-subtle bg-surface-1 p-4 text-left hover:bg-surface-2"
              onClick={() => navigate(`/${workspaceSlug}/projects/${projectId}/${route}/${document.id}`)}
            >
              <div className="font-medium text-primary">{document.name}</div>
              <div className="text-xs mt-2 text-secondary capitalize">{document.status}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpreadsheetsPage({ params }: Route.ComponentProps) {
  return <SpreadsheetDocumentsPage params={params} />;
}
