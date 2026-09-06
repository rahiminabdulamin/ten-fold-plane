/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { MoreVerticalOutline } from "@makeplane/propel/icons";
import { AuthRoot } from "@/components/account/auth-forms/auth-root";
import type { EAuthModes } from "@/helpers/authentication.helper";
import { AuthHeader } from "./header";

type AuthBaseProps = {
  authType: EAuthModes;
};

export function AuthBase({ authType }: AuthBaseProps) {
  return (
    <div className="min-h-dvh bg-surface-1 lg:grid lg:grid-cols-2">
      <aside
        className="hidden p-12 text-white lg:flex lg:flex-col lg:justify-between lg:pb-6 xl:p-16 xl:pb-6"
        style={{ background: "radial-gradient(circle at 100% 0%, #176d88 0%, #003f56 52%, #00364c 100%)" }}
      >
        <img
          src="/branding/tenfold-logo-long-rebrand-white-v3.png"
          alt="Ten-Fold"
          className="h-16 w-auto self-start xl:h-20"
        />
        <div className="max-w-lg -translate-y-8 border-l border-white/25 pl-6 xl:pl-8">
          <h1 className="leading-[0.95] tracking-tight uppercase" style={{ fontSize: "46px", fontWeight: 900 }}>
            Work on all
            <br />
            dimensions
          </h1>
          <p className="text-lg mt-10 max-w-md leading-7 text-white/90">
            A focused place for teams to plan, build, and move work forward. Made for teams that think beyond the next
            task.
          </p>
        </div>
        <p className="text-13 text-white/80">Copyright © 2026 Kognitif AI Enterprise. All rights reserved.</p>
      </aside>
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-6 sm:px-10 sm:py-8 lg:px-12 xl:px-20">
        <details className="group absolute top-6 right-6 z-10 sm:top-8 sm:right-10">
          <summary
            aria-label="Support options"
            className="grid size-9 cursor-pointer place-items-center rounded-md text-tertiary transition-colors hover:bg-layer-1 hover:text-primary"
            style={{ listStyle: "none" }}
          >
            <MoreVerticalOutline className="size-5" />
          </summary>
          <div className="shadow-lg absolute right-0 mt-1 w-56 rounded-md border border-subtle bg-surface-1 p-1">
            <a
              href="https://kognitif.ai"
              target="_blank"
              rel="noreferrer"
              className="block rounded px-3 py-2 text-body-sm-regular text-secondary hover:bg-layer-1"
            >
              Visit Kognitif AI website
            </a>
            <a
              href="mailto:contact@kognitif.ai"
              className="block rounded px-3 py-2 text-body-sm-regular text-secondary hover:bg-layer-1"
            >
              Request technical support
            </a>
          </div>
        </details>
        <div className="absolute top-6 left-6 z-10 sm:top-8 sm:left-10">
          <AuthHeader type={authType} hideLogoOnDesktop hideAdditionalAction />
        </div>
        <div className="w-full max-w-xs">
          <AuthRoot authMode={authType} />
        </div>
      </main>
    </div>
  );
}
