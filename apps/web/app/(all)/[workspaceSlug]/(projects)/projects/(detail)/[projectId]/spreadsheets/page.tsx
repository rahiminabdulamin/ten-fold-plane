import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@plane/propel/button";
import { SpreadsheetService, type TSpreadsheetDocument } from "@/services/spreadsheet.service";
import type { Route } from "./+types/page";

const service = new SpreadsheetService();

export default function SpreadsheetsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<TSpreadsheetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasProvisioningDocuments = documents.some((document) => document.status === "provisioning");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      service
        .list(workspaceSlug, projectId)
        .then((items) => {
          if (!cancelled) setDocuments(items);
          return items;
        })
        .catch(() => {
          if (!cancelled) setError("Unable to load spreadsheets.");
          return [];
        })
        .finally(() => !cancelled && setLoading(false));
    void load();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, projectId]);

  useEffect(() => {
    if (!hasProvisioningDocuments) return;
    const refresh = window.setInterval(() => {
      void service
        .list(workspaceSlug, projectId)
        .then(setDocuments)
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(refresh);
  }, [hasProvisioningDocuments, projectId, workspaceSlug]);

  const create = async () => {
    const name = window.prompt("Spreadsheet name", "Untitled spreadsheet")?.trim();
    if (!name) return;
    const document = await service.create(workspaceSlug, projectId, name);
    setDocuments((current) => [...current, document]);
  };

  if (loading) return <div className="p-6 text-secondary">Loading spreadsheets…</div>;
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Spreadsheets</h1>
        <Button onClick={create}>New spreadsheet</Button>
      </div>
      {error && <p className="text-danger-primary">{error}</p>}
      {!documents.length ? (
        <div className="rounded-lg border border-dashed border-subtle p-10 text-center text-secondary">
          Create a spreadsheet for structured data, formulas, and forms.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <button
              key={document.id}
              type="button"
              className="rounded-lg border border-subtle bg-surface-1 p-4 text-left hover:bg-surface-2"
              onClick={() => navigate(`/${workspaceSlug}/projects/${projectId}/spreadsheets/${document.id}`)}
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
