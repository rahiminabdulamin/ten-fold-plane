import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@plane/propel/button";
import { Input } from "@plane/propel/input";
import { CalendarFeedService } from "@/services/calendar-feed.service";
import type { TCalendarFeed } from "@/services/calendar-feed.service";

const service = new CalendarFeedService();
type Props = { workspaceSlug: string; projectId: string };
type Confirmation = "rotate" | "revoke" | null;

export function CalendarSubscription({ workspaceSlug, projectId }: Props) {
  const headingId = useId();
  const inputId = useId();
  const scope = `${workspaceSlug}/${projectId}`;
  const [result, setResult] = useState<{ scope: string; feed: TCalendarFeed | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [retry, setRetry] = useState(0);
  const epoch = useRef(0);
  const inFlight = useRef(false);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const loaded = result?.scope === scope;
  const feed = loaded ? result.feed : null;

  useEffect(() => {
    const generation = epoch;
    const id = ++generation.current;
    setResult(null);
    setError(null);
    setNotice(null);
    setConfirmation(null);
    setBusy(false);
    inFlight.current = false;
    service.read(workspaceSlug, projectId).then(
      (value) => {
        if (epoch.current === id) setResult({ scope, feed: value });
        return undefined;
      },
      () => {
        if (epoch.current === id) setError("Could not load the calendar subscription. Try again.");
      }
    );
    return () => {
      generation.current++;
    };
  }, [workspaceSlug, projectId, scope, retry]);

  async function mutate(action: () => Promise<TCalendarFeed | null>) {
    if (inFlight.current) return;
    inFlight.current = true;
    const id = epoch.current;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const value = await action();
      if (epoch.current === id && currentScope.current === scope) {
        setResult({ scope, feed: value });
        setConfirmation(null);
      }
    } catch {
      if (epoch.current === id && currentScope.current === scope) {
        // A lost response may still have committed rotation or revocation. Reload
        // before retrying, so the user never copies a potentially stale secret.
        setResult(null);
        setError("Could not update the subscription. Reload its status before trying again.");
      }
    } finally {
      if (epoch.current === id && currentScope.current === scope) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  async function copyUrl() {
    if (!feed) return;
    const id = epoch.current;
    try {
      await navigator.clipboard.writeText(feed.url);
      if (epoch.current === id) setNotice("Subscription URL copied.");
    } catch {
      if (epoch.current === id) setNotice("Clipboard unavailable. Select the URL and copy it manually.");
    }
  }

  return (
    <section aria-labelledby={headingId} className="mt-10 flex flex-col gap-4 border-t border-subtle pt-6">
      <div className="flex flex-col gap-1.5">
        <h3 id={headingId} className="text-body-lg-medium text-primary">
          Calendar subscription
        </h3>
        <p className="text-body-sm-regular text-secondary">
          Subscribe to this project in Outlook, Google Calendar, or Apple Calendar. Issues with a due date appear as
          all-day events.
        </p>
        <p className="text-caption-md-regular text-secondary">
          Anyone with the URL can read issue titles and descriptions. Keep it private.
        </p>
      </div>
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-body-sm-regular text-danger-primary">
          <p>{error}</p>
          {!loaded && (
            <Button variant="secondary" disabled={busy} onClick={() => setRetry((value) => value + 1)}>
              Reload status
            </Button>
          )}
        </div>
      )}
      {!loaded && !error && (
        <div
          role="status"
          aria-label="Loading calendar subscription"
          className="h-10 animate-pulse rounded-md bg-layer-2"
        />
      )}
      {loaded && !feed && (
        <div>
          <Button loading={busy} onClick={() => mutate(() => service.create(workspaceSlug, projectId))}>
            Enable subscription
          </Button>
        </div>
      )}
      {feed && (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-body-sm-medium text-primary">
              Subscription URL
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                id={inputId}
                aria-label="Subscription URL"
                value={feed.url}
                readOnly
                className="min-w-0 flex-1 focus-visible:ring-2 focus-visible:ring-accent-strong"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button variant="secondary" disabled={busy} onClick={copyUrl}>
                Copy URL
              </Button>
            </div>
            <p className="text-caption-md-regular text-secondary">
              {feed.enabled ? "Subscription enabled." : "Subscription disabled. This URL is currently unavailable."}
              {feed.expires_at && ` Expires ${new Date(feed.expires_at).toLocaleString()}.`}
            </p>
            <p className="text-caption-md-regular text-secondary">
              Paste this URL into your calendar app’s “Subscribe by URL” option. Your calendar app controls how often it
              refreshes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy || confirmation !== null}
              onClick={() => mutate(() => service.setEnabled(workspaceSlug, projectId, !feed.enabled))}
            >
              {feed.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="secondary"
              disabled={busy || confirmation !== null}
              onClick={() => setConfirmation("rotate")}
            >
              Rotate URL
            </Button>
            <Button
              variant="error-outline"
              disabled={busy || confirmation !== null}
              onClick={() => setConfirmation("revoke")}
            >
              Revoke subscription
            </Button>
          </div>
          {confirmation && (
            <div className="flex flex-col gap-3 rounded-lg border border-subtle bg-layer-2 p-4">
              <p className="text-body-sm-regular text-primary">
                {confirmation === "rotate"
                  ? "Replace the subscription URL? Existing subscriptions will stop updating until they use the new URL."
                  : "Revoke this subscription? The URL will stop working for everyone using it."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="error-outline"
                  loading={busy}
                  onClick={() =>
                    mutate(async () => {
                      if (confirmation === "rotate") return service.rotate(workspaceSlug, projectId);
                      await service.revoke(workspaceSlug, projectId);
                      return null;
                    })
                  }
                >
                  {confirmation === "rotate" ? "Confirm rotation" : "Confirm revocation"}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <p role="status" aria-live="polite" className="text-caption-md-regular text-secondary">
        {notice}
      </p>
    </section>
  );
}
