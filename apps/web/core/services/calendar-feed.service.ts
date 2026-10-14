import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";

export type TCalendarFeed = {
  url: string;
  enabled: boolean;
  expires_at: string | null;
  token_rotated_at: string | null;
};

export class CalendarFeedService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  private path(workspaceSlug: string, projectId: string) {
    return `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/calendar-feed/`;
  }

  read(workspaceSlug: string, projectId: string): Promise<TCalendarFeed | null> {
    return this.get(this.path(workspaceSlug, projectId)).then((response) => response.data);
  }

  create(workspaceSlug: string, projectId: string): Promise<TCalendarFeed> {
    return this.post(this.path(workspaceSlug, projectId)).then((response) => response.data);
  }

  setEnabled(workspaceSlug: string, projectId: string, enabled: boolean): Promise<TCalendarFeed> {
    return this.patch(this.path(workspaceSlug, projectId), { enabled }).then((response) => response.data);
  }

  rotate(workspaceSlug: string, projectId: string): Promise<TCalendarFeed> {
    return this.post(`${this.path(workspaceSlug, projectId)}rotate/`).then((response) => response.data);
  }

  async revoke(workspaceSlug: string, projectId: string): Promise<void> {
    await this.delete(this.path(workspaceSlug, projectId));
  }
}
