import type { ColorRGBA } from "@/util/color";
import { parseCssColorOrThrow, parseRiveColorPropertyName } from "@/util/color";
import { invariant } from "@pinyinly/lib/invariant";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import type { ViewModel } from "@rive-app/canvas";
import type { ViewModelInstance } from "@rive-app/react-canvas";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import { Asset } from "expo-asset";
import { useEffect, useRef, useState } from "react";
import { useCSSVariable } from "uniwind";
import type { RiveFit, RiveProps } from "./riveTypes";

export function Rive({
  artboardName,
  assets,
  autoplay = true,
  fit,
  onRiveLoad,
  src,
  stateMachineName,
  ...rest
}: RiveProps) {
  true satisfies IsExhaustedRest<typeof rest>;
  invariant(typeof src === `string`, `src must be a string`);

  const [themeVariableNames, setThemeVariableNames] = useState<string[]>([]);
  const themeViewModelRef = useRef<ViewModelInstance | null>(null);
  const themeVariableValues = useCSSVariable(themeVariableNames);

  useEffect(() => {
    if (themeViewModelRef.current != null) {
      applyThemeFromUniwind(
        themeViewModelRef.current,
        themeVariableNames,
        themeVariableValues,
      );
    }
  }, [themeVariableNames, themeVariableValues]);

  const { RiveComponent } = useRive({
    artboard: artboardName,
    src,
    autoplay,
    autoBind: true,
    stateMachines: stateMachineName,
    layout: fit == null ? undefined : new Layout({ fit: fitMap[fit] }),
    assetLoader(asset) {
      const expoAsset = assets?.[asset.name];

      invariant(
        expoAsset != null,
        `Rive file requested asset ${asset.name}, but it wasn't provided.`,
      );

      invariant(
        typeof expoAsset !== `number`,
        `Received wrong Expo asset format (number)`,
      );

      void fetch(Asset.fromModule(expoAsset).uri)
        .then(async (res) => res.arrayBuffer())
        .then((arr) => new Uint8Array(arr))
        .then((image) => {
          asset.decode(image);
        })
        .catch((error: unknown) => {
          console.error(`Failed to decode image`, error);
        });

      return true;
    },
    onRiveReady(rive) {
      // If there's a `theme` view model in the file, update it with the current
      // theme by reading CSS values from Uniwind.
      const themeVm = rive.viewModelInstance?.viewModel(`theme`);
      if (themeVm != null) {
        themeViewModelRef.current = themeVm;
        setThemeVariableNames(getThemeVariableNames(themeVm));
      }

      onRiveLoad?.(rive);
    },
  });

  return <RiveComponent />;
}

function applyColorToViewModel(
  viewModel: ViewModelInstance,
  colorName: string,
  color: ColorRGBA,
  alphaFactor: number,
) {
  const colorVm = viewModel.color(colorName);
  if (colorVm != null) {
    colorVm.rgba(
      color.red,
      color.green,
      color.blue,
      Math.round(color.alpha * alphaFactor * 255),
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

function getThemeVariableNames(themeViewModel: ViewModelInstance) {
  return [
    ...new Set(
      themeViewModel.properties.flatMap((property) => {
        if (property.type !== PropertyType.Color) {
          return [];
        }
        const { name } = parseRiveColorPropertyName(property.name);
        return [`--color-${name}`];
      }),
    ),
  ];
}

function applyThemeFromUniwind(
  themeViewModel: ViewModelInstance,
  variableNames: string[],
  variableValues: Array<string | number | undefined>,
) {
  const variables = new Map(
    variableNames.map((name, index) => [name, variableValues[index]]),
  );

  for (const property of themeViewModel.properties) {
    if (property.type === PropertyType.Color) {
      const { name, alpha } = parseRiveColorPropertyName(property.name);
      const cssPropertyName = `--color-${name}`;
      const cssPropertyValue = variables.get(cssPropertyName);
      if (typeof cssPropertyValue !== `string`) {
        console.error(
          new Error(
            `Expected CSS color "${cssPropertyName}" for Rive theme property "${property.name}"`,
          ),
          cssPropertyValue,
        );
        continue;
      }
      try {
        const color = parseCssColorOrThrow(cssPropertyValue);
        applyColorToViewModel(themeViewModel, property.name, color, alpha);
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
