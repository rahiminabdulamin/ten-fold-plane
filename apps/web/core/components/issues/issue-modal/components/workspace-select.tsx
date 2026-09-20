/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
import { useWorkspace } from "@/hooks/store/use-workspace";

type Props = {
  value: string;
  onChange: (workspaceSlug: string) => void;
  disabled?: boolean;
};

export const IssueWorkspaceSelect = observer(function IssueWorkspaceSelect({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const { workspaces } = useWorkspace();

  return (
    <div className="h-7 min-w-0">
      <select
        aria-label={t("workspace")}
        className="focus:border-accent-primary h-full max-w-56 min-w-0 cursor-pointer appearance-none truncate rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 text-11 leading-4 text-primary transition-colors outline-none hover:bg-layer-1"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.values(workspaces).map((workspace) => (
          <option key={workspace.id} value={workspace.slug}>
            {workspace.name.replace(
              /^\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u200D\p{Extended_Pictographic})*\s*/u,
              ""
            )}
          </option>
        ))}
      </select>
    </div>
  );
});
