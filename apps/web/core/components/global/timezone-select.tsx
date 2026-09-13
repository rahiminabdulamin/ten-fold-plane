/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { Combobox } from "@plane/propel/combobox";
import { cn } from "@plane/utils";
// hooks
import useTimezone from "@/hooks/use-timezone";

type TTimezoneSelect = {
  value: string | undefined;
  onChange: (value: string) => void;
  error?: boolean;
  label?: string;
  buttonClassName?: string;
  className?: string;
  optionsClassName?: string;
  disabled?: boolean;
};

export const TimezoneSelect = observer(function TimezoneSelect(props: TTimezoneSelect) {
  // props
  const {
    value,
    onChange,
    error = false,
    label = "Select a timezone",
    buttonClassName = "",
    className = "",
    optionsClassName = "",
    disabled = false,
  } = props;
  // hooks
  const { disabled: isDisabled, timezones, selectedValue } = useTimezone();

  return (
    <div>
      <Combobox
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as string)}
        disabled={isDisabled || disabled}
      >
        <Combobox.Button
          className={cn(
            "flex w-full items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-3 py-2 text-13",
            buttonClassName,
            { "border-danger-strong": error }
          )}
        >
          {value && selectedValue ? selectedValue(value) : label}
        </Combobox.Button>
        <Combobox.Options
          showSearch
          searchPlaceholder="Search"
          maxHeight="md"
          className={cn("w-72", optionsClassName)}
          positionerClassName={className}
        >
          {(isDisabled || disabled ? [] : timezones).map((timezone) => (
            <Combobox.Option key={timezone.value} value={timezone.value}>
              {timezone.content}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox>
    </div>
  );
});
