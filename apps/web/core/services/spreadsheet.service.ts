/** Copyright (c) 2023-present Plane Software, Inc. and contributors */
import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";

export type TSpreadsheetStatus = "provisioning" | "ready" | "degraded" | "archiving" | "archived";
export type TSpreadsheetDocument = {
  id: string;
  name: string;
  status: TSpreadsheetStatus;
  last_error_code: string;
  created_at: string;
  updated_at: string;
};

export const isSpreadsheetProvisioning = (reason: { response?: { data?: { status?: string } } }) =>
  reason.response?.data?.status === "provisioning";

export class SpreadsheetService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  private base(workspaceSlug: string, projectId: string) {
    return `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/spreadsheets`;
  }

  list(workspaceSlug: string, projectId: string): Promise<TSpreadsheetDocument[]> {
    return this.get(`${this.base(workspaceSlug, projectId)}/`).then((response) => response.data);
  }

  create(workspaceSlug: string, projectId: string, name: string): Promise<TSpreadsheetDocument> {
    return this.post(`${this.base(workspaceSlug, projectId)}/`, { name }).then((response) => response.data);
  }

  rename(workspaceSlug: string, projectId: string, id: string, name: string): Promise<TSpreadsheetDocument> {
    return this.patch(`${this.base(workspaceSlug, projectId)}/${id}/`, { name }).then((response) => response.data);
  }

  archive(workspaceSlug: string, projectId: string, id: string): Promise<void> {
    return this.delete(`${this.base(workspaceSlug, projectId)}/${id}/`).then(() => undefined);
  }

  launch(workspaceSlug: string, projectId: string, id: string): Promise<{ url: string }> {
    return this.post(`${this.base(workspaceSlug, projectId)}/${id}/launch/`).then((response) => response.data);
  }

  agent(
    workspaceSlug: string,
    projectId: string,
    id: string,
    action: "query" | "preview" | "execute",
    data: Record<string, unknown>
  ) {
    return this.post(`${this.base(workspaceSlug, projectId)}/${id}/agent/${action}/`, data).then(
      (response) => response.data
    );
  }
}
