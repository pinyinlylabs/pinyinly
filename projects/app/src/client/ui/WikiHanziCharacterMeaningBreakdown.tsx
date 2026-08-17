import { useState } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { HanziCharacter, MnemonicHanziComponent } from "@/data/model";
import { HanziStrokesTile } from "./HanziStrokesTile";
import { hanziSvgPathsQuery } from "@/client/query";
import { useQuery } from "@tanstack/react-query";
import { parseStrokeSpec } from "@/util/strokeSpec";
import { HanziGraphic } from "./HanziGraphic";

interface WikiHanziCharacterMeaningBreakdownProps {
  hanzi: HanziCharacter;
  primaryMeaningGloss: string | null;
  hanziComponents: MnemonicHanziComponent[] | undefined;
  glossByHanzi: ReadonlyMap<string, string>;
}

function hasStrokeRanges(
  components: readonly MnemonicHanziComponent[],
): boolean {
  return components.some(
    (component) =>
      component.strokeSpec != null &&
      parseStrokeSpec(component.strokeSpec).length > 0,
  );
}

export function WikiHanziCharacterMeaningBreakdown({
  hanzi,
  primaryMeaningGloss,
  hanziComponents,
  glossByHanzi,
}: WikiHanziCharacterMeaningBreakdownProps) {
  const [sourceCenterX, setSourceCenterX] = useState<number | null>(null);
  const [componentCenterXs, setComponentCenterXs] = useState<readonly number[]>(
    [],
  );
  const [componentWrapperXs, setComponentWrapperXs] = useState<
    readonly number[]
  >([]);

  const { data: hanziSvgPathsData } = useQuery(hanziSvgPathsQuery(hanzi));

  const strokeSvgs = hanziSvgPathsData?.strokes;

  const showStrokeHighlights =
    hanziComponents != null &&
    hasStrokeRanges(hanziComponents) &&
    strokeSvgs != null;

  const componentsElements: { key: string; element: ReactNode }[] = [];

  if (showStrokeHighlights) {
    for (const [i, component] of hanziComponents.entries()) {
      const componentIndex = componentsElements.length;
      const label =
        component.label ??
        (component.hanzi == null
          ? null
          : (glossByHanzi.get(component.hanzi) ?? null));
      componentsElements.push({
        key: `component:${i}`,
        element: (
          <HanziStrokesTile
            componentHanzi={component.hanzi ?? null}
            hanzi={hanzi}
            componentColor={component.color}
            componentStrokeSpec={component.strokeSpec}
            label={label}
            onVisualLayout={(event) => {
              const centerX =
                event.nativeEvent.layout.x + event.nativeEvent.layout.width / 2;
              setComponentCenterXs((prev) => {
                const next = [...prev];
                next[componentIndex] = centerX;
                return next;
              });
            }}
          />
        ),
      });
    }
  } else if (hanziComponents != null) {
    for (const [i, component] of hanziComponents.entries()) {
      if (component.hanzi == null) {
        continue;
      }

      const componentIndex = componentsElements.length;
      const componentHanzi = component.hanzi;
      const label = glossByHanzi.get(componentHanzi) ?? null;

      componentsElements.push({
        key: `component:${i}:${componentHanzi}`,
        element: (
          <HanziStrokesTile
            componentHanzi={componentHanzi}
            hanzi={null}
            componentStrokeSpec={component.strokeSpec}
            label={label}
            onVisualLayout={(event) => {
              const centerX =
                event.nativeEvent.layout.x + event.nativeEvent.layout.width / 2;
              setComponentCenterXs((prev) => {
                const next = [...prev];
                next[componentIndex] = centerX;
                return next;
              });
            }}
          />
        ),
      });
    }
  }

  if (componentsElements.length === 0) {
    if (strokeSvgs == null) {
      return null;
    }

    return (
      <>
        <Text className="pyly-body">
          What does <Text className="pyly-bold">{hanzi}</Text> resemble?
        </Text>

        <View className="flex-1 items-center">
          <HanziGraphic className="size-12" fgSvgPaths={strokeSvgs} />
        </View>
      </>
    );
  }

  const visibleComponentCenters = componentsElements.map((_, index) => {
    const localCenter = componentCenterXs[index];
    const wrapperX = componentWrapperXs[index];
    return localCenter == null || wrapperX == null
      ? Number.NaN
      : localCenter + wrapperX;
  });
  const validComponentCenters = visibleComponentCenters.filter((item) =>
    Number.isFinite(item),
  );
  const hasConnector =
    componentsElements.length > 1 &&
    (strokeSvgs == null ? sourceCenterX != null : true) &&
    validComponentCenters.length === componentsElements.length;
  const sourceConnectorX = strokeSvgs == null ? sourceCenterX : 24;
  const allCenters =
    sourceConnectorX == null
      ? validComponentCenters
      : [sourceConnectorX, ...validComponentCenters];
  const connectorMinX = allCenters.length === 0 ? 0 : Math.min(...allCenters);
  const connectorMaxX = allCenters.length === 0 ? 0 : Math.max(...allCenters);

  return (
    <View className="gap-3">
      <View className="px-6">
        <View className="gap-1 self-start">
          {strokeSvgs == null ? (
            <View
              onLayout={({ nativeEvent }) => {
                const centerX =
                  nativeEvent.layout.x + nativeEvent.layout.width / 2;
                setSourceCenterX(centerX);
              }}
            >
              <Text className="pyly-body text-left text-lg">{hanzi}</Text>
            </View>
          ) : (
            <View className="w-12">
              <HanziGraphic className="size-12" fgSvgPaths={strokeSvgs} />
            </View>
          )}

          {primaryMeaningGloss == null ? null : (
            <Text className="text-left pyly-body-caption text-muted-fg">
              {primaryMeaningGloss}
            </Text>
          )}
        </View>
      </View>

      {hasConnector ? (
        <View className="px-6">
          <View className="relative h-6">
            <View
              className="absolute w-px bg-muted-fg/35"
              style={{ left: sourceConnectorX, top: 0, height: 10 }}
            />
            <View
              className="absolute h-px bg-muted-fg/35"
              style={{
                left: connectorMinX,
                top: 10,
                width: Math.max(1, connectorMaxX - connectorMinX),
              }}
            />
            {validComponentCenters.map((centerX, index) => {
              return (
                <View
                  className="absolute w-px bg-muted-fg/35"
                  key={`decomp-line:${index}`}
                  style={{ left: centerX, top: 10, height: 14 }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      <View className="px-6">
        <View className="flex-row flex-wrap gap-5">
          {componentsElements.map((component, index) => {
            return (
              <View
                key={component.key}
                onLayout={({ nativeEvent }) => {
                  const wrapperX = nativeEvent.layout.x;
                  setComponentWrapperXs((prev) => {
                    const next = [...prev];
                    next[index] = wrapperX;
                    return next;
                  });
                }}
              >
                {component.element}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
