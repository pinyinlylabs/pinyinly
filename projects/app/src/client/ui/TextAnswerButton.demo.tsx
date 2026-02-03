import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/helpers";
import type { TextAnswerButtonState } from "@/client/ui/TextAnswerButton";
import { TextAnswerButton } from "@/client/ui/TextAnswerButton";
import type { PropsOf } from "@pinyinly/lib/types";
import shuffle from "lodash/shuffle";
import { useState } from "react";
import { View } from "react-native";

const noopWikiModal = () => null;

export default () => (
  <View className="flex-1">
    <View className="flex-row flex-wrap">
      <ExampleStack title="state" childrenClassName="gap-1">
        <TextAnswerButton state="default" text="default" />
        <TextAnswerButton state="error" text="error" />
        <TextAnswerButton state="selected" text="selected" />
        <TextAnswerButton state="success" text="success" />
      </ExampleStack>

      <ExampleStack title="state + renderWikiModal" childrenClassName="gap-1">
        <TextAnswerButton
          state="default"
          text="default"
          renderWikiModal={noopWikiModal}
        />
        <TextAnswerButton
          state="dimmed"
          text="dimmed"
          renderWikiModal={noopWikiModal}
        />
        <TextAnswerButton
          state="selected"
          text="selected"
          renderWikiModal={noopWikiModal}
        />
        <TextAnswerButton
          state="success"
          text="success"
          renderWikiModal={noopWikiModal}
        />
        <TextAnswerButton
          state="error"
          text="error"
          renderWikiModal={noopWikiModal}
        />
        <TextAnswerButton
          state="warning"
          text="warning"
          renderWikiModal={noopWikiModal}
        />
      </ExampleStack>

      <ExampleStack title="disabled" childrenClassName="gap-1">
        <TextAnswerButton disabled text="Disabled" />
      </ExampleStack>

      <ExampleStack title="synced" childrenClassName="gap-1">
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack title="text overflow" childrenClassName="flex-row">
        <ExampleStack title="tall" showFrame>
          <View className="h-[400px] w-[120px]">
            <TextAnswerButton
              className="flex-1"
              text="xs xs xs xs xs xs xs xs xs xs xs xs xs xs xs xs"
            />
            <TextAnswerButton
              className="flex-1"
              fontSize="sm"
              disabled
              text="sm sm sm sm sm sm sm sm sm sm sm sm sm sm sm sm"
            />
            <TextAnswerButton
              className="flex-1"
              fontSize="lg"
              disabled
              text="lg lg lg lg lg lg lg lg lg lg lg lg lg lg lg lg"
            />
            <TextAnswerButton
              className="flex-1"
              fontSize="xl"
              disabled
              text="xl xl xl xl xl xl xl xl xl xl xl xl xl xl xl xl"
            />
          </View>
        </ExampleStack>

        <ExampleStack title="short" showFrame>
          <View className="h-[250px] w-[120px]">
            <TextAnswerButton
              className="flex-1"
              text="xs xs xs xs xs xs xs xs xs xs xs xs xs xs xs xs"
            />
            <TextAnswerButton
              className="flex-1"
              fontSize="sm"
              disabled
              text="sm sm sm sm sm sm sm sm sm sm sm sm sm sm sm sm"
            />
            <TextAnswerButton
              className="flex-1"
              fontSize="lg"
              disabled
              text="lg lg lg lg lg lg lg lg lg lg lg lg lg lg lg lg"
            />
            <TextAnswerButton
              className="flex-1"
              fontSize="xl"
              disabled
              text="xl xl xl xl xl xl xl xl xl xl xl xl xl xl xl xl"
            />
          </View>
        </ExampleStack>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
      title="flex-col"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="size-[120px] items-start gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="size-[120px] items-center gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="size-[120px] gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="size-[120px] items-end gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
      title="flex-col + flex-1"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="size-[120px] items-start gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="size-[120px] items-center gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="size-[120px] gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="size-[120px] items-end gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-start gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-center gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-end gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-start gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-center gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-end gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="errors with HanziLink" />

    <View className="flex-row flex-wrap">
      {([`xs`, `sm`, `lg`, `xl`] as const).map((fontSize) => (
        <ExampleStack
          key={fontSize}
          title={fontSize}
          showFrame
          childrenClassName="w-[200px] h-[200px] items-start gap-2"
        >
          <TextAnswerButton
            state="error"
            fontSize={fontSize}
            text="你好"
            renderWikiModal={() => null}
            className={`flex-1`}
          />
          <TextAnswerButton
            state="error"
            fontSize={fontSize}
            text="你好 你好 你好 你好 你好 你好 你好 你好 你好"
            renderWikiModal={() => null}
            className={`flex-1`}
          />
        </ExampleStack>
      ))}
    </View>

    <LittlePrimaryHeader title="Exotic glyphs" />

    <TextAnswerButton
      state="error"
      fontSize="lg"
      text="𫶧"
      renderWikiModal={() => null}
    />
  </View>
);

function SyncedAnswerButtonExample(
  props: Omit<PropsOf<typeof TextAnswerButton>, `text`>,
) {
  const [state, setState] = useState<TextAnswerButtonState>(`default`);
  return (
    <>
      <TextAnswerButton
        state={state}
        onPress={() => {
          setState(
            (prev) =>
              shuffle(
                (
                  [
                    `selected`,
                    `success`,
                    `error`,
                    `default`,
                    `dimmed`,
                  ] as TextAnswerButtonState[]
                ).filter((x) => x !== prev),
              )[0] ?? `default`,
          );
        }}
        {...props}
        text="Primary"
      />
      <TextAnswerButton state={state} {...props} text="Mirror" />
    </>
  );
}
