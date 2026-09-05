/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { AuthRoot } from "@/components/account/auth-forms/auth-root";
import type { EAuthModes } from "@/helpers/authentication.helper";
import { AuthFooter } from "./footer";
import { AuthHeader } from "./header";

type AuthBaseProps = {
  authType: EAuthModes;
};

export function AuthBase({ authType }: AuthBaseProps) {
  return (
    <div className="min-h-dvh bg-surface-1 lg:grid lg:grid-cols-2">
      <aside className="hidden bg-[#0A4968] bg-[radial-gradient(circle_at_top_right,rgba(79,190,226,0.24),transparent_42%)] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <img
          src="/branding/tenfold-logo-long-rebrand-white.png"
          alt="Ten-Fold"
          className="h-16 w-auto self-start xl:h-20"
        />
        <div className="max-w-lg border-l border-white/25 pl-6 xl:pl-8">
          <p className="text-body-sm-semibold tracking-[0.18em] text-white/65 uppercase">Work, in focus</p>
          <h1 className="text-5xl xl:text-6xl mt-5 leading-[1.04] font-semibold tracking-tight">
            See every dimension of your work.
          </h1>
          <p className="text-lg mt-6 max-w-md leading-8 text-white/75">
            A focused place for teams to plan, build, and move work forward.
          </p>
        </div>
        <p className="max-w-xs text-body-sm-regular leading-6 text-white/60">
          Made for teams that think beyond the next task.
        </p>
      </aside>
      <main className="flex min-h-dvh flex-col overflow-y-auto px-6 py-6 sm:px-10 sm:py-8 lg:px-12 xl:px-20">
        <AuthHeader type={authType} hideLogoOnDesktop />
        <AuthRoot authMode={authType} />
        <div className="mt-8 lg:hidden">
          <AuthFooter />
        </div>
      </main>
    </div>
  );
}
