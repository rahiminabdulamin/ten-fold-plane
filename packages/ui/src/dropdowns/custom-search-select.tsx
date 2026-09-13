/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Combobox, Portal } from "@headlessui/react";
import { ChevronDownOutline, InfoOutline, SearchOutline, TickOutline } from "@makeplane/propel/icons";
import React, { useEffect, useRef, useState } from "react";
import { usePopper } from "react-popper";
// plane imports
// local imports
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "../utils";
import type { ICustomSearchSelectProps } from "./helper";

function OpenStateHandler({
  open,
  onOpen,
  onClose,
}: Pick<ICustomSearchSelectProps, "onOpen" | "onClose"> & { open: boolean }) {
  const previousOpen = useRef(open);

  useEffect(() => {
    if (open === previousOpen.current) return;
    (open ? onOpen : onClose)?.();
    previousOpen.current = open;
  }, [onClose, onOpen, open]);

  return null;
}

export function CustomSearchSelect(props: ICustomSearchSelectProps) {
  const {
    customButtonClassName = "",
    buttonClassName = "",
    className = "",
    chevronClassName = "",
    customButton,
    placement,
    portal = true,
    disabled = false,
    footerOption,
    input = false,
    label,
    maxHeight = "md",
    multiple = false,
    noChevron = false,
    onChange,
    options,
    onOpen,
    onClose,
    optionsClassName = "",
    value,
    tabIndex,
    noResultsMessage = "No matches found",
    defaultOpen = false,
  } = props;
  const [query, setQuery] = useState("");

  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);
  const defaultOpened = useRef(false);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "bottom-start",
    strategy: "fixed",
  });

  useEffect(() => {
    if (defaultOpen && referenceElement && !defaultOpened.current) {
      defaultOpened.current = true;
      referenceElement.click();
    }
  }, [defaultOpen, referenceElement]);

  const filteredOptions =
    query === "" ? options : options?.filter((option) => option.query.toLowerCase().includes(query.toLowerCase()));

  const comboboxProps: any = {
    value,
    onChange,
    disabled,
  };

  if (multiple) comboboxProps.multiple = true;

  return (
    // oxlint-disable-next-line jsx_a11y/no-static-element-interactions
    <Combobox
      as="div"
      tabIndex={tabIndex}
      className={cn("relative flex-shrink-0 text-left", className)}
      {...comboboxProps}
    >
      {({ open }: { open: boolean }) => {
        return (
          <>
            <OpenStateHandler open={open} onOpen={onOpen} onClose={onClose} />
            {customButton ? (
              <Combobox.Button
                ref={setReferenceElement}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-1 text-11",
                  {
                    "cursor-not-allowed text-secondary": disabled,
                    "cursor-pointer hover:bg-layer-transparent-hover": !disabled,
                  },
                  customButtonClassName
                )}
              >
                {customButton}
              </Combobox.Button>
            ) : (
              <Combobox.Button
                ref={setReferenceElement}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong",
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
                {!noChevron && !disabled && (
                  <ChevronDownOutline className={cn("h-3 w-3 flex-shrink-0", chevronClassName)} aria-hidden="true" />
                )}
              </Combobox.Button>
            )}
            {open &&
              (portal ? (
                <Portal>
                  <Combobox.Options
                    as="ul"
                    data-prevent-outside-click
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                    className={cn(
                      "pointer-events-auto z-[9999] my-1 min-w-48 overflow-y-scroll rounded-md border-[0.5px] border-subtle-1 bg-surface-1 py-2.5 text-11 whitespace-nowrap focus:outline-none",
                      optionsClassName
                    )}
                  >
                    <div>
                      <div className="mx-2 flex items-center gap-1.5 rounded-sm border border-subtle px-2">
                        <SearchOutline className="h-3.5 w-3.5 text-placeholder" />
                        <Combobox.Input
                          className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onMouseDown={(event) => event.stopPropagation()}
                          placeholder="Search"
                          displayValue={(assigned: any) => assigned?.name}
                        />
                      </div>
                      <div
                        role="presentation"
                        className={cn("vertical-scrollbar mt-2 scrollbar-xs space-y-1 overflow-y-scroll px-2", {
                          "max-h-96": maxHeight === "2xl",
                          "max-h-80": maxHeight === "xl",
                          "max-h-60": maxHeight === "lg",
                          "max-h-48": maxHeight === "md",
                          "max-h-36": maxHeight === "rg",
                          "max-h-28": maxHeight === "sm",
                        })}
                        onMouseDown={(event) => event.stopPropagation()}
                        onWheel={(event) => event.stopPropagation()}
                      >
                        {filteredOptions ? (
                          filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                              // oxlint-disable-next-line jsx_a11y/click-events-have-key-events
                              <Combobox.Option
                                as="li"
                                key={option.value}
                                value={option.value}
                                className={({ active }) =>
                                  cn(
                                    "flex w-full cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 select-none",
                                    {
                                      "bg-layer-transparent-hover": active,
                                      "cursor-not-allowed text-placeholder opacity-60": option.disabled,
                                    }
                                  )
                                }
                                disabled={option.disabled}
                              >
                                {({ selected }) => (
                                  <>
                                    <span className="flex-grow truncate">{option.content}</span>
                                    {selected && <TickOutline className="h-3.5 w-3.5 flex-shrink-0" />}
                                    {option.tooltip && (
                                      <>
                                        {typeof option.tooltip === "string" ? (
                                          <Tooltip tooltipContent={option.tooltip}>
                                            <InfoOutline className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer text-secondary" />
                                          </Tooltip>
                                        ) : (
                                          option.tooltip
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </Combobox.Option>
                            ))
                          ) : (
                            <p className="px-1.5 py-1 text-placeholder italic">{noResultsMessage}</p>
                          )
                        ) : (
                          <p className="px-1.5 py-1 text-placeholder italic">Loading...</p>
                        )}
                      </div>
                      {footerOption}
                    </div>
                  </Combobox.Options>
                </Portal>
              ) : (
                <Combobox.Options
                  as="ul"
                  data-prevent-outside-click
                  ref={setPopperElement}
                  style={styles.popper}
                  {...attributes.popper}
                  className={cn(
                    "pointer-events-auto z-[9999] my-1 min-w-48 overflow-y-scroll rounded-md border-[0.5px] border-subtle-1 bg-surface-1 py-2.5 text-11 whitespace-nowrap focus:outline-none",
                    optionsClassName
                  )}
                >
                  <div>
                    <div className="mx-2 flex items-center gap-1.5 rounded-sm border border-subtle px-2">
                      <SearchOutline className="h-3.5 w-3.5 text-placeholder" />
                      <Combobox.Input
                        className="w-full bg-transparent py-1 text-11 text-secondary placeholder:text-placeholder focus:outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onMouseDown={(event) => event.stopPropagation()}
                        placeholder="Search"
                        displayValue={(assigned: any) => assigned?.name}
                      />
                    </div>
                    <div
                      role="presentation"
                      className={cn("vertical-scrollbar mt-2 scrollbar-xs space-y-1 overflow-y-scroll px-2", {
                        "max-h-96": maxHeight === "2xl",
                        "max-h-80": maxHeight === "xl",
                        "max-h-60": maxHeight === "lg",
                        "max-h-48": maxHeight === "md",
                        "max-h-36": maxHeight === "rg",
                        "max-h-28": maxHeight === "sm",
                      })}
                      onMouseDown={(event) => event.stopPropagation()}
                      onWheel={(event) => event.stopPropagation()}
                    >
                      {filteredOptions ? (
                        filteredOptions.length > 0 ? (
                          filteredOptions.map((option) => (
                            <Combobox.Option
                              as="li"
                              key={option.value}
                              value={option.value}
                              className={({ active }) =>
                                cn(
                                  "flex w-full cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 select-none",
                                  {
                                    "bg-layer-transparent-hover": active,
                                    "cursor-not-allowed text-placeholder opacity-60": option.disabled,
                                  }
                                )
                              }
                              disabled={option.disabled}
                            >
                              {({ selected }) => (
                                <>
                                  <span className="flex-grow truncate">{option.content}</span>
                                  {selected && <TickOutline className="h-3.5 w-3.5 flex-shrink-0" />}
                                  {option.tooltip &&
                                    (typeof option.tooltip === "string" ? (
                                      <Tooltip tooltipContent={option.tooltip}>
                                        <InfoOutline className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer text-secondary" />
                                      </Tooltip>
                                    ) : (
                                      option.tooltip
                                    ))}
                                </>
                              )}
                            </Combobox.Option>
                          ))
                        ) : (
                          <p className="px-1.5 py-1 text-placeholder italic">{noResultsMessage}</p>
                        )
                      ) : (
                        <p className="px-1.5 py-1 text-placeholder italic">Loading...</p>
                      )}
                    </div>
                    {footerOption}
                  </div>
                </Combobox.Options>
              ))}
          </>
        );
      }}
    </Combobox>
  );
}
