import type { ColorRGBA } from "@/util/color";
import { parseCssColorOrThrow } from "@/util/color";
import type { IsExhaustedRest } from "@/util/types";
import { invariant } from "@haohaohow/lib/invariant";
import type { ViewModel } from "@rive-app/canvas";
import type { ViewModelInstance } from "@rive-app/react-canvas";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import { useLayoutEffect } from "react";
import type { RiveFit, RiveProps } from "./riveTypes";

export function Rive({
  artboardName,
  autoplay = true,
  fit,
  onRiveLoad,
  src,
  stateMachineName,
  ...rest
}: RiveProps) {
  true satisfies IsExhaustedRest<typeof rest>;
  invariant(typeof src === `string`, `src must be a string`);

  const { rive, RiveComponent, container } = useRive({
    artboard: artboardName,
    src,
    autoplay,
    autoBind: true,
    stateMachines: stateMachineName,
    layout: fit == null ? undefined : new Layout({ fit: fitMap[fit] }),
  });

  useLayoutEffect(() => {
    if (rive != null && container != null) {
      // If there's a `theme` view model in the file, update it with the current
      // theme by reading CSS values.
      const themeVm = rive.viewModelInstance?.viewModel(`theme`);
      if (themeVm != null) {
        applyThemeFromDom(container, themeVm);
      }
    }
  }, [rive, container]);

  useLayoutEffect(() => {
    if (rive != null) {
      onRiveLoad?.(rive);
    }
  }, [rive, onRiveLoad]);

  return <RiveComponent />;
}

function applyColorToViewModel(
  viewModel: ViewModelInstance,
  colorName: string,
  color: ColorRGBA,
) {
  const colorVm = viewModel.color(colorName);
  if (colorVm != null) {
    colorVm.rgba(
      color.red,
      color.green,
      color.blue,
      Math.round(color.alpha * 255),
    );
  }
}

const fitMap: Record<RiveFit, Fit> = {
  contain: Fit.Contain,
  cover: Fit.Cover,
  fill: Fit.Fill,
  fitHeight: Fit.FitHeight,
  fitWidth: Fit.FitWidth,
  layout: Fit.Layout,
  none: Fit.None,
  scaleDown: Fit.ScaleDown,
};

function applyThemeFromDom(
  dom: HTMLElement,
  themeViewModel: ViewModelInstance,
) {
  const style = getComputedStyle(dom);

  // Look at all the color properties in the theme view model and pass through
  // the value from the DOM.
  for (const property of themeViewModel.properties) {
    if (property.type === PropertyType.Color) {
      const cssPropertyName = `--color-${property.name}`;
      const cssPropertyValue = style.getPropertyValue(cssPropertyName);
      try {
        const color = parseCssColorOrThrow(cssPropertyValue);
        applyColorToViewModel(themeViewModel, property.name, color);
      } catch (error) {
        console.error(
          `Failed to parse CSS color "${cssPropertyValue}" from "${cssPropertyName}" for Rive theme property "${property.name}"`,
          error,
        );
      }
    }
  }
}

// Hacky type-safe translation for ViewModel property types.
type DataType = (typeof ViewModel.prototype.properties)[0][`type`];
const PropertyType = {
  Number: `number` as unknown as DataType,
  String: `string` as unknown as DataType,
  Boolean: `boolean` as unknown as DataType,
  Color: `color` as unknown as DataType,
  Trigger: `trigger` as unknown as DataType,
  Enum: `enum` as unknown as DataType,
  List: `list` as unknown as DataType,
  Image: `image` as unknown as DataType,
};
