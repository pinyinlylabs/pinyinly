import { ExampleStack } from "@/client/ui/demo/components";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { HanziWordTile } from "./HanziWordTile";

export default () => (
  <View className="gap-4">
    {([`outline`, `filled`] as const).map((variant) => (
      <Fragment key={variant}>
        <Text className="pyly-dev-dt">variant={variant}</Text>
        <View className="flex-row gap-2">
          <ExampleStack title="character" childrenClassName="gap-2">
            <HanziWordTile hanziWord={`好:good`} variant={variant} />
            <HanziWordTile hanziWord={`下:descend`} variant={variant} />
            <HanziWordTile hanziWord={`为:for`} variant={variant} />
            <HanziWordTile hanziWord={`乚:hidden`} variant={variant} />
          </ExampleStack>
          <ExampleStack title="word" childrenClassName="gap-2">
            <HanziWordTile hanziWord={`你好:hello`} variant={variant} />
            <HanziWordTile
              hanziWord={`前天:dayBeforeYesterday`}
              variant={variant}
            />
            <HanziWordTile hanziWord={`别的:other`} variant={variant} />
          </ExampleStack>
        </View>
      </Fragment>
    ))}
  </View>
);
