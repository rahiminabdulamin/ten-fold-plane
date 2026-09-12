import { useEffect, useRef, useState } from "react";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { isSpreadsheetProvisioning, SpreadsheetService } from "@/services/spreadsheet.service";
import type { Route } from "./+types/page";

const service = new SpreadsheetService();

export default function SpreadsheetEditorPage({ params }: { params: Route.ComponentProps["params"] }) {
  const { workspaceSlug, projectId, spreadsheetId } = params;
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const launch = () => {
      service
        .launch(workspaceSlug, projectId, spreadsheetId)
        .then((result) => {
          if (cancelled) return undefined;
          setEditorReady(false);
          setUrl(result.url);
          return undefined;
        })
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
      if (readyTimer.current) clearTimeout(readyTimer.current);
    };
  }, [workspaceSlug, projectId, spreadsheetId]);

  const waitForEditor = () => {
    const check = () => {
      try {
        if (iframeRef.current?.contentDocument?.querySelector('[data-test-id="gristdoc"]')) {
          setEditorReady(true);
          return;
        }
      } catch {
        // The iframe remains covered by the Ten-Fold loader until its editor can be inspected.
      }
      readyTimer.current = setTimeout(check, 100);
    };
    check();
  };

  if (error) return <div className="flex h-full items-center justify-center text-secondary">{error}</div>;
  if (!url) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <LogoSpinner />
      </div>
    );
  }
  return (
    <div className="relative h-full">
      {!editorReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas">
          <LogoSpinner />
        </div>
      )}
      {/* Grist needs scripts and same-origin storage; navigation remains constrained by the proxy. */}
      {/* eslint-disable react/iframe-missing-sandbox */}
      <iframe
        ref={iframeRef}
        title="Spreadsheet editor"
        src={url}
        className="size-full border-0"
        onLoad={waitForEditor}
        allow="clipboard-read; clipboard-write"
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
      />
      {/* eslint-enable react/iframe-missing-sandbox */}
    </div>
  );
}
