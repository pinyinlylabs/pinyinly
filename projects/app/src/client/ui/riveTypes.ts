import type { IsEqual } from "@/util/types";
import type { Rive, UseRiveParameters } from "@rive-app/react-canvas";
import type RnRive from "rive-react-native";
import type { PropsOf } from "./types";

type WebRiveProps = NonNullable<UseRiveParameters>;
type RnRiveProps = PropsOf<typeof RnRive>;

type CommonPropNames = `autoplay`;
type WebRiveCommonProps = Pick<WebRiveProps, CommonPropNames>;
type RnRiveCommonProps = Pick<RnRiveProps, CommonPropNames>;

// Type check to make sure the props are truly common to both implementations.
true satisfies IsEqual<WebRiveCommonProps, RnRiveCommonProps>;

type CommonProps = WebRiveCommonProps;

export type RiveFit =
  | `cover`
  | `contain`
  | `fill`
  | `fitWidth`
  | `fitHeight`
  | `none`
  | `scaleDown`
  | `layout`;

export interface RiveProps extends CommonProps {
  artboardName?: string;
  /**
   * Mapping of Rive asset name to Expo asset (via `require(…)`), for Rive's
   * "referenced" assets.
   */
  assets?: Record<string, RnRequireSource>;
  fit?: RiveFit;
  onRiveLoad?: (rive: RiveInstance) => void;
  src: RnRequireSource;
  stateMachineName: string | undefined;
}

export type RiveInstance = Rive;
