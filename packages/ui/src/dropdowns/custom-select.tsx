/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Combobox } from "@headlessui/react";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
import { ChevronDownOutline, TickOutline } from "@makeplane/propel/icons";
// helpers
import { cn } from "../utils";
// types
import type { ICustomSelectItemProps, ICustomSelectProps } from "./helper";

function CustomSelect(props: ICustomSelectProps) {
  const {
    customButtonClassName = "",
    buttonClassName = "",
    placement,
    children,
    className = "",
    customButton,
    disabled = false,
    input = false,
    label,
    maxHeight = "md",
    noChevron = false,
    onChange,
    optionsClassName = "",
    value,
    tabIndex,
  } = props;
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "bottom-start",
    strategy: "fixed",
  });

  return (
    <Combobox
      as="div"
      tabIndex={tabIndex}
      value={value}
      onChange={onChange}
      className={cn("relative flex-shrink-0 text-left", className)}
      disabled={disabled}
    >
      {({ open }) => (
        <>
          {customButton ? (
            <Combobox.Button
              ref={setReferenceElement}
              type="button"
              className={`flex items-center justify-between gap-1 rounded text-11 ${
                disabled ? "cursor-not-allowed text-secondary" : "cursor-pointer hover:bg-layer-transparent-hover"
              } ${customButtonClassName}`}
            >
              {customButton}
            </Combobox.Button>
          ) : (
            <Combobox.Button
              ref={setReferenceElement}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-1 rounded border border-strong",
                {
                  "px-3 py-2 text-13": input,
                  "px-2 py-1 text-11": !input,
                  "cursor-not-allowed text-secondary": disabled,
                  "cursor-pointer hover:bg-layer-transparent-hover": !disabled,
                },
                buttonClassName
              )}
            >
              {label}
              {!noChevron && !disabled && <ChevronDownOutline className="h-3 w-3" aria-hidden="true" />}
            </Combobox.Button>
          )}
          {open &&
            createPortal(
              <Combobox.Options
                as="ul"
                data-prevent-outside-click
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
                className={cn(
                  "z-30 my-1 min-w-48 space-y-1 overflow-y-scroll rounded-md border-[0.5px] border-subtle-1 bg-surface-1 px-2 py-2.5 text-11 whitespace-nowrap focus:outline-none",
                  {
                    "max-h-60": maxHeight === "lg",
                    "max-h-48": maxHeight === "md",
                    "max-h-36": maxHeight === "rg",
                    "max-h-28": maxHeight === "sm",
                  },
                  optionsClassName
                )}
              >
                {children}
              </Combobox.Options>,
              document.body
            )}
        </>
      )}
    </Combobox>
  );
}

function Option(props: ICustomSelectItemProps) {
  const { children, value, className } = props;

  return (
    <Combobox.Option
      as="li"
      value={value}
      className={({ active }) =>
        cn(
          "flex cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 text-secondary select-none",
          {
            "bg-layer-transparent-hover": active,
          },
          className
        )
      }
    >
      {({ selected }) => (
        <div className="flex w-full items-center justify-between gap-2">
          {children}
          {selected && <TickOutline className="h-3.5 w-3.5 flex-shrink-0" />}
        </div>
      )}
    </Combobox.Option>
  );
}

CustomSelect.Option = Option;

export { CustomSelect };
