/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Controller, useFormContext } from "react-hook-form";
// plane imports
import { ETabIndices } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { CloseOutline } from "@makeplane/propel/icons";
// plane types
import type { IProject } from "@plane/types";
// plane ui
import { getTabIndex } from "@plane/utils";
// components
import { CoverImage } from "@/components/common/cover-image";
import { ImagePickerPopover } from "@/components/core/image-picker-popover";

type Props = {
  handleClose: () => void;
  isMobile?: boolean;
  handleFormOnChange?: () => void;
  isClosable?: boolean;
  handleTemplateSelect?: () => void;
  showActionButtons?: boolean;
};

function ProjectCreateHeader(props: Props) {
  const { handleClose, isMobile = false, handleFormOnChange, isClosable = true } = props;
  const { watch, control } = useFormContext<IProject>();
  const { t } = useTranslation();
  // derived values
  const coverImage = watch("cover_image_url");

  const { getIndex } = getTabIndex(ETabIndices.PROJECT_CREATE, isMobile);

  return (
    <div className="group relative h-12 w-full rounded-lg">
      <CoverImage src={coverImage} alt={t("project_cover_image_alt")} className="hidden" />
      {isClosable && (
        <div className="absolute top-2 right-2 p-2">
          <button type="button" onClick={handleClose} tabIndex={getIndex("close")}>
            <CloseOutline className="h-5 w-5 text-primary" />
          </button>
        </div>
      )}
      <div className="hidden">
        <Controller
          name="cover_image_url"
          control={control}
          render={({ field: { value, onChange } }) => (
            <ImagePickerPopover
              label={t("change_cover")}
              onChange={(data) => {
                onChange(data);
                handleFormOnChange?.();
              }}
              control={control}
              value={value ?? null}
              tabIndex={getIndex("cover_image")}
            />
          )}
        />
      </div>
    </div>
  );
}

export default ProjectCreateHeader;
