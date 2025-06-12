import type { ColorRGBA } from "@/util/color";
import { parseCssColorOrThrow } from "@/util/color";
import type { IsExhaustedRest } from "@/util/types";
import { invariant } from "@haohaohow/lib/invariant";
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

const varNames = [`foreground`, `background`];

function applyThemeFromDom(dom: HTMLElement, viewModel: ViewModelInstance) {
  const style = getComputedStyle(dom);

  for (const varName of varNames) {
    const color = parseCssColorOrThrow(
      style.getPropertyValue(`--color-${varName}`),
    );
    applyColorToViewModel(viewModel, varName, color);
  }
}
