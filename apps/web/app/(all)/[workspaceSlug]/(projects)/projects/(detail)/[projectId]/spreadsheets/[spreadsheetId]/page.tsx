import { useEffect, useState } from "react";
import { isSpreadsheetProvisioning, SpreadsheetService } from "@/services/spreadsheet.service";
import type { Route } from "./+types/page";

const service = new SpreadsheetService();

export default function SpreadsheetEditorPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId, spreadsheetId } = params;
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const launch = () => {
      service
        .launch(workspaceSlug, projectId, spreadsheetId)
        .then((result) => !cancelled && setUrl(result.url))
        .catch((reason) => {
          if (cancelled) return;
          if (isSpreadsheetProvisioning(reason)) {
            retryTimer = setTimeout(launch, 2000);
            return;
          }
          const code = reason?.response?.data?.error;
          setError(`The spreadsheet service is unavailable${code ? ` (${code})` : ""}.`);
        });
    };
    launch();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [workspaceSlug, projectId, spreadsheetId]);

  if (error) return <div className="flex h-full items-center justify-center text-secondary">{error}</div>;
  if (!url) return <div className="flex h-full items-center justify-center text-secondary">Preparing spreadsheet…</div>;
  return (
    <>
      {/* Grist needs scripts and same-origin storage; navigation remains constrained by the proxy. */}
      {/* eslint-disable react/iframe-missing-sandbox */}
      <iframe
        title="Spreadsheet editor"
        src={url}
        className="size-full border-0"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
      />
      {/* eslint-enable react/iframe-missing-sandbox */}
    </>
  );
}
