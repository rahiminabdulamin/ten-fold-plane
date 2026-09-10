/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { getAssetIdFromUrl, checkURLValidity } from "@plane/utils";
// plane ui
// helpers
// hooks
import useKeypress from "@/hooks/use-keypress";
// plane web components
import { CreateProjectForm } from "@/components/projects/create/root";
// plane web types
import type { TProject } from "@plane/types";
// services
import { FileService } from "@/services/file.service";
const fileService = new FileService();

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setToFavorite?: boolean;
  workspaceSlug: string;
  data?: Partial<TProject>;
  templateId?: string;
};

export function CreateProjectModal(props: Props) {
  const { isOpen, onClose, setToFavorite = false, workspaceSlug, data, templateId } = props;

  const handleCoverImageStatusUpdate = async (projectId: string, coverImage: string) => {
    if (!checkURLValidity(coverImage)) {
      await fileService.updateBulkProjectAssetsUploadStatus(workspaceSlug, projectId, projectId, {
        asset_ids: [getAssetIdFromUrl(coverImage)],
      });
    }
  };

  useKeypress("Escape", () => {
    if (isOpen) onClose();
  });

  return (
    <ModalCore isOpen={isOpen} position={EModalPosition.TOP} width={EModalWidth.XXXXL}>
      <CreateProjectForm
        setToFavorite={setToFavorite}
        workspaceSlug={workspaceSlug}
        onClose={onClose}
        updateCoverImageStatus={handleCoverImageStatusUpdate}
        data={data}
        templateId={templateId}
      />
    </ModalCore>
  );
}
