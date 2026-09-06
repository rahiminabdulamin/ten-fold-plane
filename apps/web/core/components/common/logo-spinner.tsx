/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function LogoSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-shimmer rounded-lg">
        <img
          src="/branding/tenfold-logo-square-rebrand-loader-v3.png"
          alt="Ten-Fold"
          className="h-[66px] w-auto object-contain sm:h-[132px]"
        />
      </div>
    </div>
  );
}
