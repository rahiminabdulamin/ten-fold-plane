/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import logo from "@/app/assets/branding/tenfold-logo-square-rebrand-loader-v3.png?url";

export function LogoSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="animate-shimmer rounded-lg">
        <img src={logo} alt="Ten-Fold" className="h-[66px] w-auto object-contain sm:h-[132px]" />
      </div>
      <p className="animate-shimmer text-sm text-[#BFBFBF]">Please wait...</p>
    </div>
  );
}
