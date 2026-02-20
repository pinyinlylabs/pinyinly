/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import { createPortal } from "react-dom";
import type { PropsWithChildren } from "react";
import { useLayoutEffect } from "react";

export function Portal({ children }: PropsWithChildren) {
  const element = document.createElement(`div`);

  useLayoutEffect(() => {
    if (!element.parentElement) {
      document.body.append(element);
    }
    return () => {
      if (element?.parentElement) {
        element.remove();
      }
    };
  }, [element]);

  return createPortal(children, element);
}
