import RnRive from "rive-react-native";

import { invariant } from "@haohaohow/lib/invariant";
import { useEffect } from "react";
import type { RiveProps } from "./riveTypes";

export function Rive({ autoplay, src, artboardName }: RiveProps) {
  invariant(
    typeof src !== `string`,
    `rive-react-native does not support string source`,
  );

  useEffect(() => {
    throw new Error(`Rive component is not supported in this environment`);
  }, []);

  return (
    <RnRive autoplay={autoplay} artboardName={artboardName} source={src} />
  );
}
