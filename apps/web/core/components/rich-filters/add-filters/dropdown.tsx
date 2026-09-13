/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState } from "react";
import { observer } from "mobx-react";
import { SearchOutline } from "@makeplane/propel/icons";
// plane imports
import { Popover } from "@plane/propel/popover";
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import type { IFilterInstance } from "@plane/shared-state";
import type { TExternalFilter, TFilterProperty, TSupportedOperators } from "@plane/types";
import { cn, getOperatorForPayload } from "@plane/utils";

export type TAddFilterDropdownProps<P extends TFilterProperty, E extends TExternalFilter> = {
  customButton: React.ReactNode;
  buttonConfig?: {
    className?: string;
    defaultOpen?: boolean;
    isDisabled?: boolean;
  };
  filter: IFilterInstance<P, E>;
  handleFilterSelect: (property: P, operator: TSupportedOperators, isNegation: boolean) => void;
};

export const AddFilterDropdown = observer(function AddFilterDropdown<
  P extends TFilterProperty,
  E extends TExternalFilter,
>(props: TAddFilterDropdownProps<P, E>) {
  const { filter, customButton, buttonConfig } = props;
  const { className, defaultOpen = false, isDisabled = false } = buttonConfig || {};
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");

  // Transform available filter configs to CustomSearchSelect options format
  const filterOptions = filter.configManager.allAvailableConfigs.map((config) => ({
    value: config.id,
    content: (
      <div className="flex items-center justify-between gap-2 text-secondary transition-all duration-200 ease-in-out">
        <div className="flex items-center gap-2">
          {config.icon && (
            <config.icon className="size-4 text-tertiary transition-transform duration-200 ease-in-out" />
          )}
          <span>{config.label}</span>
        </div>
        {config.rightContent}
      </div>
    ),
    query: config.label.toLowerCase(),
    disabled: false,
  }));

  // If all filters are applied, show disabled options
  const allFiltersApplied = filterOptions.length === 0;
  const displayOptions = allFiltersApplied
    ? [
        {
          value: "all_filters_applied",
          content: <div className="text-placeholder italic">All filters applied</div>,
          query: "all filters applied",
          disabled: true,
        },
      ]
    : filterOptions;
  const filteredOptions = displayOptions.filter((option) => option.query.includes(query.toLowerCase()));

  const handleFilterSelect = (property: P) => {
    const config = filter.configManager.getConfigByProperty(property);
    if (config?.firstOperator) {
      const { operator, isNegation } = getOperatorForPayload(config.firstOperator);
      props.handleFilterSelect(property, operator, isNegation);
    } else {
      setToast({
        title: "Filter configuration error",
        message: "This filter is not properly configured and cannot be applied",
        type: TOAST_TYPE.ERROR,
      });
    }
  };

  if (isDisabled) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Button
        render={
          <button type="button" className={cn("flex items-center justify-between gap-1 text-11", className)}>
            {customButton}
          </button>
        }
      />
      <Popover.Panel
        placement="bottom-start"
        sideOffset={4}
        positionerClassName="z-[9999]"
        className="z-[9999] w-56 rounded-md border-[0.5px] border-subtle-1 bg-surface-1 py-2.5 text-11 shadow-raised-200"
      >
        <div className="mx-2 flex items-center gap-1.5 rounded-sm border border-subtle px-2">
          <SearchOutline className="h-3.5 w-3.5 text-placeholder" />
          <input
            className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
          />
        </div>
        <div className="vertical-scrollbar mt-2 scrollbar-xs max-h-96 space-y-1 overflow-y-auto px-2">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              className={cn(
                "flex w-full items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 text-left select-none hover:bg-layer-transparent-hover",
                { "cursor-not-allowed text-placeholder opacity-60 hover:bg-transparent": option.disabled }
              )}
              onClick={() => {
                if (option.disabled) return;
                handleFilterSelect(option.value as P);
                setIsOpen(false);
              }}
            >
              <span className="flex-grow truncate">{option.content}</span>
            </button>
          ))}
        </div>
      </Popover.Panel>
    </Popover>
  );
});
