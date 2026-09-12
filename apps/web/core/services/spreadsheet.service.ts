/** Copyright (c) 2023-present Plane Software, Inc. and contributors */
import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";
import type { IUserLite } from "@plane/types";

export type TSpreadsheetStatus = "provisioning" | "ready" | "degraded" | "archiving" | "archived";
export type TSpreadsheetDocumentType = "sheet" | "form";
export type TSpreadsheetFormPublication = {
  id: string;
  view_section_id: number;
  access: "public" | "authenticated";
  enabled: boolean;
  public_url: string;
  created_at: string;
  updated_at: string;
};
export type TSpreadsheetDocument = {
  id: string;
  name: string;
  document_type: TSpreadsheetDocumentType;
  status: TSpreadsheetStatus;
  last_error_code: string;
  created_at: string;
  updated_at: string;
  created_by: IUserLite | null;
  publication: TSpreadsheetFormPublication | null;
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

  list(
    workspaceSlug: string,
    projectId: string,
    documentType: TSpreadsheetDocumentType = "sheet"
  ): Promise<TSpreadsheetDocument[]> {
    return this.get(`${this.base(workspaceSlug, projectId)}/`, { params: { document_type: documentType } }).then(
      (response) => response.data
    );
  }

  create(
    workspaceSlug: string,
    projectId: string,
    name: string,
    documentType: TSpreadsheetDocumentType = "sheet"
  ): Promise<TSpreadsheetDocument> {
    return this.post(`${this.base(workspaceSlug, projectId)}/`, { name, document_type: documentType }).then(
      (response) => response.data
    );
  }

  rename(workspaceSlug: string, projectId: string, id: string, name: string): Promise<TSpreadsheetDocument> {
    return this.patch(`${this.base(workspaceSlug, projectId)}/${id}/`, { name }).then((response) => response.data);
  }

  archive(workspaceSlug: string, projectId: string, id: string): Promise<void> {
    return this.delete(`${this.base(workspaceSlug, projectId)}/${id}/`).then(() => undefined);
  }

  duplicate(workspaceSlug: string, projectId: string, id: string, name: string): Promise<TSpreadsheetDocument> {
    return this.post(`${this.base(workspaceSlug, projectId)}/${id}/duplicate/`, { name }).then(
      (response) => response.data
    );
  }

  listPublications(workspaceSlug: string, projectId: string, id: string): Promise<TSpreadsheetFormPublication[]> {
    return this.get(`${this.base(workspaceSlug, projectId)}/${id}/forms/`).then((response) => response.data);
  }

  publish(
    workspaceSlug: string,
    projectId: string,
    id: string,
    access: TSpreadsheetFormPublication["access"]
  ): Promise<TSpreadsheetFormPublication> {
    return this.post(`${this.base(workspaceSlug, projectId)}/${id}/forms/`, { access }).then(
      (response) => response.data
    );
  }

  updatePublication(
    workspaceSlug: string,
    projectId: string,
    id: string,
    publicationId: string,
    changes: Partial<Pick<TSpreadsheetFormPublication, "access" | "enabled">>
  ): Promise<TSpreadsheetFormPublication> {
    return this.patch(`${this.base(workspaceSlug, projectId)}/${id}/forms/${publicationId}/`, changes).then(
      (response) => response.data
    );
  }

  deletePublication(workspaceSlug: string, projectId: string, id: string, publicationId: string): Promise<void> {
    return this.delete(`${this.base(workspaceSlug, projectId)}/${id}/forms/${publicationId}/`).then(() => undefined);
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
