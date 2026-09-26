/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import tenfoldClipart from "@/app/assets/clipart/tenfold-clipart-002a.png?url";

export function LogoSpinner() {
  return (
    <div className="animate-shimmer flex flex-col items-center justify-center gap-8">
      <div className="rounded-lg">
        <img src={tenfoldClipart} alt="" className="w-56 opacity-30 sm:w-72" />
      </div>
      <p className="text-base font-bold text-[#BFBFBF]">Getting you there, hang on...</p>
    </div>
  );
}
